"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanbanIcon },
];

function FolderKanbanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5M3.75 6h16.5M3.75 13.5h6m-6 3.75h6M13.5 13.5h3.75m-3.75 3.75h3.75M20.25 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6.75m16.5 0A2.25 2.25 0 0 0 18 4.5H6A2.25 2.25 0 0 0 3.75 6.75m16.5 0v0" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Site Architect</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
