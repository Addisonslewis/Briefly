import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const flagSchema = z.object({
  digestId: z.string().min(1),
  issue: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = flagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the digest belongs to this user
  const digest = await db.digestHistory.findFirst({
    where: { id: parsed.data.digestId, userId: session.user.id },
    select: { id: true },
  });

  if (!digest) {
    return NextResponse.json({ error: "Digest not found" }, { status: 404 });
  }

  const flag = await db.digestFlag.create({
    data: {
      digestId: parsed.data.digestId,
      userId: session.user.id,
      issue: parsed.data.issue,
    },
  });

  return NextResponse.json({ id: flag.id, status: "flagged" });
}
