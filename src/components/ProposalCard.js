import React from 'react'
import Image from 'next/image'
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { contractAddress } from "../blockchain/config";
import JobPortal from '../blockchain/artifacts/contracts/JobPortal.sol/JobPortal.json'


export default function ProposalCard({ proposal, status, worker }) {
    async function acceptProposal() {
        console.log("inside function")
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const jobPortal = new ethers.Contract(contractAddress, JobPortal.abi, signer);
        const tx = await jobPortal.selectWorker(proposal.projectId, proposal.taskId, proposal.worker);
        await tx.wait();
        console.log("Proposal Accepted");
    }
    return (
        <div className="my-10 mx-8 roomcard border-2 border-slate-700 rounded-xl">
            <div className="rounded overflow-hidden h-full">
                <div className="px-6 py-4">
                    <div className="flex">
                        <h1 className="text-white mb-2 px-2 font-bold text-lg">
                            Motivation:
                        </h1>
                        <span className="text-white pt-1">
                            {proposal.motivation}
                        </span>
                    </div>
                    <div className="flex">
                        <h1 className="text-white mb-2 px-2 font-bold text-lg">
                            Description:
                        </h1>
                        <span className="text-white pt-1">
                            {proposal.proposalDescription}
                        </span>
                    </div>
                    <div className="flex justify-items-center">
                        <h1 className="text-white mb-2 px-2 font-bold text-lg">
                            Price:
                        </h1>
                        <span className="text-white pt-1 mx-14">
                            {proposal.bid} Eth
                        </span>
                    </div>
                    <div className="flex justify-items-center">
                        <h1 className="text-white mb-2 px-2 font-bold text-lg">
                            Worker:
                        </h1>
                        <span className="text-white pt-1 mx-14">
                            {proposal?.worker}
                        </span>
                    </div>
                    {
                        proposal?.worker == worker ? 
                        <div className="flex justify-items-center">
                            <h1 className="text-white mb-2 px-2 font-bold text-lg">
                                Status:
                            </h1>
                            <span className="text-white pt-1 mx-14">
                                Assigned, waiting for worker to accept
                            </span>
                        </div> : null
                    }
                </div>
                <div style={{ display: "flex", alignContent: "center", justifyContent: "flex-start" }}>
                    {!status && (
                        <button
                            onClick={acceptProposal}
                            className="bg-[#0284c7] text-white font-bold mx-5 mb-5 button px-5 py-2 rounded-xl"
                        >
                            Approve
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
