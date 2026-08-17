"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import pkg from "../../package.json";
import {
  IconGrid,
  IconSwords,
  IconChart,
  IconShield,
  IconUser,
  IconMap,
  IconTrophy,
  IconBracket,
  IconHistory,
} from "./nav-icons";

const NAV = [
  { href: "/", label: "Dashboard", icon: IconGrid },
  { href: "/matches", label: "Matches", icon: IconSwords },
  { href: "/predictions", label: "Predictions", icon: IconChart },
  { href: "/teams", label: "Teams", icon: IconShield },
  { href: "/players", label: "Players", icon: IconUser },
  { href: "/maps", label: "Maps", icon: IconMap },
  { href: "/rankings", label: "Rankings", icon: IconTrophy },
  { href: "/tournaments", label: "Tournaments", icon: IconBracket },
  { href: "/prediction-history", label: "Prediction History", icon: IconHistory },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-bg-elevated/40 md:h-screen md:sticky md:top-0">
        <div className="px-5 pt-6 pb-5">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-display text-xl tracking-wide text-team-a">VCT</span>
            <span className="font-display text-xl tracking-wide text-text">PREDICTS</span>
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-text-faint">Match center &amp; prediction engine</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-bg-elevated-2 text-text" : "text-text-dim hover:bg-bg-elevated-2/60 hover:text-text"
                }`}
              >
                <span className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-team-a" : "bg-transparent"}`} />
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-team-a" : "text-text-faint group-hover:text-text-dim"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-[11px] text-text-faint border-t border-border-soft">
          <p>Datos: VLR.gg · actualización automática</p>
          <p className="mt-1 font-data text-text-faint">v{pkg.version}</p>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around border-t border-border bg-bg-elevated/95 backdrop-blur px-1 py-1.5">
        {NAV.slice(0, 5).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? "text-team-a" : "text-text-faint"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
