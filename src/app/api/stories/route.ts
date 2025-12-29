import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionServer } from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import prismaClient from "@/lib/prismaClient";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const stories = await prismaClient.story.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(stories, { status: 200 });
  } catch (error) {
    return await apiErrorHandler(error);
  }
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const newStory = await prismaClient.story.create({
      data: {
        userId: user.id,
      },
    });

    if (!newStory) {
      throw new HttpExceptionServer(500, "Erro ao criar história");
    }

    const newConversationHistory =
      await prismaClient.conversationHistory.create({
        data: {
          storyId: newStory.id,
        },
      });

    if (!newConversationHistory) {
      throw new HttpExceptionServer(
        500,
        "Erro ao criar histórico de mensagens",
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/stories");
    revalidatePath("/", "layout");

    return NextResponse.json(newStory, { status: 201 });
  } catch (error) {
    return await apiErrorHandler(error);
  }
}
