import { XMLParser } from "fast-xml-parser";

export async function fetchSitemapUrls(
  sitemapUrl: string,
  signal?: AbortSignal
): Promise<string[]> {
  const parser = new XMLParser({ ignoreAttributes: false });

  const res = await fetch(sitemapUrl, {
    headers: { "User-Agent": "SiteArchitect/1.0" },
    signal,
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
          const childUrls = await fetchSitemapUrls(loc, signal);
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
