export interface Page {
  id: string;
  url: string;
  userDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keyword: string | null;
  pageType: string | null;
  icon: string | null;
  level: number;
  notes: string | null;
  position: number;
  parentId: string | null;
}

/**
 * Color palette for pillar groups. Each root-level page (pillar) gets one entry.
 * badge = Tailwind classes for the type badge, border = hex for flow node accents.
 */
export interface PillarColor {
  badge: string;   // e.g. "bg-purple-100 text-purple-700"
  border: string;  // e.g. "#a855f7"
  bg: string;      // e.g. "bg-purple-50" — subtle node/row tint
}

const PILLAR_PALETTE: PillarColor[] = [
  { badge: "bg-purple-100 text-purple-700",  border: "#a855f7", bg: "bg-purple-50" },
  { badge: "bg-sky-100 text-sky-700",        border: "#0ea5e9", bg: "bg-sky-50" },
  { badge: "bg-orange-100 text-orange-700",  border: "#f97316", bg: "bg-orange-50" },
  { badge: "bg-teal-100 text-teal-700",      border: "#14b8a6", bg: "bg-teal-50" },
  { badge: "bg-pink-100 text-pink-700",      border: "#ec4899", bg: "bg-pink-50" },
  { badge: "bg-amber-100 text-amber-700",    border: "#f59e0b", bg: "bg-amber-50" },
  { badge: "bg-indigo-100 text-indigo-700",  border: "#6366f1", bg: "bg-indigo-50" },
  { badge: "bg-emerald-100 text-emerald-700", border: "#10b981", bg: "bg-emerald-50" },
  { badge: "bg-rose-100 text-rose-700",      border: "#f43f5e", bg: "bg-rose-50" },
  { badge: "bg-cyan-100 text-cyan-700",      border: "#06b6d4", bg: "bg-cyan-50" },
  { badge: "bg-lime-100 text-lime-700",      border: "#84cc16", bg: "bg-lime-50" },
  { badge: "bg-violet-100 text-violet-700",  border: "#8b5cf6", bg: "bg-violet-50" },
];

/**
 * Builds a map from page ID → PillarColor.
 * A "pillar" is a level-1 page (direct child of a root page).
 * The pillar and all its descendants share a color.
 * Root-level pages (no parent) get no color (undefined in the map).
 */
export function getPillarColorMap(pages: Page[]): Map<string, PillarColor> {
  const pageMap = new Map<string, Page>();
  for (const p of pages) pageMap.set(p.id, p);

  // Find the root pages (no parent)
  const rootIds = new Set<string>();
  for (const p of pages) {
    if (!p.parentId || !pageMap.has(p.parentId)) {
      rootIds.add(p.id);
    }
  }

  // Walk up to find the pillar ancestor (level-1 = direct child of root).
  // Returns null for root pages themselves.
  function getPillarId(page: Page): string | null {
    if (rootIds.has(page.id)) return null; // root page, no pillar color

    let current = page;
    let parent = current.parentId ? pageMap.get(current.parentId) : undefined;

    // Walk up until parent is a root
    while (parent && !rootIds.has(parent.id)) {
      current = parent;
      parent = current.parentId ? pageMap.get(current.parentId) : undefined;
    }

    // current is now the level-1 page (direct child of root)
    return current.id;
  }

  // Collect pillar IDs in page-order so colours are stable
  const pillarIds: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const pid = getPillarId(page);
    if (pid && !seen.has(pid)) {
      seen.add(pid);
      pillarIds.push(pid);
    }
  }

  // Assign colours to pillars
  const pillarColorMap = new Map<string, PillarColor>();
  for (let i = 0; i < pillarIds.length; i++) {
    pillarColorMap.set(pillarIds[i], PILLAR_PALETTE[i % PILLAR_PALETTE.length]);
  }

  // Dedicated color for root/home pages
  const ROOT_COLOR: PillarColor = {
    badge: "bg-green-100 text-green-700",
    border: "#22c55e",
    bg: "bg-green-50",
  };

  // Map every page to its pillar's colour; root pages get the home color
  const result = new Map<string, PillarColor>();
  for (const page of pages) {
    const pid = getPillarId(page);
    if (pid) {
      result.set(page.id, pillarColorMap.get(pid)!);
    } else if (rootIds.has(page.id)) {
      result.set(page.id, ROOT_COLOR);
    }
  }
  return result;
}

/**
 * Builds a map from page ID → resolved icon (emoji string).
 * If a page has no icon, it inherits from the nearest ancestor that has one.
 */
export function getIconMap(pages: Page[]): Map<string, string> {
  const pageMap = new Map<string, Page>();
  for (const p of pages) pageMap.set(p.id, p);

  const cache = new Map<string, string>();

  function resolve(page: Page): string | null {
    if (cache.has(page.id)) return cache.get(page.id) || null;
    if (page.icon) {
      cache.set(page.id, page.icon);
      return page.icon;
    }
    if (page.parentId && pageMap.has(page.parentId)) {
      const inherited = resolve(pageMap.get(page.parentId)!);
      if (inherited) {
        cache.set(page.id, inherited);
        return inherited;
      }
    }
    cache.set(page.id, "");
    return null;
  }

  const result = new Map<string, string>();
  for (const page of pages) {
    const icon = resolve(page);
    if (icon) result.set(page.id, icon);
  }
  return result;
}

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  data: Page;
}

