/**
 * One-time migration script: converts navI/navII/navIII hierarchy into parentId relationships.
 *
 * For each project:
 * 1. Groups pages by navI → creates category Page rows (pageType: "Category")
 * 2. Groups pages by navII under their navI parent → creates sub-category Page rows
 * 3. Sets parentId on leaf pages to their deepest category ancestor
 *
 * Run with: npm run db:migrate-tree
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// We need to read the old navI/navII/navIII values via raw SQL since
// they've been removed from the Prisma schema. If the columns still
// exist in the DB (migration hasn't dropped them yet), use raw queries.
// Otherwise this script is a no-op.

async function main() {
  console.log("Starting nav→parentId migration...\n");

  // Check if the old nav columns still exist
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Page' AND column_name IN ('navI', 'navII', 'navIII')
  `;

  if (columns.length === 0) {
    console.log("Nav columns already removed from database. Nothing to migrate.");
    console.log("If you need to set up parentId relationships, use the seed script.");
    return;
  }

  console.log(`Found nav columns: ${columns.map((c) => c.column_name).join(", ")}`);

  const projects = await prisma.project.findMany();
  console.log(`Processing ${projects.length} project(s)...\n`);

  for (const project of projects) {
    console.log(`Project: ${project.name} (${project.id})`);

    // Fetch pages with their old nav values via raw SQL
    const pages = await prisma.$queryRaw<
      {
        id: string;
        url: string;
        navI: string | null;
        navII: string | null;
        navIII: string | null;
        position: number;
      }[]
    >`
      SELECT id, url, "navI", "navII", "navIII", position
      FROM "Page"
      WHERE "projectId" = ${project.id}
      ORDER BY position ASC
    `;

    if (pages.length === 0) {
      console.log("  No pages, skipping.\n");
      continue;
    }

    // Collect unique navI values (excluding pages that are themselves top-level with just navI)
    const navIGroups = new Map<string, typeof pages>();
    for (const page of pages) {
      if (page.navI) {
        if (!navIGroups.has(page.navI)) {
          navIGroups.set(page.navI, []);
        }
        navIGroups.get(page.navI)!.push(page);
      }
    }

    // For each navI group, check if we need a category node
    // A category node is needed when there are multiple pages or sub-levels
    let position = 0;
    const navICategoryIds = new Map<string, string>();
    const navIICategoryIds = new Map<string, string>(); // key: "navI::navII"

    for (const [navI, groupPages] of navIGroups) {
      const hasSubLevels = groupPages.some((p) => p.navII);
      const isMultiPage = groupPages.length > 1;

      if (hasSubLevels || isMultiPage) {
        // Check if one of the pages IS the category (e.g., /services is both the page and category)
        // If a page has navI but no navII, it could be the category page itself
        const categoryPage = groupPages.find((p) => !p.navII && !p.navIII);

        if (categoryPage) {
          // Use the existing page as the category
          navICategoryIds.set(navI, categoryPage.id);
          await prisma.page.update({
            where: { id: categoryPage.id },
            data: { parentId: null, position: position++, level: 0 },
          });
          console.log(`  NavI "${navI}" → using existing page ${categoryPage.url} as category`);
        } else {
          // Create a virtual category node
          const catPage = await prisma.page.create({
            data: {
              projectId: project.id,
              url: `/_category/${navI.toLowerCase().replace(/\s+/g, "-")}`,
              userDescription: `${navI} category`,
              pageType: "Index Page",
              level: 0,
              position: position++,
              parentId: null,
            },
          });
          navICategoryIds.set(navI, catPage.id);
          console.log(`  NavI "${navI}" → created category node ${catPage.url}`);
        }
      }
    }

    // Now handle navII sub-categories
    for (const [navI, groupPages] of navIGroups) {
      const navIIGroups = new Map<string, typeof pages>();
      for (const page of groupPages) {
        if (page.navII) {
          if (!navIIGroups.has(page.navII)) {
            navIIGroups.set(page.navII, []);
          }
          navIIGroups.get(page.navII)!.push(page);
        }
      }

      const parentId = navICategoryIds.get(navI) || null;

      for (const [navII, subPages] of navIIGroups) {
        const hasNavIII = subPages.some((p) => p.navIII);
        const isMulti = subPages.length > 1;
        const key = `${navI}::${navII}`;

        if (hasNavIII || isMulti) {
          const categoryPage = subPages.find((p) => !p.navIII);
          if (categoryPage) {
            navIICategoryIds.set(key, categoryPage.id);
            await prisma.page.update({
              where: { id: categoryPage.id },
              data: { parentId, position: position++, level: 1 },
            });
            console.log(`  NavII "${navI} > ${navII}" → using existing page ${categoryPage.url}`);
          } else {
            const catPage = await prisma.page.create({
              data: {
                projectId: project.id,
                url: `/_category/${navI.toLowerCase().replace(/\s+/g, "-")}/${navII.toLowerCase().replace(/\s+/g, "-")}`,
                userDescription: `${navII} sub-category`,
                pageType: "Index Page",
                level: 1,
                position: position++,
                parentId,
              },
            });
            navIICategoryIds.set(key, catPage.id);
            console.log(`  NavII "${navI} > ${navII}" → created category node ${catPage.url}`);
          }
        }
      }
    }

    // Finally, set parentId on all leaf pages
    for (const page of pages) {
      // Skip pages already assigned as categories
      if ([...navICategoryIds.values(), ...navIICategoryIds.values()].includes(page.id)) {
        continue;
      }

      let parentId: string | null = null;

      if (page.navII && page.navI) {
        const key = `${page.navI}::${page.navII}`;
        parentId = navIICategoryIds.get(key) || navICategoryIds.get(page.navI) || null;
      } else if (page.navI) {
        parentId = navICategoryIds.get(page.navI) || null;
      }

      const level = parentId
        ? page.navII
          ? page.navIII
            ? 3
            : 2
          : 1
        : 0;

      await prisma.page.update({
        where: { id: page.id },
        data: { parentId, position: position++, level },
      });

      if (parentId) {
        console.log(`  Page ${page.url} → parentId set (level ${level})`);
      }
    }

    console.log(`  Done. Processed ${pages.length} pages.\n`);
  }

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
