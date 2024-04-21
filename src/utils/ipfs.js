import { create as ipfsClient } from "ipfs-http-client";
import lighthouse from "@lighthouse-web3/sdk";
const projectId = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID;
const projectSecret = process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET;
const auth =
  "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");
import axios from "axios";
const lightouseAPI = "82e0a9ee.4fa86c6e5d2a4d718afed410147736c4";

export const client = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  apiPath: "/api/v0",
  headers: {
    authorization: auth,
  },
});

export async function uploadToIPFS(Jdata) {
  const data = JSON.stringify(Jdata);
  const added = await client.add(data);
  console.log(added);

  const url = `https://unfold23.infura-ipfs.io/ipfs/${added.path}`;

  const uploadResponse = await lighthouse.uploadText(data, lightouseAPI);
  console.log(uploadResponse);
  // console.log("resp" , uploadResponse.data.Hash)

  // console.log("resp" , await retriveData(uploadResponse.data.Hash))
  const resp = await retriveData(uploadResponse.data.Hash);
  console.log(JSON.stringify(resp));
  // console.log("Res",JSON.stringify(retriveData(resp)))
  /* after file is uploaded to IPFS, return the URL to use it in the transaction */
  return uploadResponse.data.Hash;
}

export async function retriveData(cid) {
  const lighthouseDealDownloadEndpoint =
    "http://gateway.lighthouse.storage/ipfs/";
  let response = await axios({
    method: "GET",
    url: `${lighthouseDealDownloadEndpoint}${cid}`,
    responseType: "json",
  });
  console.log(response);
  return response;
}
