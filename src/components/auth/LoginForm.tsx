import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  /** Exibe "Lembrar de mim" e "Esqueceu a senha?" */
  showRememberAndForgot?: boolean;
  /** Exibe bloco "Ou continue com" + botão Google (só UI; onGoogleLogin opcional) */
  showGoogle?: boolean;
  /** URL para "Solicitar conta" (ex: "/cadastro"). Omitir para não exibir o link. */
  signUpPath?: string;
  className?: string;
};

const inputClass =
  "h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-slate-900/20 text-slate-900 placeholder:text-slate-400";
const labelClass = "text-sm font-medium text-slate-700";

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading = false,
  showRememberAndForgot = true,
  showGoogle = false,
  signUpPath,
  className,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#1e293b]">
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-slate-500">
          Entre na sua conta
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className={labelClass} htmlFor="auth-email">
            Seu email
          </label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="voce@empresa.com"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="auth-password">
            Senha
          </label>
          <div className="relative">
            <Input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 rounded"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {showRememberAndForgot && (
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-200 text-slate-900 focus:ring-slate-900/20"
                aria-label="Lembrar de mim"
              />
              <span className="text-sm text-slate-700">Lembrar de mim</span>
            </label>
            <Link
              to="#"
              className="text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 rounded-lg bg-black text-white hover:bg-black/90 focus-visible:ring-slate-900/20"
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      {showGoogle && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500">
                Ou continue com
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-900/20"
          >
            <GoogleIcon className="h-4 w-4" />
            Continuar com Google
          </Button>
        </>
      )}

      {signUpPath && (
        <p className="text-center text-sm text-slate-600">
          Não tem uma conta?{" "}
          <Link
            to={signUpPath}
            className="font-medium text-slate-900 hover:underline focus:outline-none focus-visible:underline"
          >
            Solicitar conta
          </Link>
        </p>
      )}
    </div>
  );
}

function Eye({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 6.168-2.18l-2.908-2.258c-.806.54-1.837.86-3.26.86-2.513 0-4.646-1.696-5.42-4.063H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.58 10.767c-.18-.54-.28-1.117-.28-1.71 0-.593.1-1.17.28-1.71V4.985H.957C.347 6.325 0 7.785 0 9.257s.348 2.932.957 4.272l2.623-2.662z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.414 0 2.68.478 3.698 1.418l2.763-2.763C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.985L3.58 7.247C4.354 4.88 6.487 3.58 9 3.58z"
      />
    </svg>
  );
}
