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
  },
  {
    timestamps: true,
  }
);

UsersSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await hash(this.password, 10);
  }
  next();
});


export default mongoose.models.User || mongoose.model("User", UsersSchema);

