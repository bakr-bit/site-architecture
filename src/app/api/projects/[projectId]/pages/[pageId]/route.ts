import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePageSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, pageId } = await params;

    const page = await prisma.page.findFirst({
      where: { id: pageId, projectId },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to fetch page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, pageId } = await params;
    const body = await request.json();
    const parsed = updatePageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const page = await prisma.page.update({
      where: { id: pageId, projectId },
      data: parsed.data,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to update page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, pageId } = await params;

    await prisma.page.delete({
      where: { id: pageId, projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
