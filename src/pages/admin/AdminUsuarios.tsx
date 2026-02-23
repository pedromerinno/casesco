import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Trash2, UserPlus } from "lucide-react";

import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase/client";
import {
  getUserAccessInfo,
  getUsersWithCompanies,
  getAllCompaniesForAdmin,
  findUserByEmail,
  type UserWithCompaniesRow,
} from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const INVITE_FN = "invite-user";
const CREATE_FN = "create-user";

/** Chama Edge Function com fetch para garantir envio do token e leitura da mensagem de erro no corpo. */
async function invokeAdminFunction<T = { error?: string; ok?: boolean }>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error("Faça login novamente.");

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: T & { error?: string };
  try { data = JSON.parse(text); } catch { data = {} as any; }
  if (!res.ok) {
    const msg = data?.error || text || res.statusText || "Erro na requisição";
    console.error(`[invokeAdminFunction] ${name} ${res.status}:`, msg);
    throw new Error(msg);
  }
  return data;
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [accessInfo, setAccessInfo] = React.useState<Awaited<ReturnType<typeof getUserAccessInfo>>>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"invite" | "create" | "link">("invite");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [userName, setUserName] = React.useState("");
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());
  const [linkUser, setLinkUser] = React.useState<{ id: string; email: string; name: string | null } | null>(null);
  const [linkSearching, setLinkSearching] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserWithCompaniesRow | null>(null);
  const [editCompanyIds, setEditCompanyIds] = React.useState<Set<string>>(new Set());
  const [removingUser, setRemovingUser] = React.useState<UserWithCompaniesRow | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    getUserAccessInfo().then(setAccessInfo);
  }, []);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users-with-companies"],
    queryFn: getUsersWithCompanies,
    enabled: !!accessInfo?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  const { data: allCompanies } = useQuery({
    queryKey: ["admin", "all-companies"],
    queryFn: getAllCompaniesForAdmin,
    enabled: !!accessInfo?.isSuperAdmin && (dialogOpen || !!editingUser),
    staleTime: 60 * 1000,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await invokeAdminFunction(INVITE_FN, {
        email: email.trim(),
        company_ids: Array.from(selectedCompanyIds),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({
        title: "Convite enviado",
        description: "O usuário receberá um e-mail para acessar e foi vinculado às empresas selecionadas.",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível enviar o convite.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await invokeAdminFunction(CREATE_FN, {
        email: email.trim(),
        password,
        name: userName.trim() || undefined,
        company_ids: Array.from(selectedCompanyIds),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi registrado e vinculado às empresas selecionadas.",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível criar o usuário.", variant: "destructive" });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!linkUser || selectedCompanyIds.size === 0) throw new Error("Selecione um usuário e ao menos uma empresa.");
      const rows = Array.from(selectedCompanyIds).map((company_id) => ({
        user_id: linkUser.id,
        company_id,
      }));
      const { error } = await supabase.from("user_companies").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({ title: "Vinculado", description: "Usuário vinculado às empresas selecionadas." });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível vincular.", variant: "destructive" });
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const { error } = await supabase
        .from("user_companies")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({ title: "Desvinculado", description: "Usuário removido da empresa." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível remover vínculo.", variant: "destructive" });
    },
  });

  const updateUserCompaniesMutation = useMutation({
    mutationFn: async ({ userId, companyIds }: { userId: string; companyIds: string[] }) => {
      const { error: delErr } = await supabase.from("user_companies").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      if (companyIds.length > 0) {
        const rows = companyIds.map((company_id) => ({ user_id: userId, company_id }));
        const { error: insErr } = await supabase.from("user_companies").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({ title: "Atualizado", description: "Empresas do usuário atualizadas." });
      setEditingUser(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  const removeUserAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_companies").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users-with-companies"] });
      toast({ title: "Acesso removido", description: "Usuário desvinculado de todas as empresas." });
      setRemovingUser(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message ?? "Não foi possível remover acesso.", variant: "destructive" });
    },
  });

  function resetForm() {
    setEmail("");
    setPassword("");
    setUserName("");
    setSelectedCompanyIds(new Set());
    setLinkUser(null);
    setMode("invite");
  }

  function toggleCompany(id: string) {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  React.useEffect(() => {
    if (editingUser) setEditCompanyIds(new Set(editingUser.companies.map((c) => c.id)));
  }, [editingUser]);

  function toggleEditCompany(id: string) {
    setEditCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSearchUser() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLinkSearching(true);
    try {
      const user = await findUserByEmail(trimmed);
      setLinkUser(user ?? null);
      if (!user) toast({ title: "Não encontrado", description: "Nenhum usuário com esse e-mail.", variant: "destructive" });
    } finally {
      setLinkSearching(false);
    }
  }

  if (!accessInfo) {
    return (
      <main className="min-h-[40vh] grid place-items-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!accessInfo.isSuperAdmin) {
    return (
      <section className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Apenas super-admins podem gerenciar usuários e vínculos com empresas.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione usuários e vincule às empresas para que possam editar informações da empresa.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Adicionar usuário</DialogTitle>
            </DialogHeader>

            <div className="flex gap-2 border-b border-border pb-4">
              <Button
                type="button"
                variant={mode === "invite" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode("invite")}
              >
                Convidar novo
              </Button>
              <Button
                type="button"
                variant={mode === "create" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode("create")}
              >
                Criar com e-mail e senha
              </Button>
              <Button
                type="button"
                variant={mode === "link" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode("link")}
              >
                Vincular existente
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    className="flex-1"
                  />
                  {mode === "link" && (
                    <Button type="button" variant="outline" onClick={handleSearchUser} disabled={linkSearching}>
                      {linkSearching ? "Buscando…" : "Buscar"}
                    </Button>
                  )}
                </div>
                {mode === "link" && linkUser && (
                  <p className="text-xs text-muted-foreground">
                    Usuário: {linkUser.name || linkUser.email} ({linkUser.email})
                  </p>
                )}
              </div>

              {mode === "create" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome (opcional)</label>
                    <Input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Nome do usuário"
                    />
                  </div>
                </>
              )}

              {allCompanies && allCompanies.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Empresas</label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 space-y-2">
                    {allCompanies.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-muted/50 px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.has(c.id)}
                          onChange={() => toggleCompany(c.id)}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                {mode === "invite" && (
                  <Button
                    type="button"
                    onClick={() => inviteMutation.mutate()}
                    disabled={!email.trim() || selectedCompanyIds.size === 0 || inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Enviando…" : "Convidar e vincular"}
                  </Button>
                )}
                {mode === "create" && (
                  <Button
                    type="button"
                    onClick={() => createMutation.mutate()}
                    disabled={
                      !email.trim() ||
                      password.length < 6 ||
                      selectedCompanyIds.size === 0 ||
                      createMutation.isPending
                    }
                  >
                    {createMutation.isPending ? "Criando…" : "Criar e vincular"}
                  </Button>
                )}
                {mode === "link" && (
                  <Button
                    type="button"
                    onClick={() => linkMutation.mutate()}
                    disabled={!linkUser || selectedCompanyIds.size === 0 || linkMutation.isPending}
                  >
                    {linkMutation.isPending ? "Salvando…" : "Vincular às empresas"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editar empresas do usuário */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar empresas</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingUser.name || editingUser.email} — {editingUser.email}
              </p>
              {allCompanies && allCompanies.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 space-y-2">
                  {allCompanies.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-muted/50 px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={editCompanyIds.has(c.id)}
                        onChange={() => toggleEditCompany(c.id)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    updateUserCompaniesMutation.mutate({
                      userId: editingUser.id,
                      companyIds: Array.from(editCompanyIds),
                    })
                  }
                  disabled={editCompanyIds.size === 0 || updateUserCompaniesMutation.isPending}
                >
                  {updateUserCompaniesMutation.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar remover acesso */}
      <Dialog open={!!removingUser} onOpenChange={(open) => !open && setRemovingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover acesso</DialogTitle>
          </DialogHeader>
          {removingUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Remover o acesso de <strong>{removingUser.name || removingUser.email}</strong> a todas as empresas? O
                usuário não poderá mais acessar o painel.
              </p>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setRemovingUser(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeUserAccessMutation.mutate(removingUser.id)}
                  disabled={removeUserAccessMutation.isPending}
                >
                  {removeUserAccessMutation.isPending ? "Removendo…" : "Remover acesso"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Carregando…" : `${users?.length ?? 0} usuários com acesso`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {(users ?? []).map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onRemoveLink={(companyId) => removeLinkMutation.mutate({ userId: user.id, companyId })}
              onEdit={() => {
                setOpenMenuUserId(null);
                setEditingUser(user);
              }}
              onRemove={() => {
                setOpenMenuUserId(null);
                setRemovingUser(user);
              }}
              isRemoving={removeLinkMutation.isPending}
              isMenuOpen={openMenuUserId === user.id}
              onMenuOpenChange={(open) => setOpenMenuUserId(open ? user.id : null)}
            />
          ))}

          {!isLoading && (users?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              Nenhum usuário vinculado ainda. Use &quot;Adicionar usuário&quot; para convidar ou vincular.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function UserRow({
  user,
  onRemoveLink,
  onEdit,
  onRemove,
  isRemoving,
  isMenuOpen,
  onMenuOpenChange,
}: {
  user: UserWithCompaniesRow;
  onRemoveLink: (companyId: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  isRemoving: boolean;
  isMenuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenuOpenChange(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, onMenuOpenChange]);

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium truncate">{user.name || user.email}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => onMenuOpenChange(!isMenuOpen)}
            aria-label="Opções"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {isMenuOpen && (
            <div
              className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-lg border border-border bg-card py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={onEdit}
                role="menuitem"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Editar empresas
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={onRemove}
                role="menuitem"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Remover acesso
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {user.companies.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"
          >
            {c.name}
            <button
              type="button"
              onClick={() => onRemoveLink(c.id)}
              disabled={isRemoving}
              className="rounded-full p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remover ${c.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
