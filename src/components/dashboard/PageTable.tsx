"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeNavFields } from "@/lib/tree-helpers";
import type { Page, PillarColor } from "@/lib/tree-helpers";

interface PageTableProps {
  pages: Page[];
  pillarColors: Map<string, PillarColor>;
  iconMap: Map<string, string>;
  onEdit: (page: Page) => void;
  onDelete: (pageId: string) => void;
}

const LEVEL_COLORS: Record<number, string> = {
  0: "bg-zinc-100 text-zinc-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-amber-100 text-amber-700",
};

const TYPE_COLORS: Record<string, string> = {
  "Home Page": "bg-green-100 text-green-700",
  "Pillar Page": "bg-purple-100 text-purple-700",
  "Standard Page": "bg-zinc-100 text-zinc-700",
  "Blog Post": "bg-emerald-100 text-emerald-700",
  "Landing Page": "bg-orange-100 text-orange-700",
  "Index Page": "bg-purple-100 text-purple-700",
  "Resource Page": "bg-zinc-100 text-zinc-700",
  "FAQ Page": "bg-zinc-100 text-zinc-700",
  "Contact Page": "bg-zinc-100 text-zinc-700",
};

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

export function PageTable({ pages, pillarColors, iconMap, onEdit, onDelete }: PageTableProps) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No pages yet. Add your first page or import from CSV.
      </div>
    );
  }

  // Derive nav fields from parent chain
  const pagesWithNav = computeNavFields(pages);

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Meta Title</TableHead>
            <TableHead>Target Keywords</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="w-12">Lvl</TableHead>
            <TableHead>Nav I</TableHead>
            <TableHead>Nav II</TableHead>
            <TableHead>Nav III</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagesWithNav.map((page, index) => (
            <TableRow key={page.id}>
              <TableCell className="text-zinc-400 text-xs">{index + 1}</TableCell>
              <TableCell>
                <span className="font-mono text-xs max-w-[200px] truncate block">
                  {iconMap.get(page.id) && <span className="mr-1">{iconMap.get(page.id)}</span>}
                  {page.url}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm max-w-[180px] truncate block">{page.userDescription || "\u2014"}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm max-w-[180px] truncate block">{page.metaTitle || "\u2014"}</span>
              </TableCell>
              <TableCell>
                {page.keyword ? (
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {page.keyword.split(",").map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-600 truncate max-w-[100px]">
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                ) : "\u2014"}
              </TableCell>
              <TableCell>
                {page.pageType ? (
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    pillarColors.get(page.id)?.badge || TYPE_COLORS[page.pageType] || "bg-zinc-100 text-zinc-700"
                  )}>
                    {page.pageType}
                  </span>
                ) : "\u2014"}
              </TableCell>
              <TableCell>
                <span className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium",
                  LEVEL_COLORS[page.level] || LEVEL_COLORS[0]
                )}>
                  {page.level}
                </span>
              </TableCell>
              <TableCell className="text-sm">{page.navI || "\u2014"}</TableCell>
              <TableCell className="text-sm">{page.navII || "\u2014"}</TableCell>
              <TableCell className="text-sm">{page.navIII || "\u2014"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(page)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(page.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
