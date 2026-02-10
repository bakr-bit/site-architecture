import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importPagesSchema } from "@/lib/validations";

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

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = importPagesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Get current max position
    const maxPos = await prisma.page.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    let nextPosition = (maxPos._max.position ?? -1) + 1;

    // Separate pages with nav fields from those with parentId
    const pagesWithNav = parsed.data.pages.filter((p) => p.navI && !p.parentId);
    const pagesWithoutNav = parsed.data.pages.filter((p) => !p.navI || p.parentId);

    const results = { created: 0, errors: 0 };

    // First, import pages that don't need nav→parentId conversion
    for (const pageData of pagesWithoutNav) {
      try {
        const { navI, navII, navIII, ...data } = pageData;
        await prisma.page.upsert({
          where: {
            projectId_url: { projectId, url: data.url },
          },
          update: { ...data, url: undefined },
          create: {
            ...data,
            projectId,
            position: data.position ?? nextPosition++,
          },
        });
        results.created++;
      } catch {
        results.errors++;
      }
    }

    // Now handle nav→parentId conversion for pages with nav fields
    if (pagesWithNav.length > 0) {
      // Group by navI to find/create category nodes
      const navIGroups = new Map<string, typeof pagesWithNav>();
      for (const page of pagesWithNav) {
        const key = page.navI!;
        if (!navIGroups.has(key)) navIGroups.set(key, []);
        navIGroups.get(key)!.push(page);
      }

      // Track category node IDs
      const navICategoryIds = new Map<string, string>();
      const navIICategoryIds = new Map<string, string>();

      for (const [navI, groupPages] of navIGroups) {
        // Find or create navI category
        const catUrl = `/_category/${navI.toLowerCase().replace(/\s+/g, "-")}`;

        // Check if a page in the group could serve as the category (has navI but no navII)
        const existingCatPage = groupPages.find((p) => !p.navII);

        let navICatId: string;
        if (existingCatPage) {
          // Use this page as the category, import it first
          const { navI: _n1, navII: _n2, navIII: _n3, ...data } = existingCatPage;
          try {
            const page = await prisma.page.upsert({
              where: { projectId_url: { projectId, url: data.url } },
              update: { ...data, url: undefined, parentId: null },
              create: { ...data, projectId, position: nextPosition++, parentId: null },
            });
            navICatId = page.id;
            results.created++;
          } catch {
            results.errors++;
            continue;
          }
        } else {
          // Create a virtual category node
          try {
            const existing = await prisma.page.findUnique({
              where: { projectId_url: { projectId, url: catUrl } },
            });
            if (existing) {
              navICatId = existing.id;
            } else {
              const cat = await prisma.page.create({
                data: {
                  projectId,
                  url: catUrl,
                  userDescription: `${navI} category`,
                  pageType: "Index Page",
                  level: 0,
                  position: nextPosition++,
                  parentId: null,
                },
              });
              navICatId = cat.id;
            }
          } catch {
            results.errors++;
            continue;
          }
        }
        navICategoryIds.set(navI, navICatId);

        // Handle navII sub-categories
        const navIIGroups = new Map<string, typeof pagesWithNav>();
        for (const page of groupPages) {
          if (page.navII) {
            const key = page.navII;
            if (!navIIGroups.has(key)) navIIGroups.set(key, []);
            navIIGroups.get(key)!.push(page);
          }
        }

        for (const [navII, subPages] of navIIGroups) {
          const subCatUrl = `/_category/${navI.toLowerCase().replace(/\s+/g, "-")}/${navII.toLowerCase().replace(/\s+/g, "-")}`;
          const existingSubCat = subPages.find((p) => !p.navIII);

          let navIICatId: string;
          if (existingSubCat && existingSubCat !== existingCatPage) {
            const { navI: _n1, navII: _n2, navIII: _n3, ...data } = existingSubCat;
            try {
              const page = await prisma.page.upsert({
                where: { projectId_url: { projectId, url: data.url } },
                update: { ...data, url: undefined, parentId: navICatId },
                create: { ...data, projectId, position: nextPosition++, parentId: navICatId },
              });
              navIICatId = page.id;
              results.created++;
            } catch {
              results.errors++;
              continue;
            }
          } else {
            try {
              const existing = await prisma.page.findUnique({
                where: { projectId_url: { projectId, url: subCatUrl } },
              });
              if (existing) {
                navIICatId = existing.id;
              } else {
                const cat = await prisma.page.create({
                  data: {
                    projectId,
                    url: subCatUrl,
                    userDescription: `${navII} sub-category`,
                    pageType: "Index Page",
                    level: 1,
                    position: nextPosition++,
                    parentId: navICatId,
                  },
                });
                navIICatId = cat.id;
              }
            } catch {
              results.errors++;
              continue;
            }
          }
          navIICategoryIds.set(`${navI}::${navII}`, navIICatId);

          // Import leaf pages under navII category
          for (const page of subPages) {
            if (page === existingSubCat) continue; // Already imported
            const { navI: _n1, navII: _n2, navIII: _n3, ...data } = page;
            try {
              await prisma.page.upsert({
                where: { projectId_url: { projectId, url: data.url } },
                update: { ...data, url: undefined, parentId: navIICatId },
                create: { ...data, projectId, position: nextPosition++, parentId: navIICatId },
              });
              results.created++;
            } catch {
              results.errors++;
            }
          }
        }

        // Import pages with navI only (no navII) that aren't the category itself
        for (const page of groupPages) {
          if (page === existingCatPage || page.navII) continue;
          const { navI: _n1, navII: _n2, navIII: _n3, ...data } = page;
          try {
            await prisma.page.upsert({
              where: { projectId_url: { projectId, url: data.url } },
              update: { ...data, url: undefined, parentId: navICatId },
              create: { ...data, projectId, position: nextPosition++, parentId: navICatId },
            });
            results.created++;
          } catch {
            results.errors++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.created,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Failed to import pages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
