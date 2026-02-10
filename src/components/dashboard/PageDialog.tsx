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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PAGE_TYPES } from "@/lib/validations";

interface Page {
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
  parentId: string | null;
}

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page | null;
  projectId: string;
  onSuccess: () => void;
}

export function PageDialog({ open, onOpenChange, page, projectId, onSuccess }: PageDialogProps) {
  const [url, setUrl] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pageType, setPageType] = useState("");
  const [icon, setIcon] = useState("");
  const [level, setLevel] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (page) {
      setUrl(page.url);
      setUserDescription(page.userDescription || "");
      setMetaTitle(page.metaTitle || "");
      setMetaDescription(page.metaDescription || "");
      setKeyword(page.keyword || "");
      setPageType(page.pageType || "");
      setIcon(page.icon || "");
      setLevel(String(page.level));
      setNotes(page.notes || "");
    } else {
      setUrl("");
      setUserDescription("");
      setMetaTitle("");
      setMetaDescription("");
      setKeyword("");
      setPageType("");
      setIcon("");
      setLevel("0");
      setNotes("");
    }
    setError("");
  }, [page, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = page
        ? `/api/projects/${projectId}/pages/${page.id}`
        : `/api/projects/${projectId}/pages`;
      const method = page ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        url,
        level: parseInt(level),
      };
      if (userDescription) body.userDescription = userDescription;
      if (metaTitle) body.metaTitle = metaTitle;
      if (metaDescription) body.metaDescription = metaDescription;
      if (keyword) body.keyword = keyword;
      if (pageType) body.pageType = pageType;
      if (icon) body.icon = icon;
      else if (page?.icon) body.icon = null;
      if (notes) body.notes = notes;

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

      onOpenChange(false);
      onSuccess();
    } catch {
      setError("Failed to save page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "Add Page"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Core */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Core</h3>
            <div className="space-y-2">
              <Label htmlFor="page-url">URL</Label>
              <Input
                id="page-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/about"
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-description">Description</Label>
              <Input
                id="page-description"
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder="What is this page about?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-keyword">Target Keywords</Label>
              <Input
                id="page-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="keyword one, keyword two"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">SEO</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="page-meta-title">Meta Title</Label>
                <span className="text-xs text-zinc-400">{metaTitle.length}/60</span>
              </div>
              <Input
                id="page-meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page Title - Site Name"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="page-meta-desc">Meta Description</Label>
                <span className="text-xs text-zinc-400">{metaDescription.length}/160</span>
              </div>
              <Textarea
                id="page-meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="A brief description of this page..."
                rows={2}
              />
            </div>
          </div>

          {/* Structure */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Structure</h3>
            <div className="space-y-2">
              <Label htmlFor="page-icon">Icon</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="page-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🏠"
                  className="w-20"
                />
                <span className="text-xs text-zinc-400">Emoji — children inherit if empty</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page Type</Label>
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
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Level 0</SelectItem>
                    <SelectItem value="1">Level 1</SelectItem>
                    <SelectItem value="2">Level 2</SelectItem>
                    <SelectItem value="3">Level 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : page ? "Update" : "Add Page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
