import mongoose from "mongoose";

const ChannelMessageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    attachments: [
      {
        filename: { type: String },
        url: { type: String },
        size: { type: Number },
      },
    ],
    // Emoji reactions
    reactions: [
      {
        emoji: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // For threading (optional future enhancement)
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "ChannelMessage", default: null },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

ChannelMessageSchema.index({ channel: 1, createdAt: -1 });
ChannelMessageSchema.index({ channel: 1, author: 1 });

export default mongoose.models.ChannelMessage || mongoose.model("ChannelMessage", ChannelMessageSchema);
