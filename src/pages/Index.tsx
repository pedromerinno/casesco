import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase/client";
import { getUserAccessInfo } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
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
    <AuthLayout
      backgroundImage="/IMG_001.jpeg"
      brandCopyMain="Construindo um futuro melhor e mais bonito."
      brandCopySecondary="De forma justa, organizada e coerente."
      logo={
        <>
          <span className="text-2xl font-semibold tracking-tight text-white">
            MNNO
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
            Cases
          </span>
        </>
      }
      topRight={
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-900/20"
        >
          <Link to="#">Solicitar conta</Link>
        </Button>
      }
    >
      <LoginForm
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
        loading={loading}
        showRememberAndForgot
        showGoogle={false}
      />
    </AuthLayout>
  );
}
