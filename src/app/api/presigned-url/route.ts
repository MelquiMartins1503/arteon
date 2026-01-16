import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import { getPresignedUrl } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys } = body as { keys: string[] };

    if (!keys || !Array.isArray(keys)) {
      throw new HttpExceptionClient(400, "Keys array is required");
    }

    if (keys.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    // Generate presigned URLs for all keys
    const urls = await Promise.all(
      keys.map(async (key) => {
        try {
          const url = await getPresignedUrl(key);
          return { key, url };
        } catch (_error) {
          return { key, url: null, error: "Failed to generate URL" };
        }
      }),
    );

    return NextResponse.json({ urls });
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
