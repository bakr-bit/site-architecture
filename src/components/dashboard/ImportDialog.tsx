"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface ParsedRow {
  url: string;
  userDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  keyword?: string;
  pageType?: string;
  level?: number;
  navI?: string;
  navII?: string;
  navIII?: string;
  notes?: string;
}

const HEADER_MAP: Record<string, string> = {
  url: "url",
  path: "url",
  slug: "url",
  description: "userDescription",
  "user description": "userDescription",
  "page description": "userDescription",
  "meta title": "metaTitle",
  metatitle: "metaTitle",
  title: "metaTitle",
  "meta description": "metaDescription",
  metadescription: "metaDescription",
  keyword: "keyword",
  keywords: "keyword",
  "target keyword": "keyword",
  "target keywords": "keyword",
  "page type": "pageType",
  pagetype: "pageType",
  type: "pageType",
  level: "level",
  lvl: "level",
  "nav i": "navI",
  "nav 1": "navI",
  navi: "navI",
  "nav ii": "navII",
  "nav 2": "navII",
  navii: "navII",
  "nav iii": "navIII",
  "nav 3": "navIII",
  naviii: "navIII",
  notes: "notes",
  note: "notes",
};

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0];
  if (firstLine.includes("\t")) return "\t";
  if (firstLine.split(",").length > firstLine.split(";").length) return ",";
  return ";";
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(text);
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

  const fieldMap = headers.map((h) => HEADER_MAP[h] || null);

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, unknown> = {};

    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      if (field && values[j]) {
        if (field === "level") {
          const num = parseInt(values[j]);
          if (!isNaN(num)) row[field] = num;
        } else {
          row[field] = values[j];
        }
      }
    }

    if (row.url) {
      rows.push(row as unknown as ParsedRow);
    }
  }

  return rows;
}

export function ImportDialog({ open, onOpenChange, projectId, onSuccess }: ImportDialogProps) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");

  function handlePreview() {
    setError("");
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      setError("No valid rows found. Make sure the first row contains headers and at least one column maps to URL.");
      return;
    }
    setPreview(rows.slice(0, 5));
    setTotalCount(rows.length);
    setStep("preview");
  }

  async function handleImport() {
    setLoading(true);
    setError("");

    try {
      const rows = parseCSV(csvText);
      const res = await fetch(`/api/projects/${projectId}/pages/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: rows }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to import pages");
        return;
      }

      onOpenChange(false);
      setCsvText("");
      setStep("input");
      setPreview([]);
      onSuccess();
    } catch {
      setError("Failed to import pages");
    } finally {
      setLoading(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setCsvText("");
      setStep("input");
      setPreview([]);
      setError("");
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Pages from CSV</DialogTitle>
          <DialogDescription>
            Paste CSV or TSV data from Google Sheets. The first row should be headers.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {step === "input" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CSV/TSV Data</Label>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`URL\tMeta Title\tKeyword\tPage Type\tLevel\tNav I\tNav II\n/about\tAbout Us\tabout us\tStandard Page\t1\tAbout\t\n/services\tOur Services\tservices\tIndex Page\t1\tServices\t`}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-zinc-400">
              Supported headers: URL, Description, Meta Title, Meta Description, Keyword, Page Type, Level, Nav I, Nav II, Nav III, Notes
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!csvText.trim()}>
                Preview
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600">
              Found <strong>{totalCount}</strong> rows to import. Preview:
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-zinc-50 border-b">
                    <th className="px-2 py-1.5 text-left font-medium">URL</th>
                    <th className="px-2 py-1.5 text-left font-medium">Type</th>
                    <th className="px-2 py-1.5 text-left font-medium">Lvl</th>
                    <th className="px-2 py-1.5 text-left font-medium">Nav I</th>
                    <th className="px-2 py-1.5 text-left font-medium">Keyword</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-1.5 font-mono">{row.url}</td>
                      <td className="px-2 py-1.5">{row.pageType || "—"}</td>
                      <td className="px-2 py-1.5">{row.level ?? "—"}</td>
                      <td className="px-2 py-1.5">{row.navI || "—"}</td>
                      <td className="px-2 py-1.5">{row.keyword || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalCount > 5 && (
              <p className="text-xs text-zinc-400">...and {totalCount - 5} more rows</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Importing..." : `Import ${totalCount} Pages`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
