"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface GeneratedPage {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keyword?: string;
  pageType?: string;
  userDescription?: string;
  level: number;
  parentUrl: string | null;
}

interface GenerateVersion {
  label: string;
  description: string;
  pages: GeneratedPage[];
}

interface GenerateMeta {
  domainsSearched: number;
  sitemapsFetched: number;
  totalCompetitorUrls: number;
}

const COUNTRIES = [
  // North America
  { value: "us", label: "US - United States" },
  { value: "ca", label: "CA - Canada" },
  { value: "mx", label: "MX - Mexico" },
  // Europe - Western
  { value: "gb", label: "GB - United Kingdom" },
  { value: "ie", label: "IE - Ireland" },
  { value: "fr", label: "FR - France" },
  { value: "de", label: "DE - Germany" },
  { value: "nl", label: "NL - Netherlands" },
  { value: "be", label: "BE - Belgium" },
  { value: "lu", label: "LU - Luxembourg" },
  { value: "at", label: "AT - Austria" },
  { value: "ch", label: "CH - Switzerland" },
  // Europe - Southern
  { value: "es", label: "ES - Spain" },
  { value: "pt", label: "PT - Portugal" },
  { value: "it", label: "IT - Italy" },
  { value: "gr", label: "GR - Greece" },
  { value: "mt", label: "MT - Malta" },
  // Europe - Northern
  { value: "se", label: "SE - Sweden" },
  { value: "dk", label: "DK - Denmark" },
  { value: "no", label: "NO - Norway" },
  { value: "fi", label: "FI - Finland" },
  { value: "is", label: "IS - Iceland" },
  // Europe - Central & Eastern
  { value: "pl", label: "PL - Poland" },
  { value: "cz", label: "CZ - Czech Republic" },
  { value: "sk", label: "SK - Slovakia" },
  { value: "hu", label: "HU - Hungary" },
  { value: "ro", label: "RO - Romania" },
  { value: "bg", label: "BG - Bulgaria" },
  { value: "hr", label: "HR - Croatia" },
  { value: "si", label: "SI - Slovenia" },
  { value: "ee", label: "EE - Estonia" },
  { value: "lv", label: "LV - Latvia" },
  { value: "lt", label: "LT - Lithuania" },
  // Oceania
  { value: "au", label: "AU - Australia" },
  { value: "nz", label: "NZ - New Zealand" },
  // Middle East
  { value: "ae", label: "AE - United Arab Emirates" },
  { value: "sa", label: "SA - Saudi Arabia" },
  { value: "il", label: "IL - Israel" },
  // Asia
  { value: "in", label: "IN - India" },
  { value: "sg", label: "SG - Singapore" },
  { value: "hk", label: "HK - Hong Kong" },
  { value: "jp", label: "JP - Japan" },
  { value: "kr", label: "KR - South Korea" },
  { value: "ph", label: "PH - Philippines" },
  { value: "my", label: "MY - Malaysia" },
  // South America
  { value: "br", label: "BR - Brazil" },
  { value: "ar", label: "AR - Argentina" },
  { value: "cl", label: "CL - Chile" },
  { value: "co", label: "CO - Colombia" },
  // Africa
  { value: "za", label: "ZA - South Africa" },
  { value: "ng", label: "NG - Nigeria" },
  { value: "ke", label: "KE - Kenya" },
];

const PAGE_TYPE_COLORS: Record<string, string> = {
  "Home Page": "bg-green-100 text-green-700",
  "Pillar Page": "bg-blue-100 text-blue-700",
  "Standard Page": "bg-zinc-100 text-zinc-700",
  "Blog Post": "bg-purple-100 text-purple-700",
  "Landing Page": "bg-amber-100 text-amber-700",
};

const PROGRESS_MESSAGES = [
  { delay: 0, text: "Searching for top competitors..." },
  { delay: 3000, text: "Fetching competitor sitemaps..." },
  { delay: 7000, text: "Generating 3 architecture versions..." },
  { delay: 15000, text: "Almost there..." },
];

