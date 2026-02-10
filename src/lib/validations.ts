import { z } from "zod";

export const PAGE_TYPES = [
  "Home Page",
  "Pillar Page",
  "Index Page",
  "Standard Page",
  "Blog Post",
  "Landing Page",
  "Resource Page",
  "FAQ Page",
  "Contact Page",
] as const;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().min(1, "Domain is required"),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  domain: z.string().min(1, "Domain is required").optional(),
  description: z.string().optional(),
});

export const createPageSchema = z.object({
  url: z.string().min(1, "URL is required"),
  userDescription: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keyword: z.string().optional(),
  pageType: z.string().optional(),
  level: z.number().int().min(0).max(3).default(0),
  notes: z.string().optional(),
  position: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
  // Legacy nav fields accepted for CSV import compatibility
  navI: z.string().optional(),
  navII: z.string().optional(),
  navIII: z.string().optional(),
});

export const updatePageSchema = z.object({
  url: z.string().min(1, "URL is required").optional(),
  userDescription: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keyword: z.string().optional(),
  pageType: z.string().optional(),
  level: z.number().int().min(0).max(3).optional(),
  notes: z.string().optional(),
  position: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
});

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      parentId: z.string().nullable(),
      position: z.number().int(),
      url: z.string().optional(),
    })
  ).min(1),
});

export const importPagesSchema = z.object({
  pages: z.array(createPageSchema).min(1, "At least one page is required"),
});
