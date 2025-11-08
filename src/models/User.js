import mongoose from "mongoose";
import { hash } from "bcrypt";

const UsersSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    password: {
      type: String,
      select: false,
    },
    image: {
      type: String,
    },
    provider: {
      type: String,
      default: "credentials",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    roles: {
      type: [String],
      enum: ["admin", "hr", "manager", "employee", "viewer"],
      default: ["employee"],
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      index: true,
    },
    designation: { type: String, trim: true },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contractor", "intern"],
      default: "full_time",
    },
    lastLoginAt: { type: Date },
    isOnline: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true }, // Account activation/deactivation
    twoFA: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false }, // TOTP secret
      backupCodes: { type: [String], select: false, default: [] }, // One-time backup codes
      verifiedAt: { type: Date },
    },
    activeSessions: [
      {
        sessionId: { type: String, required: true },
        userAgent: { type: String },
        ip: { type: String },
        createdAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date },
        revokedAt: { type: Date },
      },
    ],
    profile: {
      skills: { type: [String], default: [] },
      experience: [
        {
          company: { type: String },
          title: { type: String },
          startDate: { type: Date },
          endDate: { type: Date },
          description: { type: String },
        },
      ],
      social: {
        linkedin: { type: String },
        github: { type: String },
        twitter: { type: String },
        website: { type: String },
      },
      completion: { type: Number, default: 0, min: 0, max: 100 },
    },
    performance: {
      tasksCompleted: { type: Number, default: 0 },
      onTimeRate: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
      lastUpdatedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

UsersSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await hash(this.password, 10);
  }
  
  // Auto-calculate profile completion
  if (this.isModified("profile") || this.isModified("designation")) {
    let score = 0;
    let total = 5;
    
    if (this.profile?.skills?.length > 0) score += 1;
    if (this.profile?.experience?.length > 0) score += 1;
    if (this.profile?.social?.linkedin || this.profile?.social?.github) score += 1;
    if (this.designation) score += 1;
    if (this.department) score += 1;
    
    this.profile.completion = Math.round((score / total) * 100);
  }
  
  next();
});


export default mongoose.models.User || mongoose.model("User", UsersSchema);