const PILLAR_COLORS = [
  { badge: "bg-purple-100 text-purple-700", bg: "bg-purple-50" },
  { badge: "bg-sky-100 text-sky-700", bg: "bg-sky-50" },
  { badge: "bg-orange-100 text-orange-700", bg: "bg-orange-50" },
  { badge: "bg-teal-100 text-teal-700", bg: "bg-teal-50" },
  { badge: "bg-pink-100 text-pink-700", bg: "bg-pink-50" },
  { badge: "bg-amber-100 text-amber-700", bg: "bg-amber-50" },
  { badge: "bg-indigo-100 text-indigo-700", bg: "bg-indigo-50" },
  { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50" },
  { badge: "bg-rose-100 text-rose-700", bg: "bg-rose-50" },
  { badge: "bg-cyan-100 text-cyan-700", bg: "bg-cyan-50" },
];

const HOME_COLOR = { badge: "bg-green-100 text-green-700", bg: "bg-green-50" };

/**
 * Build a map from page URL → pillar color.
 * Pillars are level-1 pages (direct children of "/"). All descendants inherit.
 */
function getPillarColorsByUrl(
  pages: GeneratedPage[]
): Map<string, { badge: string; bg: string }> {
  const result = new Map<string, { badge: string; bg: string }>();

  // Find pillar URLs (direct children of home) in order
  const pillarUrls = pages
    .filter((p) => p.parentUrl === "/")
    .map((p) => p.url);

  // Assign each pillar a color
  const pillarColorMap = new Map<string, { badge: string; bg: string }>();
  for (let i = 0; i < pillarUrls.length; i++) {
    pillarColorMap.set(pillarUrls[i], PILLAR_COLORS[i % PILLAR_COLORS.length]);
  }

  // Walk up parentUrl to find the pillar ancestor
  const pageByUrl = new Map(pages.map((p) => [p.url, p]));
  const pillarSet = new Set(pillarUrls);

  function findPillar(url: string): string | null {
    let current = url;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) return null;
      visited.add(current);
      if (pillarSet.has(current)) return current;
      const page = pageByUrl.get(current);
      if (!page?.parentUrl) return null;
      current = page.parentUrl;
    }
    return null;
  }

  for (const page of pages) {
    if (page.url === "/" || page.parentUrl === null) {
      result.set(page.url, HOME_COLOR);
    } else {
      const pillar = findPillar(page.url);
      if (pillar) {
        result.set(page.url, pillarColorMap.get(pillar)!);
      }
    }
  }

  return result;
}

function PageTree({
  pages,
  parentUrl,
  depth,
  colorMap,
}: {
  pages: GeneratedPage[];
  parentUrl: string | null;
  depth: number;
  colorMap: Map<string, { badge: string; bg: string }>;
}) {
  // Match null, undefined, and "" as equivalent for root-level filtering
  const isRoot = parentUrl === null;
  const children = pages.filter((p) =>
    isRoot
      ? p.parentUrl === null || p.parentUrl === undefined || p.parentUrl === ""
      : p.parentUrl === parentUrl
  );

  // If root has no matches, fall back to showing all pages that have no valid parent
  const allParentUrls = new Set(pages.map((p) => p.url));
  const orphans = isRoot
    ? pages.filter(
        (p) =>
          p.parentUrl !== null &&
          p.parentUrl !== undefined &&
          p.parentUrl !== "" &&
          !allParentUrls.has(p.parentUrl) &&
          !children.includes(p)
      )
    : [];
  const displayChildren = [...children, ...orphans];

  return (
    <>
      {displayChildren.map((page, i) => {
        const color = colorMap.get(page.url);
        return (
          <div key={`${page.url}-${i}`}>
            <div
              className={`flex items-center gap-2 text-xs py-0.5 rounded ${color?.bg || ""}`}
              style={{ paddingLeft: `${depth * 20}px` }}
            >
              <span className="text-zinc-400 shrink-0">
                {depth > 0 ? "\u2514" : "\u2022"}
              </span>
              <span className="text-zinc-900 font-mono truncate">
                {page.url}
              </span>
              {page.pageType && (
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    color?.badge ||
                    PAGE_TYPE_COLORS[page.pageType] ||
                    "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {page.pageType}
                </span>
              )}
              {page.keyword && (
                <span className="text-zinc-400 truncate">{page.keyword}</span>
              )}
            </div>
            <PageTree
              pages={pages}
              parentUrl={page.url}
              depth={depth + 1}
              colorMap={colorMap}
            />
          </div>
        );
      })}
    </>
  );
}

