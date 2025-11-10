import mongoose from "mongoose";

const ChannelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // Optional for private channels
    description: { type: String },
    type: { 
      type: String, 
      enum: ["private", "group", "department"], 
      default: "group",
      required: true,
      index: true
    },
    // Members of the channel
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    // For department channels
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true }],
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Last message for quick preview
    lastMessage: {
      content: { type: String },
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date }
    },
    // Unread tracking per user
    unreadCount: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

// Unique name only for group/department channels (not private)
ChannelSchema.index({ name: 1, type: 1 }, { 
  unique: true, 
  partialFilterExpression: { type: { $in: ["group", "department"] } } 
});

// Index for finding private channels between two users
ChannelSchema.index({ type: 1, members: 1 });

export default mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
