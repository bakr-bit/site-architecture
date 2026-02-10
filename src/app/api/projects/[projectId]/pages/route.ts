import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPageSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const pages = await prisma.page.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Failed to fetch pages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const parsed = createPageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Strip legacy nav fields - they don't exist in the DB anymore
    const { navI, navII, navIII, ...data } = parsed.data;

    // Auto-assign position if not provided
    let position = data.position;
    if (position === undefined) {
      const maxPos = await prisma.page.aggregate({
        where: { projectId },
        _max: { position: true },
      });
      position = (maxPos._max.position ?? -1) + 1;
    }

    const page = await prisma.page.create({
      data: {
        ...data,
        projectId,
        position,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Failed to create page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
