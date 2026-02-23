import * as React from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase/client";
import { getUserAccessInfo } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const info = await getUserAccessInfo();
      if (info) navigate("/admin", { replace: true });
    })();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const info = await getUserAccessInfo();
      if (!info) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso negado",
          description: "Seu usuário não tem acesso a nenhuma empresa.",
          variant: "destructive",
        });
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast({
        title: "Não foi possível entrar",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <h1 className="font-display text-2xl font-semibold">MNNO®</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com suas credenciais para acessar a plataforma.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#c4b896] text-[#2c2420] hover:bg-[#b8a88a] focus-visible:ring-[#c4b896]"
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
