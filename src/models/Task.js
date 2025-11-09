import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "blocked"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent", "critical"],
      default: "medium",
    },
    taskType: {
      type: String,
      default: "task",
      index: true,
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number },
    actualHours: { type: Number },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    tags: [{ type: String }],
    attachments: [
      {
        filename: { type: String },
        url: { type: String },
        size: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    checklist: [
      {
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],
    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], default: "weekly" },
      interval: { type: Number, default: 1 },
      endDate: { type: Date },
      lastGenerated: { type: Date },
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task", index: true },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ assignee: 1, status: 1 });

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
