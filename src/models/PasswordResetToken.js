import mongoose from "mongoose";

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
    ip: { type: String },
  },
  { timestamps: true }
);

// Auto-delete expired tokens after 1 hour
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.models.PasswordResetToken || mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
