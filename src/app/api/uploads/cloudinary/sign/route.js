import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireRoles } from "@/lib/auth/guard";

function parseCloudinaryFromEnv() {
  const url = process.env.CLOUDINARY_URL || "";
  // format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  if (url.startsWith("cloudinary://")) {
    try {
      const without = url.replace("cloudinary://", "");
      const [creds, cloud] = without.split("@");
      const [apiKey, apiSecret] = creds.split(":");
      return { cloudName: cloud, apiKey, apiSecret };
    } catch (e) {
      // fallthrough
    }
  }
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { cloudName, apiKey, apiSecret } = parseCloudinaryFromEnv();
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: true, message: "Cloudinary env not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const folder = typeof body.folder === "string" && body.folder.trim() ? body.folder.trim() : undefined;
  const uploadPreset = typeof body.uploadPreset === "string" && body.uploadPreset.trim() ? body.uploadPreset.trim() : undefined;
  const timestamp = Math.floor(Date.now() / 1000);

  // Build signature string: alphabetically sorted params used for upload
  const params = [];
  if (folder) params.push(`folder=${folder}`);
  if (uploadPreset) params.push(`upload_preset=${uploadPreset}`);
  params.push(`timestamp=${timestamp}`);
  const toSign = params.sort().join("&") + apiSecret;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return NextResponse.json({
    error: false,
    data: { cloudName, apiKey, timestamp, signature, folder, uploadPreset }
  }, { status: 200 });
}
