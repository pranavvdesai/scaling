import Vote from "@/models/vote";
import { dbConnect } from "@/utils/dbconnect";

` body Object:{
    walletAddress: '0x42082772D74F5E48E25f7663D98351C40A9CE9db',
    toAddress: '0x42082772D74F5E48E25f7663D98351C40A9CE9db',
    voteCount: 1,
  }
`

export default async function handler(request, res) {
    await dbConnect();
    try {
        const body = await request.body;
        if (body.walletAddress === body.toAddress) {
            return res.json("You can't vote yourself", {
                status: 400,
            });
        }
        const user = await Vote.findOne({ walletAddress: body.walletAddress });
        if (!user) {
            return res.json("You are not registered", {
                status: 400,
            });
        }
        if (user.quadraticVoteBalance < body.voteCount * body.voteCount) {
            return res.json("You don't have enough vote balance", {
                status: 400,
            });
        }

        user.quadraticVoteBalance -= body.voteCount * body.voteCount;
        await user.save();

        if (!Vote.findOne({ walletAddress: body.toAddress })) {
            const newVote = new Vote({
                walletAddress: body.toAddress,
                votes: body.voteCount,
                quadraticVoteBalance: body.voteCount * body.voteCount,
            });
            await newVote.save();
            return res.json(newVote);
        }
        const savedVote = await Vote.findOneAndUpdate(
            { walletAddress: body.toAddress },
            {
                $inc: {
                    votes: body.voteCount,
                    quadraticVoteBalance: body.voteCount * body.voteCount,
                },
            },
            { new: true }
        );
        // Return vote is successful
        return res.json(savedVote);
    } catch (error) {
        return res.json(error.message, {
            status: 400,
        });
    }
}