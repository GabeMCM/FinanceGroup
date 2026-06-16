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

  const updates = {
    name: payload.name,
    type: payload.type,
    visibility: payload.visibility,
    base_behavior: payload.baseBehavior,
    base_percent: payload.basePercent,
    default_split_mode: payload.defaultSplitMode ?? null,
  };

  const { data, error } = await auth.supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { error } = await auth.supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
