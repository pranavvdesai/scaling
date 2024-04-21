const fs = require("fs");
const path = require("path");

const {
    SubscriptionManager,
    simulateScript,
    ResponseListener,
    ReturnType,
    decodeResult,
    FulfillmentCode,
    Location
} = require("@chainlink/functions-toolkit");
const functionsConsumerAbi = require("./abi/functionsClient.json");
const ethers = require("ethers");

const consumerAddress = "0xA16F4E891e1b2537cA25C51760C187C2b3e79a8E"; // REPLACE this with your Functions consumer address
const subscriptionId = 1833; // REPLACE this with your subscription ID

const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const donId = "fun-ethereum-sepolia-1";
const explorerUrl = "https://mumbai.polygonscan.com";


// hardcoded for Polygon Mumbai
export default async function handler(req, res) {
  const body = req.body;

  const source = body.source;
  const args = body.args;
  const gasLimit = 300000;

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIV_KEY; // fetch PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const rpcUrl =
    "https://eth-sepolia.g.alchemy.com/v2/CEF87mGhaWQ0JjkM7-zekgygM-ABZVdg"; // || process.env.POLYGON_MUMBAI_RPC_URL; // fetch mumbai RPC URL
  console.log("rpcUrl", rpcUrl);
  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  // console.log(ethers)

  // const network = { name: "maticmum", chainId: 80001 }
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider); // create ethers signer for signing transactions

  console.log("\nMaking request...");

  const functionsConsumer = new ethers.Contract(
    consumerAddress,
    functionsConsumerAbi,
    signer
  );

  // Actual transaction call
  const transaction = await functionsConsumer.sendRequest(
    source, // source
    Location.DONHosted,
    "0x", // don hosted secrets - slot ID - empty in this example
    args,
    [], // bytesArgs - arguments can be encoded off-chain to bytes.
    subscriptionId,
    gasLimit
    // ethers.utils.formatBytes32String(donId) // jobId is bytes32 representation of donId
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
          `\n✅ Request ${
            response.requestId
          } successfully fulfilled. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        );
      } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
        console.log(
          `\n⚠️ Request ${
            response.requestId
          } fulfilled. However, the consumer contract callback failed. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        );
      } else {
        console.log(
          `\n❌ Request ${
            response.requestId
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
          return res.status(200).json({
            message: "success",
            data: Number(decodedResponse),
          });
        }
      }

      return res.status(500).json({
        message: "error",
        data: "error in response",
      });
    } catch (error) {
      console.error("Error listening for response:", error);
      return res.status(500).json({
        message: "error",
        data: "error listening for response",
      });
    }
  })();
};
