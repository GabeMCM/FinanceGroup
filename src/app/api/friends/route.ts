import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("friendships")
    .select(
      "*, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)",
    )
    .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

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

  const { data, error } = await auth.supabase
    .from("friendships")
    .insert({
      requester_id: auth.user.id,
      addressee_id: profile.id,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
