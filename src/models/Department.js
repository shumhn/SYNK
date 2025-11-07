import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    archived: { type: Boolean, default: false, index: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    kpis: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        target: { type: Number, default: 0 },
        current: { type: Number, default: 0 },
        unit: { type: String },
        lastUpdatedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