/**
 * Converts a flat array of pages (with parentId) into a nested tree
 * structure compatible with react-arborist.
 */
export function flatToTree(pages: Page[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create all nodes first
  for (const page of pages) {
    map.set(page.id, {
      id: page.id,
      name: page.url,
      children: [],
      data: page,
    });
  }

  // Build parent-child relationships
  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by position at each level
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.data.position - b.data.position);
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  }

  sortChildren(roots);
  return roots;
}

/**
 * Extracts flat parentId + position + url data from a tree after drag operations.
 */
export function treeToFlat(
  tree: TreeNode[],
  parentId: string | null = null
): { id: string; parentId: string | null; position: number; url: string }[] {
  const result: { id: string; parentId: string | null; position: number; url: string }[] = [];

  for (let i = 0; i < tree.length; i++) {
    result.push({ id: tree[i].id, parentId, position: i, url: tree[i].data.url });
    if (tree[i].children && tree[i].children!.length > 0) {
      result.push(...treeToFlat(tree[i].children!, tree[i].id));
    }
  }

  return result;
}

/**
 * Returns just the last segment of a URL path (the slug).
 * e.g. "/category/dogs" → "dogs", "/" → "/"
 */
export function urlSlug(url: string): string {
  const parts = url.replace(/\/$/, "").split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "/";
}

/**
 * Rewrites the URL of a node and all its descendants based on the new parent's URL.
 * Preserves only the last segment (slug) of the moved node's URL.
 */
export function rewriteUrls(nodes: TreeNode[], parentUrl: string | null): void {
  for (const node of nodes) {
    const slug = urlSlug(node.data.url);
    if (slug === "/") {
      // root/homepage — keep as-is
    } else if (!parentUrl || parentUrl === "/") {
      node.data = { ...node.data, url: `/${slug}` };
      node.name = `/${slug}`;
    } else {
      const base = parentUrl.replace(/\/$/, "");
      node.data = { ...node.data, url: `${base}/${slug}` };
      node.name = `${base}/${slug}`;
    }
    if (node.children && node.children.length > 0) {
      rewriteUrls(node.children, node.data.url);
    }
  }
}

/**
 * Derives navI/navII/navIII values from the parent chain for display in
 * table view and CSV exports.
 */
/**
 * Generates a CSV string from pages, including nav fields derived from hierarchy.
 * Columns match the import format so the CSV round-trips.
 */
export function pagesToCsv(pages: Page[]): string {
  const enriched = computeNavFields(pages);
  const headers = ["URL", "Meta Title", "Meta Description", "Target Keywords", "Page Type", "Icon", "Level", "Nav I", "Nav II", "Nav III", "Description", "Notes"];

  function esc(val: string | number | null | undefined): string {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const rows = enriched.map((p) =>
    [p.url, p.metaTitle, p.metaDescription, p.keyword, p.pageType, p.icon, p.level, p.navI, p.navII, p.navIII, p.userDescription, p.notes]
      .map(esc)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function computeNavFields(
  pages: Page[]
): (Page & { navI: string | null; navII: string | null; navIII: string | null })[] {
  const pageMap = new Map<string, Page>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  function getAncestorChain(page: Page): Page[] {
    const chain: Page[] = [];
    let current: Page | undefined = page;
    while (current?.parentId) {
      const parent = pageMap.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }

  return pages.map((page) => {
    const ancestors = getAncestorChain(page);
    // Use the URL's last segment as the display name, or the full URL for root
    const getName = (p: Page) => {
      const parts = p.url.split("/").filter(Boolean);
      return parts.length > 0 ? parts[parts.length - 1].replace(/-/g, " ") : p.url;
    };

    return {
      ...page,
      navI: ancestors.length > 0 ? getName(ancestors[0]) : getName(page),
      navII: ancestors.length > 1 ? getName(ancestors[1]) : ancestors.length > 0 ? getName(page) : null,
      navIII: ancestors.length > 2 ? getName(ancestors[2]) : ancestors.length > 1 ? getName(page) : null,
    };
  });
}

/**
 * Generates an XML sitemap string from pages and a domain.
 * Outputs standard sitemap protocol (sitemaps.org/schemas/sitemap/0.9).
 */
export function pagesToSitemapXml(pages: Page[], domain: string): string {
  const host = domain.replace(/\/+$/, "");
  const protocol = host.startsWith("http") ? "" : "https://";

  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  const urls = pages.map((p) => {
    const loc = p.url === "/" ? `${protocol}${host}/` : `${protocol}${host}${p.url}`;
    return `  <url>\n    <loc>${esc(loc)}</loc>\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
