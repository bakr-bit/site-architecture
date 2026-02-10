import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validations";

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
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Update all items in a single transaction
    await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.page.update({
          where: { id: item.id, projectId },
          data: {
            parentId: item.parentId,
            position: item.position,
            ...(item.url !== undefined ? { url: item.url } : {}),
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder pages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
