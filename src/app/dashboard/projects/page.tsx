"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectDialog } from "@/components/dashboard/ProjectDialog";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  updatedAt: string;
  _count: { pages: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this project? All pages will be deleted.")) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Project deleted");
        loadProjects();
      } else {
        toast.error("Failed to delete project");
      }
    } catch {
      toast.error("Failed to delete project");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
        <Button onClick={() => { setEditingProject(null); setDialogOpen(true); }}>Add Project</Button>
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-zinc-500">No projects yet. Create your first one!</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${project.domain}&sz=32`}
                      alt=""
                      className="h-6 w-6 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500 mb-1">{project.domain}</p>
                  {project.description && (
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{project.description}</p>
                  )}
                  <p className="text-sm text-zinc-500 mb-4">
                    {project._count.pages} page{project._count.pages !== 1 ? "s" : ""}
                    {" · "}
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); setEditingProject(project); setDialogOpen(true); }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); handleDelete(project.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSuccess={() => {
          loadProjects();
          toast.success(editingProject ? "Project updated" : "Project created");
        }}
      />
    </div>
  );
}
