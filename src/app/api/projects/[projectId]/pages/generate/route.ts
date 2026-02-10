import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateArchitectureSchema, confirmGeneratedPagesSchema } from "@/lib/validations";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const maxDuration = 120;

const generatedPagesSchema = z.array(
  z.object({
    url: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    keyword: z.string(),
    pageType: z.enum([
      "Home Page",
      "Pillar Page",
      "Standard Page",
      "Blog Post",
      "Landing Page",
    ]),
    userDescription: z.string(),
    level: z.number().int().min(0).max(3),
    parentUrl: z.string().nullable(),
  })
);

const SYSTEM_PROMPT = `You are an expert SEO site architect. Your job is to analyze competitor websites and design a site architecture that can outrank them.

CRITICAL — Competitor Analysis:
- Study the competitor sitemap URLs carefully. Identify their content categories, URL structures, and topic clusters.
- Replicate successful URL patterns you see across multiple competitors (e.g. if competitors all have /guides/, /reviews/, /compare/ sections, include similar sections).
- Identify content gaps — topics competitors cover that should be in the new site.
- Use similar hierarchical depth to what competitors use. If competitors have 3 levels of nesting, you should too.

Structure Rules:
- Every URL starts with "/"
- There must be EXACTLY ONE home page: url "/" with pageType "Home Page". Do NOT create /home, /us, /en, or any other home-like page.
- Only use these page types: Home Page, Pillar Page, Standard Page, Blog Post, Landing Page
- parentUrl for root-level pages (children of home) = "/"
- parentUrl for home page = null
- Level 0 = home, 1 = direct children, 2 = grandchildren, 3 = max depth
- Use SEO-friendly slugs (lowercase, hyphens). NEVER add file extensions like .html, .php, etc.
- NEVER use language prefixes in URLs (no /en/, /ja/, /fr/ etc.). All URLs should start directly with the topic slug.
- Generate a unique target keyword for every page
- Build proper pillar-cluster structure: Pillar Pages at level 1, with Standard Pages and Blog Posts nested under them at level 2-3
- Ensure every pillar page has at least 3 child pages

Follow the user's instructions for approximate page count and any specific requirements.`;

const VERSION_CONFIGS = [
  {
    label: "Lean",
    description: "Focused essentials",
    sizeInstruction:
      "Generate a lean site architecture with approximately 15-25 pages. Focus on the most essential pillar pages and their core children.",
  },
  {
    label: "Standard",
    description: "Balanced coverage",
    sizeInstruction:
      "Generate a standard site architecture with approximately 30-50 pages. Include pillar pages with thorough child page coverage, plus a small blog section.",
  },
  {
    label: "Comprehensive",
    description: "Full topical authority",
    sizeInstruction:
      "Generate a comprehensive site architecture with approximately 50-80 pages. Cover every relevant subtopic, include extensive blog content, and maximize topical authority.",
  },
];

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

    const reqUrl = new URL(request.url);
    const confirm = reqUrl.searchParams.get("confirm") === "true";

    if (confirm) {
      return handleConfirm(request, projectId);
    }

    return handleGenerate(request, projectId);
  } catch (error) {
    console.error("Generate architecture error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type GeneratedPage = z.infer<typeof generatedPagesSchema>[number];

function postProcessPages(pages: GeneratedPage[], keyword: string): GeneratedPage[] {
  // Remove duplicate home pages — keep only url "/", drop /home, /us, etc.
  pages = pages.filter(
    (p) => !(p.pageType === "Home Page" && p.url !== "/")
  );

  const urlSet = new Set(pages.map((p) => p.url));

  // Ensure home page exists
  if (!urlSet.has("/")) {
    pages.unshift({
      url: "/",
      metaTitle: "Home",
      metaDescription: "",
      keyword: keyword,
      pageType: "Home Page",
      userDescription: "",
      level: 0,
      parentUrl: null,
    });
    urlSet.add("/");
  }

  // Fix orphan parentUrl references
  for (const page of pages) {
    if (page.parentUrl && !urlSet.has(page.parentUrl)) {
      page.parentUrl = page.url === "/" ? null : "/";
    }
    if (page.url === "/") {
      page.parentUrl = null;
      page.level = 0;
    }
  }

  // Sort parent-first (by level, then alphabetically)
  pages.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.url.localeCompare(b.url);
  });

  return pages;
}

