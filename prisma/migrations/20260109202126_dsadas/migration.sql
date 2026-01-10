-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GENERAL', 'SECTION_PROPOSAL', 'SECTION_CONTENT', 'DECA', 'REVISION_REQUEST', 'SYSTEM');

-- AlterTable
ALTER TABLE "conversation_history" ADD COLUMN     "pauseNarrativeMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "messages_messageType_idx" ON "messages"("messageType");
