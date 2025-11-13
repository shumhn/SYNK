import mongoose from "mongoose";

const CompetencySchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  weight: { type: Number, required: true },
}, { _id: false });

const AppraisalCycleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: ["draft", "open", "closed"], default: "open" },
  visibility: { type: String, enum: ["private", "employees"], default: "private" },
  reviewerMode: { type: String, enum: ["manager", "self+manager"], default: "manager" },
  competencies: { type: [CompetencySchema], default: [] },
}, { timestamps: true });

export default mongoose.models.AppraisalCycle || mongoose.model("AppraisalCycle", AppraisalCycleSchema);
