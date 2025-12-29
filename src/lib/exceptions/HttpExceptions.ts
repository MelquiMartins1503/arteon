import logger from "../logger";

export class HttpExceptionClient extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`Client Error: ${message}`);

    if (statusCode < 400 || statusCode >= 500) {
      throw new Error(`Invalid status code: ${statusCode}`);
    }

    this.statusCode = statusCode;

    logger.error(
      { statusCode: this.statusCode, message: this.message },
      "HttpExceptionClient",
    );
  }
}

export class HttpExceptionServer extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`Server Error: ${message}`);

    if (statusCode < 500 || statusCode >= 600) {
      throw new Error(`Invalid status code: ${statusCode}`);
    }

    this.statusCode = statusCode;
    logger.error(
      { statusCode: this.statusCode, message: this.message },
      "HttpExceptionServer",
    );
  }
}
