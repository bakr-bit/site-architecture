"use client";

import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "table" | "tree" | "flow";
  onViewChange: (view: "table" | "tree" | "flow") => void;
}

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 1 0 3 3m-3-3a3 3 0 0 1 3 3m0 0h6a3 3 0 0 0 3-3V9m0 0a3 3 0 1 0-3-3m3 3a3 3 0 0 1-3-3m0 0V3" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m8.625 0h7.5m-15 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-17.25m0 0h7.5c.621 0 1.125-.504 1.125-1.125M3.375 15.75c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m8.625 3.75c.621 0 1.125-.504 1.125-1.125M12 15.75c-.621 0-1.125-.504-1.125-1.125m0 0v-1.5" />
    </svg>
  );
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border bg-white">
      <button
        onClick={() => onViewChange("tree")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors",
          view === "tree" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
        )}
      >
        <GitBranchIcon className="h-4 w-4" />
        Tree
      </button>
      <button
        onClick={() => onViewChange("flow")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-none transition-colors",
          view === "flow" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
        )}
      >
        <FlowIcon className="h-4 w-4" />
        Flow
      </button>
      <button
        onClick={() => onViewChange("table")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors",
          view === "table" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
        )}
      >
        <TableIcon className="h-4 w-4" />
        Table
      </button>
    </div>
  );
}