export function GenerateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: GenerateDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [geo, setGeo] = useState("us");
  const [prompt, setPrompt] = useState("");
  const [sourceMode, setSourceMode] = useState<"search" | "reference">("reference");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [refUrlInput, setRefUrlInput] = useState("");
  const [versions, setVersions] = useState<GenerateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [meta, setMeta] = useState<GenerateMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<
    "input" | "researching" | "select" | "preview"
  >("input");
  const [progressText, setProgressText] = useState("");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pages = versions[selectedVersion]?.pages ?? [];
  const colorMap = useMemo(() => getPillarColorsByUrl(pages), [pages]);

  // Manage progress text timers
  useEffect(() => {
    if (step === "researching") {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      for (const msg of PROGRESS_MESSAGES) {
        const timer = setTimeout(() => setProgressText(msg.text), msg.delay);
        timersRef.current.push(timer);
      }
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [step]);

  function addReferenceUrl() {
    const trimmed = refUrlInput.trim();
    if (!trimmed || referenceUrls.length >= 10) return;
    if (referenceUrls.includes(trimmed)) {
      setRefUrlInput("");
      return;
    }
    setReferenceUrls([...referenceUrls, trimmed]);
    setRefUrlInput("");
  }

  function removeReferenceUrl(index: number) {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setStep("researching");

    try {
      const res = await fetch(`/api/projects/${projectId}/pages/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          geo,
          prompt,
          ...(sourceMode === "reference" && referenceUrls.length > 0
            ? { referenceUrls }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Generation failed"
        );
        setStep("input");
        return;
      }

      setVersions(data.versions);
      setMeta(data.meta);
      setSelectedVersion(0);

      if (data.versions.length === 1) {
        // Only one version succeeded — skip selection
        setStep("preview");
      } else {
        setStep("select");
      }
    } catch {
      setError("Failed to generate architecture");
      setStep("input");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/projects/${projectId}/pages/generate?confirm=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(
          typeof data.error === "string" ? data.error : "Import failed"
        );
        return;
      }

      onOpenChange(false);
      resetState();
      onSuccess();
    } catch {
      setError("Failed to import pages");
    } finally {
      setImporting(false);
    }
  }

  function resetState() {
    setKeyword("");
    setGeo("us");
    setPrompt("");
    setSourceMode("reference");
    setReferenceUrls([]);
    setRefUrlInput("");
    setVersions([]);
    setSelectedVersion(0);
    setMeta(null);
    setStep("input");
    setError("");
    setProgressText("");
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI Generate Architecture</DialogTitle>
          <DialogDescription>
            Research competitors and generate a site architecture with AI.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competitor Source</Label>
              <div className="flex gap-1 rounded-md border border-zinc-200 p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setSourceMode("reference")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    sourceMode === "reference"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Reference Websites
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("search")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    sourceMode === "search"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Auto Search
                </button>
              </div>
              {sourceMode === "search" && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Competitors will be discovered automatically from Google search results.
                  </p>
                  <div className="space-y-2">
                    <Label>Target Keyword</Label>
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g. pet insurance uk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={geo} onValueChange={setGeo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {sourceMode === "reference" && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">
                    Add competitor websites to use as reference for the architecture.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={refUrlInput}
                      onChange={(e) => setRefUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addReferenceUrl();
                        }
                      }}
                      placeholder="e.g. competitor.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReferenceUrl}
                      disabled={
                        !refUrlInput.trim() || referenceUrls.length >= 10
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {referenceUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {referenceUrls.map((url, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                        >
                          {url}
                          <button
                            type="button"
                            onClick={() => removeReferenceUrl(i)}
                            className="text-zinc-400 hover:text-zinc-600 ml-0.5"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="25 urls, medium site, typical pillar pages (bonus, payment), no reviews"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={
                  !prompt.trim() ||
                  loading ||
                  (sourceMode === "search" && !keyword.trim()) ||
                  (sourceMode === "reference" && referenceUrls.length === 0)
                }
              >
                Generate
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "researching" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            <p className="text-sm text-zinc-600 animate-pulse">
              {progressText}
            </p>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Choose an architecture version to preview
              {meta && meta.sitemapsFetched > 0 && (
                <>
                  {" "}
                  &mdash; built from{" "}
                  <strong>{meta.totalCompetitorUrls}</strong> competitor URLs
                  across <strong>{meta.sitemapsFetched}</strong> sitemaps
                </>
              )}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {versions.map((version, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedVersion(i);
                    setStep("preview");
                  }}
                  className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-900">
                      {version.label}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {version.pages.length} pages
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {version.description}
                  </span>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("input");
                  setVersions([]);
                  setMeta(null);
                }}
              >
                Back to input
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600">
              <strong>{versions[selectedVersion]?.label}</strong> &mdash;{" "}
              <strong>{pages.length}</strong> pages
              {meta && meta.sitemapsFetched > 0 && (
                <>
                  {" "}
                  from <strong>{meta.sitemapsFetched}</strong> competitor
                  sitemaps
                </>
              )}
            </div>
            <div className="rounded-md border max-h-80 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                <PageTree pages={pages} parentUrl={null} depth={0} colorMap={colorMap} />
              </div>
            </div>
            <DialogFooter>
              <div className="flex w-full items-center justify-between">
                <div className="flex gap-2">
                  {versions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("select")}
                    >
                      Back to versions
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("input");
                      setVersions([]);
                      setMeta(null);
                    }}
                  >
                    Back to input
                  </Button>
                </div>
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? "Importing..."
                    : `Import ${pages.length} Pages`}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
