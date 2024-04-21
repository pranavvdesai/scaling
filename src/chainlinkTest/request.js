// const fs = require("fs");
const path = require("path");
const Web3Modal = require("web3modal");
// import Web3Modal from "web3modal";

const {
    SubscriptionManager,
    simulateScript,
    ResponseListener,
    ReturnType,
    decodeResult,
    FulfillmentCode,
} = require("@chainlink/functions-toolkit");
const functionsConsumerAbi = require("./abi/functionsClient.json");
const ethers = require("ethers");

const consumerAddress = "0x8dFf78B7EE3128D00E90611FBeD20A71397064D9"; // REPLACE this with your Functions consumer address
const subscriptionId = 1143; // REPLACE this with your subscription ID
const web3Modal = new Web3Modal();


// hardcoded for Polygon Mumbai
const makeRequestMumbai = async () => {
    // hardcoded for Polygon Mumbai
    const routerAddress = "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C";
    const linkTokenAddress = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
    const donId = "fun-polygon-mumbai-1";
    const explorerUrl = "https://mumbai.polygonscan.com";

    // Initialize functions settings
    // const source = fs
    //     .readFileSync(path.resolve(__dirname, "source.js"))
    //     .toString();
    // console.log("source", source)

    const source = `
    // calculate geometric mean off-chain by a DON then return the result
    // valures provided in args array
    
    console.log("calculate geometric mean of: ", args);
    
    // make sure arguments are provided
    if (!args || args.length === 0) throw new Error("input not provided");
    
    const product = args.reduce((accumulator, currentValue) => {
        const numValue = parseInt(currentValue);
        if (isNaN(numValue)) throw Error(currentValue , "is not a number");
        return accumulator * numValue;
    }, 1); // calculate the product of numbers provided in args array
    
    const geometricMean = Math.pow(product, 1 / args.length); // geometric mean = length-root of (product)
    console.log("geometric mean is: ", geometricMean.toFixed(2));
    
    // Decimals are not handled in Solidity so multiply by 100 (for 2 decimals) and round to the nearest integer
    // Functions.encodeUint256: Return a buffer from uint256
    return Functions.encodeUint256(Math.round(geometricMean * 100));`

    const args = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    const gasLimit = 300000;

    // Initialize ethers signer and provider to interact with the contracts onchain
    const privateKey = process.env.PRIV_KEY; // fetch PRIVATE_KEY
    if (!privateKey)
        throw new Error(
            "private key not provided - check your environment variables"
        );

    const rpcUrl = "https://rpc-mumbai.maticvigil.com/" // || process.env.POLYGON_MUMBAI_RPC_URL; // fetch mumbai RPC URL
    console.log("rpcUrl", rpcUrl)
    // https://rpc-mumbai.maticvigil.com
    if (!rpcUrl)
        throw new Error(`rpcUrl not provided  - check your environment variables`);

    // console.log(ethers)


    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    console.log("provider", provider)

    const wallet = new ethers.Wallet(privateKey);
    const signer = wallet.connect(provider); // create ethers signer for signing transactions

    ///////// START SIMULATION ////////////

    console.log("Start simulation...");

    const response = await simulateScript({
        source: source,
        args: args,
        bytesArgs: [], // bytesArgs - arguments can be encoded off-chain to bytes.
        secrets: {}, // no secrets in this example
    });

    console.log("Simulation result", response);
    const errorString = response.errorString;
    if (errorString) {
        console.log(`❌ Error during simulation: `, errorString);
    } else {
        const returnType = ReturnType.uint256;
        const responseBytesHexstring = response.responseBytesHexstring;
        // if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
        const decodedResponse = decodeResult(
            response.responseBytesHexstring,
            returnType
        );
        console.log(`✅ Decoded response to ${returnType}: `, decodedResponse);
        // }
    }

    //////// ESTIMATE REQUEST COSTS ////////
    console.log("\nEstimate request costs...", signer);
    // Initialize and return SubscriptionManager
    const subscriptionManager = new SubscriptionManager({
        signer: signer,
        linkTokenAddress: linkTokenAddress,
        functionsRouterAddress: routerAddress,
    });

    await subscriptionManager.initialize();

    // estimate costs in Juels

    const gasPriceWei = await signer.getGasPrice(); // get gasPrice in wei

    const estimatedCostInJuels =
        await subscriptionManager.estimateFunctionsRequestCost({
            donId: donId, // ID of the DON to which the Functions request will be sent
            subscriptionId: subscriptionId, // Subscription ID
            callbackGasLimit: gasLimit, // Total gas used by the consumer contract's callback
            gasPriceWei: BigInt(gasPriceWei), // Gas price in gWei
        });

    console.log(
        `Fulfillment cost estimated to ${ethers.utils.formatEther(
            estimatedCostInJuels
        )} LINK`
    );

    //////// MAKE REQUEST ////////

    console.log("\nMake request...");

    const functionsConsumer = new ethers.Contract(
        consumerAddress,
        functionsConsumerAbi,
        signer
    );

    // Actual transaction call
    const transaction = await functionsConsumer.sendRequest(
        source, // source
        "0x", // user hosted secrets - encryptedSecretsUrls - empty in this example
        0, // don hosted secrets - slot ID - empty in this example
        0, // don hosted secrets - version - empty in this example
        args,
        [], // bytesArgs - arguments can be encoded off-chain to bytes.
        subscriptionId,
        gasLimit,
        ethers.utils.formatBytes32String(donId) // jobId is bytes32 representation of donId
    );

    // Log transaction details
    console.log(
        `\n✅ Functions request sent! Transaction hash ${transaction.hash}. Waiting for a response...`
    );

    console.log(
        `See your request in the explorer ${explorerUrl}/tx/${transaction.hash}`
    );

    const responseListener = new ResponseListener({
        provider: provider,
        functionsRouterAddress: routerAddress,
    }); // Instantiate a ResponseListener object to wait for fulfillment.
    (async () => {
        try {
            const response = await new Promise((resolve, reject) => {
                responseListener
                    .listenForResponseFromTransaction(transaction.hash)
                    .then((response) => {
                        resolve(response); // Resolves once the request has been fulfilled.
                    })
                    .catch((error) => {
                        reject(error); // Indicate that an error occurred while waiting for fulfillment.
                    });
            });

            const fulfillmentCode = response.fulfillmentCode;

            if (fulfillmentCode === FulfillmentCode.FULFILLED) {
                console.log(
                    `\n✅ Request ${response.requestId
                    } successfully fulfilled. Cost is ${ethers.utils.formatEther(
                        response.totalCostInJuels
                    )} LINK.Complete reponse: `,
                    response
                );
            } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
                console.log(
                    `\n⚠️ Request ${response.requestId
                    } fulfilled. However, the consumer contract callback failed. Cost is ${ethers.utils.formatEther(
                        response.totalCostInJuels
                    )} LINK.Complete reponse: `,
                    response
                );
            } else {
                console.log(
                    `\n❌ Request ${response.requestId
                    } not fulfilled. Code: ${fulfillmentCode}. Cost is ${ethers.utils.formatEther(
                        response.totalCostInJuels
                    )} LINK.Complete reponse: `,
                    response
                );
            }

            const errorString = response.errorString;
            if (errorString) {
                console.log(`\n❌ Error during the execution: `, errorString);
            } else {
                const responseBytesHexstring = response.responseBytesHexstring;
                if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
                    const decodedResponse = decodeResult(
                        response.responseBytesHexstring,
                        ReturnType.uint256
                    );
                    console.log(
                        `\n✅ Decoded response to ${ReturnType.uint256}: `,
                        decodedResponse
                    );
                }
            }
        } catch (error) {
            console.error("Error listening for response:", error);
        }
    })();
};

// export default makeRequestMumbai()
makeRequestMumbai()