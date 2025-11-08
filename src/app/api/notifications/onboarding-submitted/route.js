import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { notifyAdminsOnboardingSubmitted } from "@/lib/notifications";

export async function POST(req) {
  try {
    const { userId, username, email } = await req.json();

    if (!userId || !username || !email) {
      return NextResponse.json({ error: true, message: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Create a user object for the notification
    const newUser = {
      _id: userId,
      username,
      email,
    };

    // Notify all admins
    await notifyAdminsOnboardingSubmitted(newUser);

    return NextResponse.json({ error: false, message: "Notifications sent" });
  } catch (error) {
    console.error("Error sending onboarding notifications:", error);
    return NextResponse.json({ error: true, message: "Failed to send notifications" }, { status: 500 });
  }
}
