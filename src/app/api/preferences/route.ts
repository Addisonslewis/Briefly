import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const preferencesSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  keywords: z.array(z.string()).max(50),
  ignoredTopics: z.array(z.string()).max(50),
  signalDescription: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  return NextResponse.json({
    email: user?.email || "",
    keywords: user?.preferences?.keywords || [],
    ignoredTopics: user?.preferences?.ignoredTopics || [],
    signalDescription: user?.preferences?.signalDescription || "",
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, ...prefData } = parsed.data;

  // Check if user already has preferences (i.e., not a new user)
  const existingUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { trialEndsAt: true },
  });

  // Update email and start trial for new users (no existing trialEndsAt)
  const userData: { email?: string; trialEndsAt?: Date } = {};
  if (email) {
    userData.email = email;
  }
  if (!existingUser?.trialEndsAt) {
    userData.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (Object.keys(userData).length > 0) {
    await db.user.update({
      where: { id: session.user.id },
      data: userData,
    });
  }

  const preferences = await db.userPreference.upsert({
    where: { userId: session.user.id },
    update: prefData,
    create: {
      userId: session.user.id,
      ...prefData,
    },
  });

  return NextResponse.json(preferences);
}
