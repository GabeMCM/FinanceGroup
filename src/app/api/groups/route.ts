import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";
import type { SplitMode } from "@/lib/finance";

type GroupPayload = {
  name: string;
  description?: string;
  defaultSplitMode?: SplitMode;
};

function isGroupPayload(value: unknown): value is GroupPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).name === "string",
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("shared_groups")
    .select(
      "*, members:shared_group_members(*), items:shared_items(*, payments:shared_item_payments(*), participants:shared_item_participants(*))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const payload: unknown = await request.json();
  if (!isGroupPayload(payload)) {
    return NextResponse.json({ error: "Payload de grupo invalido." }, { status: 400 });
  }

  const { data: group, error: groupError } = await auth.supabase
    .from("shared_groups")
    .insert({
      owner_id: auth.user.id,
      name: payload.name.trim(),
      description: payload.description ?? "",
      default_split_mode: payload.defaultSplitMode ?? "equal",
    })
    .select("*")
    .single();

  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 400 });
  }

  const { error: memberError } = await auth.supabase
    .from("shared_group_members")
    .insert({
      group_id: group.id,
      user_id: auth.user.id,
      display_name: auth.user.user_metadata?.display_name ?? auth.user.email ?? "Voce",
    });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ data: group }, { status: 201 });
}
