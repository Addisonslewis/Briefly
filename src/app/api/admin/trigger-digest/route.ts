import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { mode } = await request.json();

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.gobriefly.app";
  const headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` };

  if (mode === "self") {
    // Trigger digest for the admin user only
    const res = await fetch(
      `${baseUrl}/api/cron/daily-digest?forceUser=${session.user.id}`,
      { headers }
    );
    const data = await res.json();
    return NextResponse.json({ mode: "self", ...data });
  }

  if (mode === "all") {
    const res = await fetch(`${baseUrl}/api/cron/daily-digest`, { headers });
    const data = await res.json();
    return NextResponse.json({ mode: "all", ...data });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
