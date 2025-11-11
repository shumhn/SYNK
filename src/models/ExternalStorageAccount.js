import mongoose from "mongoose";
import crypto from "crypto";

const ExternalStorageAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["google_drive", "dropbox"], required: true },
    
    // OAuth tokens (encrypted)
    accessToken: { type: String, required: true },
    refreshToken: String,
    expiresAt: Date,
    
    // Account info
    accountId: String, // Provider's account ID
    accountEmail: String,
    accountName: String,
    
    // Sync settings
    autoSync: { type: Boolean, default: false },
    syncFolder: String, // Folder to sync to
    lastSyncAt: Date,
    
    // Status
    isActive: { type: Boolean, default: true },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
ExternalStorageAccountSchema.index({ user: 1, provider: 1 });
ExternalStorageAccountSchema.index({ accountId: 1, provider: 1 });

// Encryption helpers
const ENCRYPTION_KEY = process.env.STORAGE_ENCRYPTION_KEY || "default-32-character-secret-key!";
const ALGORITHM = "aes-256-cbc";

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Pre-save hook to encrypt tokens
ExternalStorageAccountSchema.pre("save", function (next) {
  if (this.isModified("accessToken") && this.accessToken) {
    // Only encrypt if not already encrypted
    if (!this.accessToken.includes(":")) {
      this.accessToken = encrypt(this.accessToken);
    }
  }
  if (this.isModified("refreshToken") && this.refreshToken) {
    if (!this.refreshToken.includes(":")) {
      this.refreshToken = encrypt(this.refreshToken);
    }
  }
  next();
});

// Method to get decrypted access token
ExternalStorageAccountSchema.methods.getAccessToken = function () {
  return decrypt(this.accessToken);
};

// Method to get decrypted refresh token
ExternalStorageAccountSchema.methods.getRefreshToken = function () {
  return decrypt(this.refreshToken);
};

export default mongoose.models.ExternalStorageAccount || 
  mongoose.model("ExternalStorageAccount", ExternalStorageAccountSchema);
