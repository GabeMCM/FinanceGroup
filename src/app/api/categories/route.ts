import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";
import type { BaseBehavior, EntryType, SplitMode, Visibility } from "@/lib/finance";

type CategoryPayload = {
  name: string;
  type: EntryType;
  visibility?: Visibility;
  baseBehavior?: BaseBehavior;
  basePercent?: number;
  defaultSplitMode?: SplitMode | null;
};

function isCategoryPayload(value: unknown): value is CategoryPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.name === "string" &&
    (payload.type === "income" || payload.type === "expense")
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("categories")
    .select("*")
    .eq("user_id", auth.user.id)
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
  if (!isCategoryPayload(payload)) {
    return NextResponse.json({ error: "Payload de categoria invalido." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("categories")
    .insert({
      user_id: auth.user.id,
      name: payload.name.trim(),
      type: payload.type,
      visibility: payload.visibility ?? "private",
      base_behavior: payload.baseBehavior ?? "ignore",
      base_percent: payload.basePercent ?? 0,
      default_split_mode: payload.defaultSplitMode ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
