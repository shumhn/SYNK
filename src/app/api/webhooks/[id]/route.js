import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Webhook from "@/models/Webhook";

/**
 * PATCH /api/webhooks/[id] - Update a webhook
 */
export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid webhook ID" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const allowedFields = [
      "name",
      "url",
      "events",
      "headers",
      "secret",
      "retryAttempts",
      "active",
    ];
    const update = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const webhook = await Webhook.findByIdAndUpdate(id, update, { new: true })
      .populate("createdBy", "username email")
      .lean();

    if (!webhook) {
      return NextResponse.json(
        { error: true, message: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: false, data: webhook }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/[id] - Delete a webhook
 */
export async function DELETE(req, { params }) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid webhook ID" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const webhook = await Webhook.findByIdAndDelete(id).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: true, message: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: false, message: "Webhook deleted" },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
