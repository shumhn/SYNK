import mongoose from "mongoose";

const CalendarConnectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["google", "outlook"], required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    calendarId: { type: String, default: "primary" },
    active: { type: Boolean, default: true },
    syncEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CalendarConnectionSchema.index({ user: 1, provider: 1 }, { unique: true });

export default mongoose.models.CalendarConnection ||
  mongoose.model("CalendarConnection", CalendarConnectionSchema);
