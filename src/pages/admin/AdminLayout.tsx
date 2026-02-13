import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/cases", label: "Cases" },
  { to: "/admin/categorias", label: "Categorias" },
  { to: "/admin/site", label: "Site" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-background text-foreground grid place-items-center px-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen md:grid md:grid-cols-[280px_1fr]">
        <aside className="hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur">
          <div className="px-6 py-6">
            <div className="font-display text-lg font-semibold">ONMX</div>
            <p className="mt-1 text-xs text-muted-foreground">Gerenciamento de conteúdo</p>
          </div>

          <nav className="px-3 pb-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-6">
            <Button variant="outline" onClick={signOut} className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Mobile header */}
          <div className="md:hidden border-b border-border bg-card/60 backdrop-blur">
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="font-display font-semibold">ONMX</span>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "shrink-0 px-4 py-2 rounded-full text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/60 text-muted-foreground",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <main className="px-6 md:px-12 lg:px-16 py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

