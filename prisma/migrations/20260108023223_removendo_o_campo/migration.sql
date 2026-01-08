/*
  Warnings:

  - You are about to drop the column `is_system_prompt` on the `messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "is_system_prompt";
