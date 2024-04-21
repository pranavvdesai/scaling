import Vote from "@/models/vote";
import { dbConnect } from "@/utils/dbconnect";
import { NextResponse } from "next/server";

export default async function handler(request, resp) {
    await dbConnect();
    try {
        const body = await request.body;
        const newVote = new Vote(body);
        const savedVote = await newVote.save();
        console.log(savedVote)
        return resp.json(savedVote);
    } catch (error) {
        return resp.json(error.message, {
            status: 400,
        });
    }
}