import * as React from "react";
import { Bell, ChevronDown, LogOut, Search, Settings2, Check, User, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

type AdminTopBarProps = {
  onSignOut: () => void | Promise<void>;
  userEmail: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
};

function initialFromUser(email: string, name?: string | null): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  const local = email.split("@")[0];
  return (local?.charAt(0) ?? "?").toUpperCase();
}

export default function AdminTopBar({ onSignOut, userEmail, userName, userAvatarUrl }: AdminTopBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, companies, selectCompany } = useCompany();
  const displayLabel = userName?.trim() || userEmail;
  const initial = initialFromUser(userEmail, userName);
  const [open, setOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const userButtonRef = React.useRef<HTMLButtonElement>(null);

  const hasMultiple = companies.length > 1;

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!userMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current?.contains(target)) return;
      if (userButtonRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [userMenuOpen]);

  function handleSelectCompany(id: string) {
    selectCompany(id);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f6f5f1] bg-[#fbfbf9]">
      <div className="w-full px-2">
        <div className="h-12 flex items-center justify-between gap-3 py-2">
          {/* Left: company selector */}
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => hasMultiple && setOpen((v) => !v)}
              className={cn(
                "h-8 rounded-full bg-[#f2f0eb] px-2 py-1",
                "flex items-center gap-2",
                "ring-1 ring-black/5",
                "text-sm font-medium text-black",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbf9]",
                hasMultiple && "cursor-pointer",
              )}
              aria-label="Selecionar empresa"
            >
              {company.logo_url ? (
                <img src={company.logo_url} alt="" className="h-4 w-4 rounded-[9px] object-contain" />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid place-items-center h-4 w-4 rounded-[9px] bg-black/10"
                />
              )}
              <span className="leading-none">{company.name}</span>
              {hasMultiple && (
                <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              )}
            </button>

            {open && hasMultiple && (
              <div
                ref={menuRef}
                className={cn(
                  "absolute left-0 top-full mt-1 z-50",
                  "w-56 rounded-lg bg-white shadow-lg ring-1 ring-black/10",
                  "py-1",
                )}
              >
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCompany(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                      "hover:bg-[#f2f0eb] transition-colors",
                      c.id === company.id && "font-medium",
                    )}
                  >
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="h-4 w-4 rounded-[9px] object-contain shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-[9px] bg-black/10 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.id === company.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle: search */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="w-full max-w-[380px]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9b988f]"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Pesquisar"
                  placeholder="Pesquisa..."
                  className={cn(
                    "h-8 rounded-full bg-[#f2f0eb] pl-9 pr-3",
                    "text-xs font-medium text-black placeholder:text-[#9b988f]",
                    "ring-1 ring-black/5 border-0",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate("/admin/configuracoes")}
                className={cn(
                  "h-8 w-8 rounded-full bg-[#f2f0eb] grid place-items-center",
                  "ring-1 ring-black/5",
                  "text-black/70 hover:text-black transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbf9]",
                )}
                aria-label="Configurações"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full bg-[#f2f0eb] grid place-items-center",
                  "ring-1 ring-black/5",
                  "text-black/70 hover:text-black transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbf9]",
                )}
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative ml-1">
              <button
                ref={userButtonRef}
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-full bg-[#f2f0eb] pl-1 pr-2 py-1 ring-1 ring-black/5 min-w-0",
                  "text-left transition-colors hover:bg-[#ebe8e0]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbf9]",
                )}
                aria-label="Menu do usuário"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title={displayLabel}
              >
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 rounded-full bg-black/10 grid place-items-center text-[10px] font-semibold text-black/70"
                  >
                    {initial}
                  </div>
                )}
                <span className="truncate text-sm font-medium text-black max-w-[120px] sm:max-w-[160px]">
                  {displayLabel}
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", userMenuOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {userMenuOpen && (
                <div
                  ref={userMenuRef}
                  role="menu"
                  className={cn(
                    "absolute right-0 top-full mt-1 z-50",
                    "w-52 rounded-lg bg-white shadow-lg ring-1 ring-black/10",
                    "py-1",
                  )}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/admin/perfil");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                      "hover:bg-[#f2f0eb] transition-colors",
                    )}
                  >
                    <User className="h-4 w-4 shrink-0 text-black/60" aria-hidden="true" />
                    Editar usuário
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/admin/configuracoes");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                      "hover:bg-[#f2f0eb] transition-colors",
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-black/60" aria-hidden="true" />
                    Editar empresa
                  </button>
                  <div className="my-1 border-t border-black/5" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                      "hover:bg-[#f2f0eb] transition-colors text-red-600 hover:text-red-700",
                    )}
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
