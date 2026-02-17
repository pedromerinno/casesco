import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  LayoutDashboard,
  Layers3,
  Settings2,
  Tags,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const areas: NavItem[] = [
  { to: "/admin", label: "Dash", icon: LayoutDashboard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/cases", label: "Cases", icon: Layers3 },
  { to: "/admin/categorias", label: "Categorias", icon: Tags },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0",
        "sticky top-14",
        "h-[calc(100vh-56px)]",
        "pt-2",
      )}
    >
      <div
        className={cn(
          "relative bg-white",
          "border border-[rgba(242,240,235,0.68)]",
          "rounded-xl shadow-[-11px_0px_10.4px_-15px_rgba(162,140,120,0.17),-18px_0px_28.6px_-16px_rgba(162,140,120,0.05)]",
          "overflow-hidden",
          collapsed ? "w-[72px]" : "w-[226px]",
          "h-full",
          "p-3",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "absolute right-2 top-2",
            "h-6 w-6 rounded-full bg-[#f2f0eb] ring-1 ring-black/5",
            "grid place-items-center text-black/70 hover:text-black transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft
            className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        <div className={cn("flex flex-col gap-8", collapsed && "gap-6")}>
          <div className="space-y-3">
            {!collapsed && (
              <p className="text-xs text-black/40 leading-[1.5]">Áreas</p>
            )}

            <nav className="space-y-2">
              {areas.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "w-full rounded-full px-1 py-1",
                        "flex items-center gap-2.5",
                        "transition-colors",
                        isActive
                          ? "bg-[linear-gradient(90deg,rgba(196,184,161,0.20)_0%,rgba(196,184,161,0.0)_102%)]"
                          : "hover:bg-black/[0.03]",
                      )
                    }
                  >
                    <span
                      className={cn(
                        "h-10 w-10 rounded-[41px] bg-[#f2f0eb] ring-1 ring-black/5",
                        "grid place-items-center shrink-0",
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px] text-black/70" />
                    </span>
                    {!collapsed && (
                      <span className="text-[14px] text-black leading-[1.5]">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}

