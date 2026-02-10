import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

interface SitemapPage {
  url: string;
  metaTitle: string;
  parentUrl: string | null;
  level: number;
  pageType: string | null;
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function parsePagesFromUrls(urls: string[]): SitemapPage[] {
  // Deduplicate
  const uniqueUrls = [...new Set(urls)];

  // Extract paths from full URLs
  const paths = new Set<string>();
  for (const raw of uniqueUrls) {
    try {
      const u = new URL(raw);
      const path = u.pathname.replace(/\/+$/, "") || "/";
      paths.add(path);
    } catch {
      // Skip invalid URLs
    }
  }

  // Build set of all paths including implicit parents
  const allPaths = new Set<string>();
  for (const path of paths) {
    allPaths.add(path);
    // Create implicit parents
    const segments = path.split("/").filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      allPaths.add("/" + segments.slice(0, i).join("/"));
    }
  }

  // Sort so parents come before children
  const sortedPaths = [...allPaths].sort((a, b) => {
    const aDepth = a === "/" ? 0 : a.split("/").filter(Boolean).length;
    const bDepth = b === "/" ? 0 : b.split("/").filter(Boolean).length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.localeCompare(b);
  });

  const pathSet = new Set(sortedPaths);

  const pages: SitemapPage[] = [];
  for (const path of sortedPaths) {
    const segments = path.split("/").filter(Boolean);
    const level = path === "/" ? 0 : segments.length;
    const slug = segments[segments.length - 1] || "";
    const metaTitle = path === "/" ? "Home" : slugToTitle(slug);

    // Find parent
    let parentUrl: string | null = null;
    if (path !== "/") {
      if (segments.length === 1) {
        // Direct child of root — parent is "/" only if "/" exists
        parentUrl = pathSet.has("/") ? "/" : null;
      } else {
        parentUrl = "/" + segments.slice(0, -1).join("/");
      }
    }

    pages.push({ url: path, metaTitle, parentUrl, level, pageType: path === "/" ? "Home Page" : null });
  }

  return pages;
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const parser = new XMLParser({ ignoreAttributes: false });

  const res = await fetch(sitemapUrl, {
    headers: { "User-Agent": "SiteArchitect/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Handle sitemapindex — follow child sitemaps
  if (parsed.sitemapindex) {
    const sitemaps = parsed.sitemapindex.sitemap;
    const entries = Array.isArray(sitemaps) ? sitemaps : [sitemaps];
    const allUrls: string[] = [];

    for (const entry of entries) {
      const loc = entry?.loc;
      if (typeof loc === "string") {
        try {
          const childUrls = await fetchSitemapUrls(loc);
          allUrls.push(...childUrls);
        } catch {
          // Skip failed child sitemaps
        }
      }
    }
    return allUrls;
  }

  // Handle urlset
  if (parsed.urlset) {
    const urls = parsed.urlset.url;
    const entries = Array.isArray(urls) ? urls : [urls];
    return entries
      .map((entry: { loc?: string }) => entry?.loc)
      .filter((loc: unknown): loc is string => typeof loc === "string");
  }

  throw new Error("Invalid sitemap: no <sitemapindex> or <urlset> found");
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Sitemap URL is required" }, { status: 400 });
    }

    // Fetch and parse sitemap
    const rawUrls = await fetchSitemapUrls(url);
    if (rawUrls.length === 0) {
      return NextResponse.json({ error: "No URLs found in sitemap" }, { status: 400 });
    }

    const pages = parsePagesFromUrls(rawUrls);

    // Check if this is a confirm request (actually create pages)
    const reqUrl = new URL(request.url);
    const confirm = reqUrl.searchParams.get("confirm") === "true";

    if (!confirm) {
      // Preview only
      return NextResponse.json({ pages });
    }

    // Create pages in the database
    const maxPos = await prisma.page.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    let nextPosition = (maxPos._max.position ?? -1) + 1;

    // We need to map url → id for parentId resolution
    const urlToId = new Map<string, string>();

    // First pass: check existing pages to populate urlToId
    const existingPages = await prisma.page.findMany({
      where: { projectId },
      select: { id: true, url: true },
    });
    for (const ep of existingPages) {
      urlToId.set(ep.url, ep.id);
    }

    const results = { created: 0, errors: 0 };

    // Pages are sorted parent-first, so we can resolve parentIds in order
    for (const page of pages) {
      const parentId = page.parentUrl ? (urlToId.get(page.parentUrl) ?? null) : null;

      try {
        const upserted = await prisma.page.upsert({
          where: {
            projectId_url: { projectId, url: page.url },
          },
          update: {
            metaTitle: page.metaTitle,
            level: Math.min(page.level, 3),
            parentId,
            ...(page.pageType ? { pageType: page.pageType } : {}),
          },
          create: {
            projectId,
            url: page.url,
            metaTitle: page.metaTitle,
            level: Math.min(page.level, 3),
            ...(page.pageType ? { pageType: page.pageType } : {}),
            parentId,
            position: nextPosition++,
          },
        });
        urlToId.set(page.url, upserted.id);
        results.created++;
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.created,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Failed to import sitemap:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
