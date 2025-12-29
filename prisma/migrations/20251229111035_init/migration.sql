-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'MODEL');

-- CreateTable
CREATE TABLE "conversation_history" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "customPrompt" TEXT,
    "storyId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "audioUrl" TEXT,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "isMeta" BOOLEAN NOT NULL DEFAULT false,
    "generateSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "conversationHistoryId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "resetPasswordTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_history_uuid_key" ON "conversation_history"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_history_storyId_key" ON "conversation_history"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_uuid_key" ON "messages"("uuid");

-- CreateIndex
CREATE INDEX "messages_conversationHistoryId_idx" ON "messages"("conversationHistoryId");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_important_idx" ON "messages"("important");

-- CreateIndex
CREATE UNIQUE INDEX "stories_uuid_key" ON "stories"("uuid");

-- CreateIndex
CREATE INDEX "stories_userId_idx" ON "stories"("userId");

-- CreateIndex
CREATE INDEX "stories_updated_at_idx" ON "stories"("updated_at");

-- CreateIndex
CREATE INDEX "stories_order_idx" ON "stories"("order");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "conversation_history" ADD CONSTRAINT "conversation_history_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationHistoryId_fkey" FOREIGN KEY ("conversationHistoryId") REFERENCES "conversation_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
