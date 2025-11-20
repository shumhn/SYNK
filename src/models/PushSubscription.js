import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ active: 1 });

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
