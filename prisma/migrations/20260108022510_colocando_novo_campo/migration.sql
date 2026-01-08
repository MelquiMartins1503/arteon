-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "is_system_prompt" BOOLEAN NOT NULL DEFAULT false;
