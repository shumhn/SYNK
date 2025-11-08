import mongoose from "mongoose";

const IntegrationSettingsSchema = new mongoose.Schema(
  {
    slackWebhookUrl: { type: String, default: "" },
    discordWebhookUrl: { type: String, default: "" },
    telegramBotToken: { type: String, default: "" },
    telegramChatId: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.IntegrationSettings || mongoose.model("IntegrationSettings", IntegrationSettingsSchema);
