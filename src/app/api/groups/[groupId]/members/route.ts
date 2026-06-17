import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";

type Params = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { groupId } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const username =
    typeof payload.username === "string"
      ? payload.username.trim().toLowerCase().replace(/^@/, "")
      : "";

  if (!username) {
    return NextResponse.json({ error: "Username obrigatorio." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  }

  const { data: friendship } = await auth.supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${auth.user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${auth.user.id})`,
    )
    .maybeSingle();

  if (!friendship) {
    return NextResponse.json(
      { error: "Esse usuario precisa ser seu amigo antes de entrar no grupo." },
      { status: 403 },
    );
  }

  const { data, error } = await auth.supabase
    .from("shared_group_members")
    .insert({
      group_id: groupId,
      user_id: profile.id,
      display_name: profile.display_name,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
