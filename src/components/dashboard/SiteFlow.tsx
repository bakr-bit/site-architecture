"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { cn } from "@/lib/utils";
import type { Page, PillarColor } from "@/lib/tree-helpers";

interface SiteFlowProps {
  pages: Page[];
  pillarColors: Map<string, PillarColor>;
  iconMap: Map<string, string>;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddChild: (parentId: string | null) => void;
}

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

const NODE_WIDTH = 280;
const NODE_HEIGHT = 80;

function pagesToFlow(
  pages: Page[],
  selectedPageId: string | null,
  onAddChild: (parentId: string | null) => void,
  pillarColors: Map<string, PillarColor>,
  iconMap: Map<string, string>
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  for (const page of pages) {
    g.setNode(page.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edges: Edge[] = [];
  for (const page of pages) {
    if (page.parentId && pages.some((p) => p.id === page.parentId)) {
      g.setEdge(page.parentId, page.id);
      edges.push({
        id: `e-${page.parentId}-${page.id}`,
        source: page.parentId,
        target: page.id,
        type: "smoothstep",
        style: { stroke: "#a1a1aa", strokeWidth: 2 },
      });
    }
  }

  dagre.layout(g);

  const nodes: Node[] = pages.map((page) => {
    const pos = g.node(page.id);
    return {
      id: page.id,
      type: "page",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { page, selected: page.id === selectedPageId, onAddChild, pillarColor: pillarColors.get(page.id), resolvedIcon: iconMap.get(page.id) },
    };
  });

  return { nodes, edges };
}

function PageNode({ data }: NodeProps) {
  const { page, selected, onAddChild, pillarColor, resolvedIcon } = data as {
    page: Page;
    selected: boolean;
    onAddChild: (parentId: string | null) => void;
    pillarColor?: PillarColor;
    resolvedIcon?: string;
  };
  const hasParent = page.parentId !== null;

  return (
    <div className="group relative">
      {hasParent && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-zinc-400 !border-zinc-500 !w-2 !h-2"
        />
      )}
      <div
        className={cn(
          "border border-zinc-300 rounded-lg px-4 py-3 w-[280px] shadow-sm transition-shadow",
          pillarColor?.bg || "bg-white",
          selected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"
        )}
      >
        <div className="font-mono text-sm text-zinc-900 truncate mb-1.5 flex items-center gap-1.5">
          {resolvedIcon && <span className="text-base shrink-0">{resolvedIcon}</span>}
          <span className="truncate">{page.url}</span>
        </div>
        <div className="flex items-center gap-2">
          {page.pageType && (
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                pillarColor?.badge || TYPE_COLORS[page.pageType] || "bg-zinc-100 text-zinc-700"
              )}
            >
              {page.pageType}
            </span>
          )}
          {page.keyword && page.keyword.split(",").slice(0, 2).map((kw, i) => (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/60 text-[10px] text-zinc-500 truncate max-w-[80px]">
              {kw.trim()}
            </span>
          ))}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-400 !border-zinc-500 !w-2 !h-2"
      />
      {/* Add child button below node */}
      <button
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white shadow-md hover:bg-zinc-700 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onAddChild(page.id);
        }}
        title="Add child page"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const nodeTypes: NodeTypes = { page: PageNode };

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function SiteFlow({
  pages,
  pillarColors,
  iconMap,
  selectedPageId,
  onSelectPage,
  onAddChild,
}: SiteFlowProps) {
  const { nodes, edges } = useMemo(
    () => pagesToFlow(pages, selectedPageId, onAddChild, pillarColors, iconMap),
    [pages, selectedPageId, onAddChild, pillarColors, iconMap]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectPage(node.id);
    },
    [onSelectPage]
  );

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-zinc-500 mb-4">
          No pages yet. Add your first page or import from CSV.
        </p>
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
    <div className="rounded-lg border bg-white h-full" style={{ minHeight: "calc(100vh - 220px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.1, minZoom: 0.1 , maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1.5} color="#d4d4d8" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
