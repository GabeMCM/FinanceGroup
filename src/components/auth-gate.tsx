"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { FinanceApp } from "@/components/finance-app";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
    />
  );
}

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function syncProfile(nextSession: Session | null, displayName?: string) {
    if (!nextSession) {
      return;
    }

    await fetch("/api/profile", {
      body: JSON.stringify({
        displayName:
          displayName || nextSession.user.user_metadata?.display_name || email,
      }),
      headers: {
        Authorization: `Bearer ${nextSession.access_token}`,
        "Content-Type": "application/json",
      },
      method: "PUT",
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name.trim() || email } },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setSubmitting(false);
      return;
    }

    await syncProfile(result.data.session, name.trim());
    setMessage(
      result.data.session
        ? "Sessao iniciada."
        : "Cadastro criado. Confira seu email se a confirmacao estiver ativa.",
    );
    setSubmitting(false);
  }

  async function logout() {
    await supabase?.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-slate-950">
        <p className="text-sm font-semibold text-slate-500">Carregando...</p>
      </main>
    );
  }

  if (session) {
    return <FinanceApp onLogout={logout} userEmail={session.user.email ?? ""} />;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-md place-items-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-600">
            FinanceGroup
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Dados privados por usuario, grupos compartilhados somente por convite.
          </p>

          {!isSupabaseConfigured ? (
            <div className="mt-5 rounded-xl bg-orange-50 p-4 text-sm text-orange-900">
              Configure `NEXT_PUBLIC_SUPABASE_URL` e
              `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env.local`.
            </div>
          ) : (
            <form className="mt-5 grid gap-3" onSubmit={submit}>
              {mode === "signup" && (
                <AuthField label="Nome">
                  <AuthInput
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    value={name}
                  />
                </AuthField>
              )}
              <AuthField label="Email">
                <AuthInput
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  type="email"
                  value={email}
                />
              </AuthField>
              <AuthField label="Senha">
                <AuthInput
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 6 caracteres"
                  type="password"
                  value={password}
                />
              </AuthField>
              {message && (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {message}
                </p>
              )}
              <button
                className="h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? "Aguarde..."
                  : mode === "login"
                    ? "Entrar"
                    : "Criar conta"}
              </button>
            </form>
          )}

          <button
            className="mt-4 text-sm font-semibold text-slate-700"
            onClick={() => {
              setMode((current) => (current === "login" ? "signup" : "login"));
              setMessage("");
            }}
            type="button"
          >
            {mode === "login"
              ? "Ainda nao tenho conta"
              : "Ja tenho uma conta"}
          </button>
        </section>
      </div>
    </main>
  );
}
