"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageTable } from "@/components/dashboard/PageTable";
import { SiteTree } from "@/components/dashboard/SiteTree";
import { SiteFlow } from "@/components/dashboard/SiteFlow";
import { PageDialog } from "@/components/dashboard/PageDialog";
import { PagePanel } from "@/components/dashboard/PagePanel";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { SitemapImportDialog } from "@/components/dashboard/SitemapImportDialog";
import { GenerateDialog } from "@/components/dashboard/GenerateDialog";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { pagesToCsv, pagesToSitemapXml, getPillarColorMap, getIconMap } from "@/lib/tree-helpers";
import type { PillarColor } from "@/lib/tree-helpers";
import { toast } from "sonner";

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
  position: number;
  parentId: string | null;
}

interface Project {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  pages: Page[];
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "tree" | "flow">("tree");
  const [search, setSearch] = useState("");
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [sitemapDialogOpen, setSitemapDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  // Tree-specific state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"edit" | "create" | null>(null);
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);

  const selectedPage = project?.pages.find((p) => p.id === selectedPageId) || null;

  const pillarColors = useMemo(
    () => getPillarColorMap(project?.pages || []),
    [project?.pages]
  );

  const iconMap = useMemo(
    () => getIconMap(project?.pages || []),
    [project?.pages]
  );

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        setProject(await res.json());
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function handleDeletePage(pageId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${pageId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Page deleted");
        // Close panel if the deleted page was selected
        if (selectedPageId === pageId) {
          setSelectedPageId(null);
          setPanelMode(null);
        }
        loadProject();
      } else {
        toast.error("Failed to delete page");
      }
    } catch {
      toast.error("Failed to delete page");
    }
  }

  async function handleDeletePageWithConfirm(pageId: string) {
    if (!confirm("Delete this page?")) return;
    handleDeletePage(pageId);
  }

  // Table view: edit via modal dialog
  function handleEditPageDialog(page: Page) {
    setEditingPage(page);
    setPageDialogOpen(true);
  }

  // Tree view: select page → open side panel
  function handleSelectPage(pageId: string) {
    setSelectedPageId(pageId);
    setPanelMode("edit");
    setNewPageParentId(null);
  }

  // Tree view: "+" button → create child
  function handleAddChild(parentId: string | null) {
    setSelectedPageId(null);
    setNewPageParentId(parentId);
    setPanelMode("create");
  }

  // Close side panel
  function handleClosePanel() {
    setSelectedPageId(null);
    setPanelMode(null);
    setNewPageParentId(null);
  }

  // After save in side panel
  function handlePanelSave() {
    loadProject();
    toast.success(panelMode === "create" ? "Page added" : "Page updated");
    if (panelMode === "create") {
      setPanelMode(null);
      setNewPageParentId(null);
    }
  }

  // After delete in side panel
  function handlePanelDelete(pageId: string) {
    handleDeletePage(pageId);
  }

  const filteredPages = useMemo(() => {
    if (!project?.pages) return [];
    if (!search) return project.pages;
    const q = search.toLowerCase();
    return project.pages.filter((page) =>
      page.url.toLowerCase().includes(q) ||
      page.metaTitle?.toLowerCase().includes(q) ||
      page.keyword?.toLowerCase().includes(q) ||
      page.userDescription?.toLowerCase().includes(q) ||
      page.pageType?.toLowerCase().includes(q)
    );
  }, [project?.pages, search]);

  if (loading) {
    return <div className="text-zinc-500">Loading...</div>;
  }

  if (!project) {
    return <div className="text-zinc-500">Project not found.</div>;
  }

  const showPanel = (view === "tree" || view === "flow") && panelMode !== null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
            <p className="text-sm text-zinc-500">{project.domain}</p>
          </div>
          <div className="text-sm text-zinc-400">
            {project.pages.length} page{project.pages.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
            AI Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSitemapDialogOpen(true)}>
            Import Sitemap
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}>
            Import CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!project || project.pages.length === 0}>
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                if (!project || project.pages.length === 0) return;
                const csv = pagesToCsv(project.pages);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.domain || project.name}-pages.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                As CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!project || project.pages.length === 0) return;
                const xml = pagesToSitemapXml(project.pages, project.domain);
                const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.domain || project.name}-sitemap.xml`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                As XML Sitemap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {view === "table" && (
            <Button size="sm" onClick={() => { setEditingPage(null); setPageDialogOpen(true); }}>
              Add Page
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === "table" ? (
          <PageTable
            pages={filteredPages}
            pillarColors={pillarColors}
            iconMap={iconMap}
            onEdit={handleEditPageDialog}
            onDelete={handleDeletePageWithConfirm}
          />
        ) : view === "flow" ? (
          <div className="flex h-full gap-0">
            <div className="flex-1 min-w-0">
              <SiteFlow
                pages={filteredPages}
                pillarColors={pillarColors}
                iconMap={iconMap}
                selectedPageId={selectedPageId}
                onSelectPage={handleSelectPage}
                onAddChild={handleAddChild}
              />
            </div>
            {showPanel && (
              <PagePanel
                page={panelMode === "edit" ? selectedPage : null}
                parentId={panelMode === "create" ? newPageParentId : undefined}
                projectId={projectId}
                onClose={handleClosePanel}
                onSave={handlePanelSave}
                onDelete={handlePanelDelete}
              />
            )}
          </div>
        ) : (
          <div className="flex h-full gap-0">
            <div className="flex-1 min-w-0">
              <SiteTree
                pages={filteredPages}
                pillarColors={pillarColors}
                iconMap={iconMap}
                selectedPageId={selectedPageId}
                onSelectPage={handleSelectPage}
                onAddChild={handleAddChild}
                onDelete={handleDeletePageWithConfirm}
                onReorder={loadProject}
                projectId={projectId}
              />
            </div>
            {showPanel && (
              <PagePanel
                page={panelMode === "edit" ? selectedPage : null}
                parentId={panelMode === "create" ? newPageParentId : undefined}
                projectId={projectId}
                onClose={handleClosePanel}
                onSave={handlePanelSave}
                onDelete={handlePanelDelete}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialogs (table view only) */}
      <PageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        page={editingPage}
        projectId={projectId}
        onSuccess={() => {
          loadProject();
          toast.success(editingPage ? "Page updated" : "Page added");
        }}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          loadProject();
          toast.success("Pages imported successfully");
        }}
      />

      <SitemapImportDialog
        open={sitemapDialogOpen}
        onOpenChange={setSitemapDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          loadProject();
          toast.success("Sitemap imported successfully");
        }}
      />

      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          loadProject();
          toast.success("Architecture generated");
        }}
      />
    </div>
  );
}
