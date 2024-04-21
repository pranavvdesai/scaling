import Vote from "@/models/vote";
import { dbConnect } from "@/utils/dbconnect";

export default async function handler(req, res) {
    await dbConnect();
    try {
        const body = await req.body;
        const Votes = await Vote.findOneAndUpdate(
            { walletAddress: body.walletAddress },
            {
                $inc: {
                    quadraticVoteBalance: 100,
                },
            },
            { new: true }
        );
        return res.json(Votes);
    }
    catch (error) {
        return res.json(error.message, {
            status: 400,
        });
    }
}