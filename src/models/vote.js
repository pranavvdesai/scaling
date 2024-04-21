import { Schema, model, models } from "mongoose";

const VoteSchema = new Schema(
    {
        walletAddress: {
            type: String,
            required: true,
            unique: true,
        },
        votes: {
            type: Number,
            default: 0,
        },
        quadraticVoteBalance: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export default models.Vote || model("Vote", VoteSchema);