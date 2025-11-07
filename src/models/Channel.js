import mongoose from "mongoose";

const ChannelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true }],
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ChannelSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
