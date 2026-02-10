"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Tree, NodeRendererProps, NodeApi } from "react-arborist";
import { cn } from "@/lib/utils";
import { flatToTree, treeToFlat, rewriteUrls } from "@/lib/tree-helpers";
import type { Page, TreeNode, PillarColor } from "@/lib/tree-helpers";

export type { Page };

interface SiteTreeProps {
  pages: Page[];
  pillarColors: Map<string, PillarColor>;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddChild: (parentId: string | null) => void;
  onDelete: (pageId: string) => void;
  onReorder?: () => void;
  projectId: string;
}

const TYPE_COLORS: Record<string, string> = {
  "Home Page": "bg-green-100 text-green-700",
  "Pillar Page": "bg-purple-100 text-purple-700",
  "Index Page": "bg-sky-100 text-sky-700",
  "Standard Page": "bg-zinc-100 text-zinc-700",
  "Blog Post": "bg-emerald-100 text-emerald-700",
  "Landing Page": "bg-orange-100 text-orange-700",
  "Resource Page": "bg-teal-100 text-teal-700",
  "FAQ Page": "bg-yellow-100 text-yellow-700",
  "Contact Page": "bg-pink-100 text-pink-700",
};

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90", className)} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function Node({ node, style, dragHandle, tree }: NodeRendererProps<TreeNode>) {
  const page = node.data.data;
  const { onSelectPage, onAddChild, selectedPageId, pillarColors } = tree.props as unknown as {
    onSelectPage: (id: string) => void;
    onAddChild: (parentId: string | null) => void;
    selectedPageId: string | null;
    pillarColors: Map<string, PillarColor>;
  };
  const isSelected = selectedPageId === node.id;
  const pillarColor = pillarColors.get(node.id);

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "flex items-center gap-1.5 py-0.5 px-2 rounded cursor-pointer group transition-colors",
        isSelected ? "ring-1 ring-zinc-300" : "",
        !isSelected && pillarColor?.bg,
        !isSelected && !pillarColor?.bg && "hover:bg-zinc-50",
        node.state.isDragging && "opacity-40",
        node.state.willReceiveDrop && "bg-blue-50 ring-1 ring-blue-300"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectPage(node.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelectPage(node.id);
      }}
    >
      {/* Expand/collapse toggle */}
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 shrink-0",
          node.isLeaf && "invisible"
        )}
        onClick={(e) => {
          e.stopPropagation();
          node.toggle();
        }}
      >
        <ChevronIcon open={node.isOpen} />
      </span>

      {/* Page URL */}
      <span className="font-mono text-xs text-zinc-600 truncate max-w-[240px]">
        {page.url}
      </span>

      {/* Page type badge */}
      {page.pageType && (
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
          pillarColors.get(node.id)?.badge || TYPE_COLORS[page.pageType] || "bg-zinc-100 text-zinc-700"
        )}>
          {page.pageType}
        </span>
      )}

      {/* Keyword */}
      {page.keyword && (
        <span className="text-xs text-zinc-400 truncate max-w-[120px]">
          {page.keyword}
        </span>
      )}

      {/* Add child button (visible on hover) */}
      <button
        className="ml-auto opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded hover:bg-zinc-200 transition-all shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onAddChild(node.id);
        }}
        title="Add child page"
      >
        <PlusIcon className="h-3.5 w-3.5 text-zinc-500" />
      </button>
    </div>
  );
}

