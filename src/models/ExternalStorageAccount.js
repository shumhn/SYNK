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

// Pre-save hook to encrypt tokens
ExternalStorageAccountSchema.pre("save", function (next) {
  try {
    if (this.isModified("accessToken") && this.accessToken) {
      // Only encrypt if clearly plaintext (no ":", and reasonable length for a token)
      if (!this.accessToken.includes(":") && this.accessToken.length > 10) {
        this.accessToken = encrypt(this.accessToken);
      }
    }
    if (this.isModified("refreshToken") && this.refreshToken) {
      // Only encrypt if clearly plaintext (no ":", and reasonable length for a token)
      if (!this.refreshToken.includes(":") && this.refreshToken.length > 10) {
        this.refreshToken = encrypt(this.refreshToken);
      }
    }
    next();
  } catch (error) {
    console.error("Error in token encryption pre-save hook:", error);
    // Don't fail the save, just log the error
    next();
  }
});

// Method to get decrypted access token (backward compatible if plaintext)
ExternalStorageAccountSchema.methods.getAccessToken = function () {
  if (!this.accessToken) return null;
  try {
    // If value looks encrypted (iv:payload), decrypt; otherwise treat as plaintext
    if (!this.accessToken.includes(":")) return this.accessToken;

    const parts = this.accessToken.split(":");
    if (parts.length < 2) return this.accessToken; // Not properly encrypted

    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = parts.join(":");

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.warn("Failed to decrypt access token, using raw value:", e.message);
    // Fallback to raw value to avoid hard crashes; upstream calls can validate
    return this.accessToken;
  }
};

// Method to get decrypted refresh token (backward compatible if plaintext)
ExternalStorageAccountSchema.methods.getRefreshToken = function () {
  if (!this.refreshToken) return null;
  try {
    // If value looks encrypted (iv:payload), decrypt; otherwise treat as plaintext
    if (!this.refreshToken.includes(":")) return this.refreshToken;

    const parts = this.refreshToken.split(":");
    if (parts.length < 2) return this.refreshToken; // Not properly encrypted

    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = parts.join(":");

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.warn("Failed to decrypt refresh token, using raw value:", e.message);
    return this.refreshToken;
  }
};

export default mongoose.models.ExternalStorageAccount || 
  mongoose.model("ExternalStorageAccount", ExternalStorageAccountSchema);
