import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    description: { type: String },
    archived: { type: Boolean, default: false, index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

TeamSchema.index({ name: 1, department: 1 }, { unique: true, sparse: true });

export default mongoose.models.Team || mongoose.model("Team", TeamSchema);
