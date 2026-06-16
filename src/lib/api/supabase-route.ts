import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function missingSupabaseResponse() {
  return NextResponse.json(
    {
      error:
        "Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    },
    { status: 503 },
  );
}

export function createRouteSupabase(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authorization = request.headers.get("authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
  });
}

export async function requireUser(request: NextRequest) {
  const supabase = createRouteSupabase(request);

  if (!supabase) {
    return { error: missingSupabaseResponse() };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      error: NextResponse.json(
        { error: "Autenticacao obrigatoria." },
        { status: 401 },
      ),
    };
  }

  return { supabase, user: data.user };
}
