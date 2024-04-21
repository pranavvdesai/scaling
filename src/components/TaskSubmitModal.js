import { uploadToIPFS } from '@/utils/ipfs'
import Router from 'next/router'
import React, { useState } from 'react'
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import JobPortal from "../../blockchain/artifacts/contracts/JobPortal.sol/JobPortal.json"
import xKode from "../../blockchain/artifacts/contracts/xKode.sol/xKode.json";
import Editor from '@monaco-editor/react';
import axios from 'axios';

import { contractAddress, xKodeAddress } from "../../blockchain/config";

const TaskSubmitModal = ({ setTaskModal, projectId, taskId, taskDisplayDetails }) => {
    const [githubLink, setGithubLink] = useState('')
    const [comments, setComments] = useState('')
    const [output, setOutput] = useState('')
    const [loading,setLoading] = useState(false);

    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['Setup Job', 'Analyzing Workflows', 'Check Benchmarks', 'Validating testcases' , 'Completed'];

    const handleSubmitTask = async () => {
        try {
            const web3Modal = new Web3Modal();
            const connection = await web3Modal.connect();
            const provider = new ethers.providers.Web3Provider(connection);
            const signer = provider.getSigner();

            const jobPortal = new ethers.Contract(contractAddress, JobPortal.abi, signer);
            const uri = await uploadToIPFS({ 
                output,
                input:comments
             });
            console.log(uri)
            const tx = await jobPortal.completeTaskWorker(projectId, taskId, uri);
            // const tx2 =  await jobPortal.reviewTask(projectId, taskId);
            await tx.wait();
            // await tx2.wait();
            console.log("Task completed! and reviewed!");

            const token = new ethers.Contract(
              xKodeAddress,
              xKode.abi,
              signer
            );
            const address = await signer.getAddress();
            console.log("tokn " + token);
            let transaction = await token.mint(
              taskDisplayDetails.worker, // need workers address
              parseInt(taskDisplayDetails.stakedAmount * 100000)
            );
            // send notification to the manager
            const project = await jobPortal.projects(projectId);
            // close the modal
            setTaskModal(false);
        } catch (err) {
            console.log("Error: ", err);
        }
    }

    const handleSubmitTask1 = async (e) => {
        e.preventDefault()
        setLoading(true);

            setCurrentStep(1);
            setTimeout(() => {
                setCurrentStep(2);
            }, 5000);
            setTimeout(() => {
                setCurrentStep(3);
            }, 10000);
            setTimeout(() => {
                setCurrentStep(4);
            }, 13000);
            setTimeout(() => {
                setCurrentStep(5);
            }, 16000);
        //once all these steps are done, then call the handleSubmitTask function
        setTimeout(() => {
            handleSubmitTask()
            setLoading(false);
        }, 20000);

    }

    const outputCheck = async (e) => {
        e.preventDefault();
        const inpArray = comments.split(' ');
        const output = await axios.post("/api/chainlink/request", {
            "source":githubLink,
            "args":inpArray
        })

        console.log(output)
        setOutput(output.data.data)

    }

    return (
        <div className="flex justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none backdrop-filter backdrop-blur-sm ">
            <div className="relative w-auto my-6 mx-auto">
                <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-[48rem] bg-[#1a1e27] outline-none focus:outline-none ">
                    <div className="flex items-start justify-between p-5 border-b border-solid border-gray-300 rounded-t ">
                        <h3 className="text-3xl font-semibold text-white">Submit Task</h3>
                        <button
                            className="bg-transparent border-0 text-black float-right"
                            onClick={() => setTaskModal(false)}
                        >
                            <span className="text-black opacity-7 h-8 w-8 text-xl block bg-gray-400 py-0 rounded-full">
                                x
                            </span>
                        </button>
                    </div>
                    {
                        loading && currentStep < 5 ?
                            <div className="flex flex-col justify-around gap-5 p-4">
                                {steps.map((step, index) => (
                                    <div
                                        key={step}
                                        className={`flex items-center ${
                                            currentStep >= index + 1 ? 'text-sky-600' : 'text-white'
                                        }`}
                                    >
                                        <span
                                            className={`h-6 w-6 rounded-full ${
                                                currentStep >= index + 1 ? 'bg-sky-600' : 'bg-white'
                                            }`}
                                        ></span>
                                        <p className="ml-2 text-sm">{step}</p>
                                    </div>
                                ))}
                            </div>                       
                        :
                    <div className="relative p-3 flex-auto">
                        <form className="bg-transparent shadow-md rounded px-8 pt-3 pb-8 w-full">

                            <label className="block text-white text-sm font-semibold mb-1">
                                Your Code*
                            </label>
                            {/* <input type="text" className="shadow appearance-none border rounded w-full text-white
                                       block h-10 bg-[#ffffff12] text-white rounded-lg px-2 border border-slate-600 py-5 mt-2 mb-2 mr-10 text-sm w-full focus:outline-none
                                        transition transform duration-100 ease-out"
                                value={githubLink}
                                onChange={(e) => setGithubLink(e.target.value)}
                                required
                                min={0}
                                max={100}
                            /> */}
                            <Editor
                                height="30vh"
                                defaultLanguage="javascript"
                                defaultValue="// some comment"
                                theme="vs-dark"
                                onChange={(e) => {
                                    console.log(e);
                                    setGithubLink(e)
                                }}
                                // onMount={handleEditorDidMount}
                            />
                            <label className="block text-white text-sm font-semibold">
                                Necessary Inputs*
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}

                                type="text"
                                id="description" className='
                                            shadow appearance-none border rounded w-full text-white
                                            block h-fit bg-[#ffffff12] text-white rounded-lg px-2 border border-slate-600 py-2 mt-3 mb-2 mr-10 text-sm w-full focus:outline-none
                            transition transform duration-100 ease-out resize-none 
                            ' required />

                            <button onClick={outputCheck}>
                                Get Output
                            </button>
                            <h2>{output}</h2>


                            
                            

                        </form>
                    </div>
                    }

                    <button
                        className="text-white bg-sky-700 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1"
                        type="submit"
                        onClick={handleSubmitTask1}
                    >
                        Submit Task
                    </button>

                </div>
            </div>
        </div>
    )
}

export default TaskSubmitModal