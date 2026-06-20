-- CreateTable
CREATE TABLE "TwitterFollowing" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followingUserId" TEXT NOT NULL,
    "screenName" TEXT NOT NULL,
    "displayName" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitterFollowing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwitterFollowing_accountId_fetchedAt_idx" ON "TwitterFollowing"("accountId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwitterFollowing_accountId_followingUserId_key" ON "TwitterFollowing"("accountId", "followingUserId");

-- AddForeignKey
ALTER TABLE "TwitterFollowing" ADD CONSTRAINT "TwitterFollowing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
