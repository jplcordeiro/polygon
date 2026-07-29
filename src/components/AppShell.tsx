import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, FileText, LogOut, Map, Menu, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function HexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path
        d="M20 34 L50 20 L80 34 L80 68 L50 82 L20 68 Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="51" r="8" fill="currentColor" />
    </svg>
  );
}

const AREAS = [
  { to: "/", rotulo: "Territórios", Icone: HexIcon },
  { to: "/mapa", rotulo: "Mapa", Icone: Map },
  { to: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
  { to: "/publicadores", rotulo: "Publicadores", Icone: Users },
  { to: "/relatorio", rotulo: "Relatório", Icone: FileText },
];

function MenuLateral() {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          className="-ml-1 flex-none text-ink-soft hover:text-jwblue md:hidden"
        >
          <Menu aria-hidden="true" className="size-5.5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="w-[min(19rem,82vw)] gap-0 p-0"
      >
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="flex items-center gap-2.5 text-[1.05rem] tracking-[-0.02em] text-ink">
            <HexIcon className="h-6 w-6 flex-none text-jwblue" />
            polygon
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Áreas" className="grid gap-1 p-3">
          {AREAS.map(({ to, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setAberto(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[0.95rem] font-medium transition-colors",
                  isActive
                    ? "bg-jwblue-wash text-jwblue-deep"
                    : "text-ink hover:bg-paper",
                )
              }
            >
              <Icone className="size-5 flex-none" aria-hidden="true" />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <SheetFooter className="border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            onClick={() => supabase.auth.signOut()}
            className="justify-start gap-3 px-3 py-3 text-[0.95rem] font-medium text-ink-soft hover:text-jwblue"
          >
            <LogOut aria-hidden="true" className="size-5" />
            Sair
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell() {
  return (
    <div data-casca className="flex h-dvh flex-col bg-paper">
      <header className="nao-imprime flex flex-none items-center gap-4 border-b border-line bg-white px-[clamp(14px,4vw,32px)] py-2.5">
        <MenuLateral />

        <div className="flex items-center gap-2.5">
          <HexIcon className="h-7 w-7 flex-none text-jwblue" />
          <span className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
            polygon
          </span>
        </div>

        <nav aria-label="Áreas" className="ml-4 hidden md:flex md:items-center md:gap-1">
          {AREAS.map(({ to, rotulo }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.1em] transition-colors",
                  isActive
                    ? "bg-jwblue-wash text-jwblue-deep"
                    : "text-ink-soft hover:text-jwblue",
                )
              }
            >
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => supabase.auth.signOut()}
          className="ml-auto hidden text-ink-soft hover:text-jwblue md:inline-flex"
        >
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </header>

      <main data-casca className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