export function SiteTree({
  pages,
  pillarColors,
  selectedPageId,
  onSelectPage,
  onAddChild,
  onDelete,
  onReorder,
  projectId,
}: SiteTreeProps) {
  const treeRef = useRef<any>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [undoStack, setUndoStack] = useState<TreeNode[][]>([]);
  const prevPagesKey = useRef("");

  useEffect(() => {
    // Only reset tree when the actual page data changes, not on every render.
    // This prevents drag-and-drop from being reverted by unrelated re-renders.
    const key = pages.map((p) => `${p.id}:${p.parentId}:${p.position}`).join("|");
    if (key === prevPagesKey.current) return;
    prevPagesKey.current = key;
    setTreeData(flatToTree(pages));
    setUndoStack([]);
  }, [pages]);

  const handleMove = useCallback(
    async ({
      dragIds,
      parentId,
      index,
    }: {
      dragIds: string[];
      parentId: string | null;
      parentNode: NodeApi<TreeNode> | null;
      index: number;
    }) => {
      // Save current state for undo before mutating
      setUndoStack((prev) => [...prev, treeData]);

      const dragIdSet = new Set(dragIds);

      // Deep-clone the tree so we can mutate it
      function cloneTree(nodes: TreeNode[]): TreeNode[] {
        return nodes.map((n) => ({
          ...n,
          children: n.children ? cloneTree(n.children) : [],
        }));
      }

      const newTree = cloneTree(treeData);

      // Remove dragged nodes from their current positions, collecting them
      const extracted: TreeNode[] = [];

      function removeNodes(nodes: TreeNode[]): TreeNode[] {
        const remaining: TreeNode[] = [];
        for (const node of nodes) {
          if (dragIdSet.has(node.id)) {
            extracted.push(node);
          } else {
            remaining.push({ ...node, children: node.children ? removeNodes(node.children) : [] });
          }
        }
        return remaining;
      }

      const treeAfterRemoval = removeNodes(newTree);

      // Find the target parent's children array and insert at the given index
      function findChildren(nodes: TreeNode[], targetId: string | null): TreeNode[] | null {
        if (targetId === null) return nodes;
        for (const node of nodes) {
          if (node.id === targetId) return node.children || (node.children = []);
          if (node.children) {
            const found = findChildren(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      }

      const targetChildren = findChildren(treeAfterRemoval, parentId);
      if (!targetChildren) return;

      // Clamp index to valid range and insert
      const insertAt = Math.min(index, targetChildren.length);
      targetChildren.splice(insertAt, 0, ...extracted);

      // Rewrite URLs of moved nodes to reflect new parent path
      function findNodeUrl(nodes: TreeNode[], id: string): string | null {
        for (const n of nodes) {
          if (n.id === id) return n.data.url;
          if (n.children) {
            const found = findNodeUrl(n.children, id);
            if (found) return found;
          }
        }
        return null;
      }
      const newParentUrl = parentId ? findNodeUrl(treeAfterRemoval, parentId) : null;
      rewriteUrls(extracted, newParentUrl);

      // Update state immediately so react-arborist re-renders with the new tree
      setTreeData(treeAfterRemoval);

      // Persist to the backend
      const items = treeToFlat(treeAfterRemoval);
      try {
        await fetch(`/api/projects/${projectId}/pages/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        // Refresh parent state so other views stay in sync
        onReorder?.();
      } catch (err) {
        console.error("Failed to persist reorder:", err);
      }
    },
    [projectId, treeData, onReorder]
  );

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setTreeData(previous);

    const items = treeToFlat(previous);
    try {
      await fetch(`/api/projects/${projectId}/pages/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      onReorder?.();
    } catch (err) {
      console.error("Failed to persist undo:", err);
    }
  }, [undoStack, projectId, onReorder]);

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-zinc-500 mb-4">No pages yet. Add your first page or import from CSV.</p>
        <button
          onClick={() => onAddChild(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-700 rounded-md border hover:bg-zinc-50 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Page
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      {/* Root-level add button */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Site Structure
        </span>
        <div className="flex items-center gap-2">
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
              title="Undo last move"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              Undo
            </button>
          )}
          <button
            onClick={() => onAddChild(null)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
            title="Add root page"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Page
          </button>
        </div>
      </div>

      <div className="p-2">
        <Tree
          ref={treeRef}
          data={treeData}
          onMove={handleMove}
          openByDefault={true}
          width="100%"
          height={Math.min(Math.max(pages.length * 32, 200), 600)}
          indent={24}
          rowHeight={32}
          paddingTop={4}
          paddingBottom={4}
          disableEdit={true}
          selection={selectedPageId || undefined}
          {...({
            onSelectPage,
            onAddChild,
            selectedPageId,
            pillarColors,
          } as any)}
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}
