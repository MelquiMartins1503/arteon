-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'MODEL');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('FAMILY', 'FRIENDSHIP', 'ROMANCE', 'RIVALRY', 'MENTORSHIP', 'HIERARCHY', 'ALLIANCE', 'ENEMY', 'OWNERSHIP', 'RESIDENCE', 'MEMBERSHIP', 'PARTICIPATION', 'BELIEF', 'AFFILIATION');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GENERAL', 'SECTION_PROPOSAL', 'SECTION_CONTENT', 'SECTION_STRUCTURE', 'DECA', 'REVISION_REQUEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CHARACTER', 'LOCATION', 'OBJECT', 'EVENT', 'CONCEPT', 'FACTION', 'DECISION', 'RELATIONSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "EntitySource" AS ENUM ('AI', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATED', 'UPDATED', 'MERGED', 'SPLIT');

-- CreateTable
CREATE TABLE "conversation_history" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "customPrompt" TEXT,
    "pauseNarrativeMode" BOOLEAN NOT NULL DEFAULT false,
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
    "messageType" "MessageType" NOT NULL DEFAULT 'GENERAL',
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
CREATE TABLE "entity_relationships" (
    "id" SERIAL NOT NULL,
    "story_id" UUID NOT NULL,
    "from_entity_id" INTEGER NOT NULL,
    "to_entity_id" INTEGER NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "description" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" "EntitySource" NOT NULL DEFAULT 'AI',
    "message_id" INTEGER,

    CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "story_entity" (
    "id" SERIAL NOT NULL,
    "storyId" UUID NOT NULL,
    "type" "EntityType" NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "description" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "importance" INTEGER NOT NULL DEFAULT 5,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "context_vector" vector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" "EntitySource" NOT NULL DEFAULT 'AI',
    "messageId" INTEGER,

    CONSTRAINT "story_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_version" (
    "id" SERIAL NOT NULL,
    "entityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "changeType" "ChangeType" NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" "EntitySource" NOT NULL DEFAULT 'AI',
    "messageId" INTEGER,

    CONSTRAINT "entity_version_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "messages_messageType_idx" ON "messages"("messageType");

-- CreateIndex
CREATE INDEX "entity_relationships_story_id_from_entity_id_idx" ON "entity_relationships"("story_id", "from_entity_id");

-- CreateIndex
CREATE INDEX "entity_relationships_story_id_to_entity_id_idx" ON "entity_relationships"("story_id", "to_entity_id");

-- CreateIndex
CREATE INDEX "entity_relationships_type_idx" ON "entity_relationships"("type");

-- CreateIndex
CREATE UNIQUE INDEX "entity_relationships_from_entity_id_to_entity_id_type_key" ON "entity_relationships"("from_entity_id", "to_entity_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "stories_uuid_key" ON "stories"("uuid");

-- CreateIndex
CREATE INDEX "stories_userId_idx" ON "stories"("userId");

-- CreateIndex
CREATE INDEX "stories_updated_at_idx" ON "stories"("updated_at");

-- CreateIndex
CREATE INDEX "stories_order_idx" ON "stories"("order");

-- CreateIndex
CREATE INDEX "story_entity_storyId_type_idx" ON "story_entity"("storyId", "type");

-- CreateIndex
CREATE INDEX "story_entity_storyId_importance_idx" ON "story_entity"("storyId", "importance");

-- CreateIndex
CREATE INDEX "story_entity_storyId_status_idx" ON "story_entity"("storyId", "status");

-- CreateIndex
CREATE INDEX "story_entity_name_idx" ON "story_entity"("name");

-- CreateIndex
CREATE INDEX "entity_version_entityId_createdAt_idx" ON "entity_version"("entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "conversation_history" ADD CONSTRAINT "conversation_history_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationHistoryId_fkey" FOREIGN KEY ("conversationHistoryId") REFERENCES "conversation_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "story_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "story_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_entity" ADD CONSTRAINT "story_entity_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_entity" ADD CONSTRAINT "story_entity_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_version" ADD CONSTRAINT "entity_version_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "story_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_version" ADD CONSTRAINT "entity_version_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
