-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'ENDED', 'MISSED');

-- CreateTable
CREATE TABLE "calls" (
    "call_id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("call_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_roomId_key" ON "calls"("roomId");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
