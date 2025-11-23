import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/integrations/email/test
 * Test email configuration by sending a test email
 */
export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: true, message: "Email address required" }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: "Test Email from Zalient Productive",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Email Configuration Test</h1>
          <p>This is a test email from your Zalient Productive application.</p>
          <p>If you received this, your SendGrid integration is working correctly! ✅</p>
          <p style="margin-top: 30px;">Best regards,<br><strong>Zalient Team</strong></p>
        </div>
      `
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: true, 
        message: result.error || "Failed to send test email" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: false, 
      message: "Test email sent successfully!" 
    });

  } catch (e) {
    console.error("Error sending test email:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
