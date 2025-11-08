import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import IntegrationSettings from "@/models/IntegrationSettings";
import { requireRoles } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  await connectToDatabase();
  let doc = await IntegrationSettings.findOne().lean();
  if (!doc) doc = await IntegrationSettings.create({});
  return NextResponse.json({ error: false, data: doc }, { status: 200 });
}

export async function PUT(request) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  await connectToDatabase();
  const body = await request.json();
  const { slackWebhookUrl = "", discordWebhookUrl = "" } = body || {};

  let doc = await IntegrationSettings.findOne();
  if (!doc) doc = new IntegrationSettings({});

  doc.slackWebhookUrl = slackWebhookUrl?.trim() || "";
  doc.discordWebhookUrl = discordWebhookUrl?.trim() || "";
  doc.updatedBy = auth.user._id;
  await doc.save();

  return NextResponse.json({ error: false, data: doc }, { status: 200 });
}
