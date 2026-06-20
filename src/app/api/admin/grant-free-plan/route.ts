import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, userId } = await request.json();
  if (!email && !userId) {
    return NextResponse.json(
      { error: "email or userId required" },
      { status: 400 }
    );
  }

  const user = await db.user.update({
    where: userId ? { id: userId } : { email },
    data: { planType: "free" },
    select: { id: true, email: true, planType: true },
  });

  return NextResponse.json({
    success: true,
    user,
    message: `Free plan granted to ${user.email}`,
  });
}
