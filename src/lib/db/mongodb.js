
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("Please provide MONGODB_URI");


if (!globalThis._mongoose) globalThis._mongoose = { conn: null, promise: null };

async function connectToDatabase() {
  if (globalThis._mongoose.conn) return globalThis._mongoose.conn; 
  if (!globalThis._mongoose.promise) {
    globalThis._mongoose.promise = (async () => {
      const m = await mongoose.connect(MONGODB_URI);
      globalThis._mongoose.conn = m;
      console.log("Connected to MongoDB");
      return m;
    })();
  }

  return await globalThis._mongoose.promise;
}

export default connectToDatabase;
