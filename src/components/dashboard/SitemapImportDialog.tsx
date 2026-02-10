"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SitemapImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface SitemapPage {
  url: string;
  metaTitle: string;
  parentUrl: string | null;
  level: number;
  pageType: string | null;
}

export function SitemapImportDialog({ open, onOpenChange, projectId, onSuccess }: SitemapImportDialogProps) {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [pages, setPages] = useState<SitemapPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");

  async function handleFetch() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/pages/import-sitemap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sitemapUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to fetch sitemap");
        return;
      }

      setPages(data.pages);
      setStep("preview");
    } catch {
      setError("Failed to fetch sitemap");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/pages/import-sitemap?confirm=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sitemapUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to import pages");
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
    setSitemapUrl("");
    setStep("input");
    setPages([]);
    setError("");
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Sitemap</DialogTitle>
          <DialogDescription>
            Enter a sitemap URL to discover pages and import them with their hierarchy.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {step === "input" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sitemap URL</Label>
              <Input
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                type="url"
              />
            </div>
            <p className="text-xs text-zinc-400">
              Supports standard sitemaps and sitemap index files.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleFetch} disabled={!sitemapUrl.trim() || loading}>
                {loading ? "Fetching..." : "Fetch"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600">
              Found <strong>{pages.length}</strong> pages to import:
            </div>
            <div className="rounded-md border max-h-80 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                {pages.map((page, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs py-0.5"
                    style={{ paddingLeft: `${page.level * 20}px` }}
                  >
                    <span className="text-zinc-400 shrink-0">
                      {page.level > 0 ? "└" : "•"}
                    </span>
                    <span className="text-zinc-900 font-medium truncate">
                      {page.metaTitle}
                    </span>
                    {page.pageType === "Home Page" && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
                        Homepage
                      </span>
                    )}
                    <span className="text-zinc-400 font-mono truncate">
                      {page.url}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${pages.length} Pages`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
