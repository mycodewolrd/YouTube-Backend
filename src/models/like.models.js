import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment", 
      },
    ],
    video: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video", 
      },
    ],
    tweet: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet", 
      },
    ],
  },
  {
    timestamps: true, 
  }
);

const Like = mongoose.model('Like',likeSchema);
export default Like;