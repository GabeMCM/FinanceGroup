import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const payload = (await request.json()) as Record<string, unknown>;
  const displayName =
    typeof payload.displayName === "string"
      ? payload.displayName
      : auth.user.email ?? "Usuario";
  const username =
    typeof payload.username === "string"
      ? payload.username.trim().toLowerCase()
      : undefined;

  const { data, error } = await auth.supabase
    .from("profiles")
    .upsert({
      id: auth.user.id,
      display_name: displayName,
      ...(username ? { username } : {}),
      avatar_url: typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