async function handleGenerate(request: Request, projectId: string) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const parsed = generateArchitectureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { keyword, geo, prompt, referenceUrls } = parsed.data;

  let domains: string[] = [];
  const sitemaps: { domain: string; urls: string[] }[] = [];

  const hasReferences = referenceUrls && referenceUrls.length > 0;

  if (!hasReferences && !keyword) {
    return NextResponse.json(
      { error: "Keyword is required when using auto search" },
      { status: 400 }
    );
  }

  if (hasReferences) {
    // Use reference URLs directly — extract domains and fetch their sitemaps
    domains = [
      ...new Set(
        referenceUrls
          .map((u) => {
            try {
              const url = u.startsWith("http") ? u : `https://${u}`;
              return new URL(url).hostname;
            } catch {
              return null;
            }
          })
          .filter((d): d is string => d !== null)
      ),
    ];
  } else if (!hasReferences) {
    // SERP-based discovery
    if (!process.env.SERPER_API_KEY) {
      return NextResponse.json(
        { error: "SERPER_API_KEY is not configured. Provide reference websites or configure SERPER_API_KEY." },
        { status: 500 }
      );
    }

    const serpRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.SERPER_API_KEY,
      },
      body: JSON.stringify({ q: keyword, gl: geo, num: 10 }),
    });

    if (!serpRes.ok) {
      return NextResponse.json(
        { error: "SERP search failed" },
        { status: 502 }
      );
    }

    const serpData = await serpRes.json();
    const organicResults: { link?: string }[] = serpData.organic || [];

    domains = [
      ...new Set(
        organicResults
          .map((r) => {
            try {
              return new URL(r.link || "").hostname;
            } catch {
              return null;
            }
          })
          .filter((d): d is string => d !== null)
      ),
    ];
  }

  if (domains.length === 0) {
    return NextResponse.json(
      { error: "No competitor domains found" },
      { status: 400 }
    );
  }

  // Fetch site maps via Firecrawl
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return NextResponse.json(
      { error: "FIRECRAWL_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const mapResults = await Promise.allSettled(
    domains.map(async (domain) => {
      const res = await fetch("https://api.firecrawl.dev/v2/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({
          url: `https://${domain}`,
          limit: 200,
        }),
      });
      if (!res.ok) throw new Error(`Firecrawl map failed for ${domain}`);
      const data = await res.json();
      const urls: string[] = (data.links ?? [])
        .map((l: { url?: string } | string) => (typeof l === "string" ? l : l.url))
        .filter(Boolean);
      return { domain, urls };
    })
  );

  for (const result of mapResults) {
    if (result.status === "fulfilled") {
      sitemaps.push(result.value);
    }
  }

  const totalCompetitorUrls = sitemaps.reduce((sum, s) => sum + s.urls.length, 0);

  // Build base user prompt with competitor data
  let basePrompt = keyword
    ? `Target keyword: ${keyword}\nCountry: ${geo}\nInstructions: ${prompt}\n\nCompetitor sitemaps:\n`
    : `Country: ${geo}\nInstructions: ${prompt}\n\nCompetitor sitemaps:\n`;

  for (const sitemap of sitemaps) {
    basePrompt += `---\nDomain: ${sitemap.domain}\n`;
    for (const url of sitemap.urls) {
      basePrompt += `${url}\n`;
    }
  }

  if (sitemaps.length === 0) {
    basePrompt += "(No competitor sitemaps could be fetched — generate architecture based on keyword and instructions alone)\n";
  }

  // Generate 3 versions in parallel
  const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const versionResults = await Promise.allSettled(
    VERSION_CONFIGS.map((config) =>
      generateText({
        model: gemini("gemini-2.0-flash"),
        system: SYSTEM_PROMPT,
        prompt: `${basePrompt}\n\n${config.sizeInstruction}`,
        experimental_output: Output.object({ schema: generatedPagesSchema }),
      }).then((result) => {
        const pages = result.experimental_output;
        if (!pages || !Array.isArray(pages) || pages.length === 0) {
          throw new Error("Empty result");
        }
        return {
          label: config.label,
          description: config.description,
          pages: postProcessPages([...pages], keyword),
        };
      })
    )
  );

  const versions = versionResults
    .filter(
      (r): r is PromiseFulfilledResult<{ label: string; description: string; pages: GeneratedPage[] }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (versions.length === 0) {
    return NextResponse.json(
      { error: "AI failed to generate any valid architecture" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    versions,
    meta: {
      domainsSearched: domains.length,
      sitemapsFetched: sitemaps.length,
      totalCompetitorUrls,
    },
  });
}

async function handleConfirm(request: Request, projectId: string) {
  const body = await request.json();
  const parsed = confirmGeneratedPagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pages } = parsed.data;

  // Get max position
  const maxPos = await prisma.page.aggregate({
    where: { projectId },
    _max: { position: true },
  });
  let nextPosition = (maxPos._max.position ?? -1) + 1;

  // Map url → id for parentId resolution
  const urlToId = new Map<string, string>();

  // Populate with existing pages
  const existingPages = await prisma.page.findMany({
    where: { projectId },
    select: { id: true, url: true },
  });
  for (const ep of existingPages) {
    urlToId.set(ep.url, ep.id);
  }

  const results = { created: 0, errors: 0 };

  // Pages should already be sorted parent-first
  for (const page of pages) {
    const parentId = page.parentUrl
      ? (urlToId.get(page.parentUrl) ?? null)
      : null;

    try {
      const upserted = await prisma.page.upsert({
        where: {
          projectId_url: { projectId, url: page.url },
        },
        update: {
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          keyword: page.keyword,
          pageType: page.pageType,
          userDescription: page.userDescription,
          level: Math.min(page.level, 3),
          parentId,
        },
        create: {
          projectId,
          url: page.url,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          keyword: page.keyword,
          pageType: page.pageType,
          userDescription: page.userDescription,
          level: Math.min(page.level, 3),
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
}
