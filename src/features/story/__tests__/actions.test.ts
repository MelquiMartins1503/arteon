import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import prismaClient from "@/lib/prismaClient";
import {
  createStory,
  deleteStory,
  getStories,
  updateStoriesOrder,
} from "../actions";

// Mock modules
vi.mock("@/lib/getAuthenticatedUser");
vi.mock("@/lib/prismaClient");

describe("Story Actions", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    name: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthenticatedUser as any).mockResolvedValue(mockUser);
  });

  describe("getStories", () => {
    it("should return stories for authenticated user", async () => {
      const mockStories = [
        {
          id: 1,
          uuid: "uuid-1",
          title: "Story 1",
          updatedAt: new Date(),
          order: 0,
        },
        {
          id: 2,
          uuid: "uuid-2",
          title: "Story 2",
          updatedAt: new Date(),
          order: 1,
        },
      ];

      (prismaClient.story.findMany as any).mockResolvedValue(mockStories);

      const result = await getStories();

      expect(result).toEqual(mockStories);
    });

    it("should return empty array on error", async () => {
      (prismaClient.story.findMany as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await getStories();

      expect(result).toEqual([]);
    });
  });

  describe("createStory", () => {
    it("should create a story with valid data", async () => {
      const inputData = {
        title: "New Story",
        description: "Test description",
        customPrompt: "Custom prompt",
      };

      const mockCreatedStory = {
        id: 1,
        uuid: "new-uuid",
        ...inputData,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0,
      };

      const mockConversationHistory = {
        id: 1,
        storyId: 1,
        customPrompt: "Custom prompt",
      };

      (prismaClient.story.findFirst as any).mockResolvedValue({ order: -1 });
      (prismaClient.story.create as any).mockResolvedValue(mockCreatedStory);
      (prismaClient.conversationHistory.create as any).mockResolvedValue(
        mockConversationHistory,
      );

      const result = await createStory(inputData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.storyUuid).toBe("new-uuid");
      }
    });
  });

  describe("deleteStory", () => {
    it("should delete a story owned by user", async () => {
      const storyUuid = "uuid-to-delete";
      const mockStory = {
        id: 1,
        uuid: storyUuid,
        userId: mockUser.id,
        title: "Story to delete",
      };

      (prismaClient.story.delete as any).mockResolvedValue(mockStory);

      const result = await deleteStory(storyUuid);

      expect(result.success).toBe(true);
    });
  });

  describe("updateStoriesOrder", () => {
    it("should update stories order", async () => {
      const newOrder = [
        { uuid: "uuid-2", order: 0 },
        { uuid: "uuid-1", order: 1 },
      ];

      (prismaClient.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prismaClient);
      });

      const result = await updateStoriesOrder(newOrder);

      expect(result.success).toBe(true);
    });
  });
});
