import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const status = payload.status === "accepted" ? "accepted" : "blocked";

  const { data, error } = await auth.supabase
    .from("friendships")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
