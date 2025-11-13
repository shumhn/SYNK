import mongoose from "mongoose";

const ScoreItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  score: { type: Number, required: true },
  weight: { type: Number, required: true },
}, { _id: false });

const AppraisalReviewSchema = new mongoose.Schema({
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalCycle", required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  status: { type: String, enum: ["draft", "submitted", "approved"], default: "draft" },
  scores: { type: [ScoreItemSchema], default: [] },
  overall: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  submittedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.AppraisalReview || mongoose.model("AppraisalReview", AppraisalReviewSchema);
