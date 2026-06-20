import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const adminEmail = process.env.EMAIL_FROM || "digest@gobriefly.app";

  await getResend().emails.send({
    from: adminEmail,
    to: adminEmail,
    replyTo: session.user.email,
    subject: `[Briefly Feedback] from ${session.user.name || session.user.email}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="font-size:18px;color:#111827;">Feature Request / Feedback</h2>
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px;">
          From: <strong>${session.user.name || "Unknown"}</strong> (${session.user.email})
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <p style="font-size:11px;color:#9ca3af;margin-top:16px;">Reply directly to respond to the user.</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
