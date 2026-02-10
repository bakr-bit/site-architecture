"use client";

import { useState, useEffect } from "react";
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
import { PAGE_TYPES } from "@/lib/validations";

interface Page {
  id: string;
  url: string;
  userDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keyword: string | null;
  pageType: string | null;
  level: number;
  notes: string | null;
  position: number;
  parentId: string | null;
}

interface PagePanelProps {
  page: Page | null;
  parentId?: string | null;
  projectId: string;
  onClose: () => void;
  onSave: () => void;
  onDelete: (pageId: string) => void;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export function PagePanel({ page, parentId, projectId, onClose, onSave, onDelete }: PagePanelProps) {
  const [url, setUrl] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pageType, setPageType] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = !page;

  useEffect(() => {
    if (page) {
      setUrl(page.url);
      setUserDescription(page.userDescription || "");
      setMetaTitle(page.metaTitle || "");
      setMetaDescription(page.metaDescription || "");
      setKeyword(page.keyword || "");
      setPageType(page.pageType || "");
      setNotes(page.notes || "");
    } else {
      setUrl("");
      setUserDescription("");
      setMetaTitle("");
      setMetaDescription("");
      setKeyword("");
      // Auto-assign page type based on parent:
      // child → Standard Page, root-level → Pillar Page
      // (will upgrade to Home Page if user types "/" as URL)
      setPageType(parentId ? "Standard Page" : "Pillar Page");
      setNotes("");
    }
    setError("");
    setConfirmDelete(false);
  }, [page]);

  async function handleSave() {
    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = page
        ? `/api/projects/${projectId}/pages/${page.id}`
        : `/api/projects/${projectId}/pages`;
      const method = page ? "PUT" : "POST";

      const body: Record<string, unknown> = { url };
      if (userDescription) body.userDescription = userDescription;
      if (metaTitle) body.metaTitle = metaTitle;
      if (metaDescription) body.metaDescription = metaDescription;
      if (keyword) body.keyword = keyword;
      if (pageType) body.pageType = pageType;
      if (notes) body.notes = notes;

      // For new pages, set parentId
      if (isNew) {
        body.parentId = parentId ?? null;
      }

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to save page");
        return;
      }

      onSave();
    } catch {
      setError("Failed to save page");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    if (!page) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(page.id);
  }

  return (
    <div className="w-[400px] shrink-0 border-l bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 truncate">
            {isNew ? "New Page" : page.url}
          </h2>
          {!isNew && (
            <p className="text-xs text-zinc-400 mt-0.5">
              Level {page.level}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-zinc-100 transition-colors shrink-0"
        >
          <XIcon className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Core */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Core</h3>
          <div className="space-y-1.5">
            <Label htmlFor="panel-url" className="text-xs">URL</Label>
            <Input
              id="panel-url"
              value={url}
              onChange={(e) => {
                const v = e.target.value;
                setUrl(v);
                // Auto-set page type based on URL for new pages
                if (isNew) {
                  if (v.trim() === "/") {
                    setPageType("Home Page");
                  } else if (!parentId && pageType === "Home Page" && v.trim() !== "/") {
                    setPageType("Pillar Page");
                  }
                }
              }}
              placeholder="/about"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="panel-desc" className="text-xs">Description</Label>
            <Input
              id="panel-desc"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder="What is this page about?"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="panel-keyword" className="text-xs">Target Keywords</Label>
            <Input
              id="panel-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="keyword one, keyword two, keyword three"
              className="text-sm"
            />
            <p className="text-[10px] text-zinc-400">Comma-separated</p>
          </div>
        </div>

        {/* SEO */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">SEO</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="panel-meta-title" className="text-xs">Meta Title</Label>
              <span className="text-[10px] text-zinc-400">{metaTitle.length}/60</span>
            </div>
            <Input
              id="panel-meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Page Title - Site Name"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="panel-meta-desc" className="text-xs">Meta Description</Label>
              <span className="text-[10px] text-zinc-400">{metaDescription.length}/160</span>
            </div>
            <Textarea
              id="panel-meta-desc"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A brief description of this page..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        {/* Structure */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Structure</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Page Type</Label>
            <Select value={pageType} onValueChange={setPageType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isNew && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Level (from tree depth)</Label>
              <div className="text-sm text-zinc-600 px-3 py-1.5 rounded-md bg-zinc-50 border">
                Level {page.level}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
            rows={3}
            className="text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 space-y-2">
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : isNew ? "Create Page" : "Save Changes"}
        </Button>
        {!isNew && (
          <Button
            variant={confirmDelete ? "destructive" : "outline"}
            className="w-full"
            onClick={handleDelete}
          >
            {confirmDelete ? "Confirm Delete" : "Delete Page"}
          </Button>
        )}
      </div>
    </div>
  );
}
