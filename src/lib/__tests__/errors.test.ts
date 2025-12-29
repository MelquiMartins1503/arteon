import { describe, expect, it } from "vitest";
import {
  AppError,
  handleError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with message and status code", () => {
      const error = new AppError("Test error", 400);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe("AppError");
    });

    it("should default to status code 500", () => {
      const error = new AppError("Server error");

      expect(error.statusCode).toBe(500);
    });
  });

  describe("NotFoundError", () => {
    it("should create 404 error", () => {
      const error = new NotFoundError("User not found");

      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(404);
    });

    it("should use default message", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Resource not found");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create 401 error", () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });
  });

  describe("ValidationError", () => {
    it("should create 400 error", () => {
      const error = new ValidationError("Invalid input");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
    });
  });

  describe("handleError", () => {
    it("should handle AppError correctly", () => {
      const error = new NotFoundError("Story not found");
      const result = handleError(error);

      expect(result).toEqual({
        success: false,
        error: "Story not found",
        statusCode: 404,
      });
    });

    it("should handle unknown errors", () => {
      const error = new Error("Unexpected");
      const result = handleError(error);

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
        statusCode: 500,
      });
    });
  });
});
