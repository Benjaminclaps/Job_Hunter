"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BriefcaseBusiness, Building2, Compass, LayoutDashboard, Settings, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  ["Overview", "/", LayoutDashboard],
  ["Discover", "/discover", Compass],
  ["Recommended", "/recommended", Sparkles],
  ["Applications", "/applications", BriefcaseBusiness],
  ["Companies", "/companies", Building2],
  ["My Profile", "/profile", UserRound],
  ["Activity", "/activity", Activity],
  ["Settings", "/settings", Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#f7f7f6] text-neutral-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-neutral-200 bg-[#fbfbfa] px-3 py-5 lg:flex lg:flex-col">
        <div className="mb-7 flex items-center gap-3 px-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-950 text-sm font-semibold text-white">JH</div>
          <div><p className="text-sm font-semibold">Job Hunter AI</p><p className="text-xs text-neutral-500">Local workspace</p></div>
        </div>
        <nav className="space-y-1">
          {navigation.map(([label, href, Icon]) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", active ? "bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900")}><Icon className="size-4" />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-500">
          <div className="mb-1 flex items-center gap-2 font-medium text-neutral-700"><span className="size-2 rounded-full bg-emerald-500" />Datos locales</div>
          SQLite es la única fuente de verdad.
        </div>
      </aside>
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-[#fbfbfa]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center gap-2 font-semibold"><div className="flex size-8 items-center justify-center rounded-lg bg-neutral-950 text-xs text-white">JH</div>Job Hunter AI</div>
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {navigation.map(([label, href]) => <Link key={href} href={href} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-xs", pathname === href ? "bg-neutral-900 text-white" : "bg-white text-neutral-600")}>{label}</Link>)}
        </nav>
      </header>
      <main className="min-h-screen lg:pl-60">{children}</main>
    </div>
  );
}
