import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";
import type { EntryType } from "@/lib/finance";

type CreateEntryPayload = {
  type: EntryType;
  description: string;
  amount: number;
  categoryId?: string | null;
  date?: string;
};

function isCreateEntryPayload(value: unknown): value is CreateEntryPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    (payload.type === "income" || payload.type === "expense") &&
    typeof payload.description === "string" &&
    typeof payload.amount === "number"
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("financial_entries")
    .select("*, category:categories(*)")
    .eq("user_id", auth.user.id)
    .order("entry_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const payload: unknown = await request.json();
  if (!isCreateEntryPayload(payload)) {
    return NextResponse.json({ error: "Payload de lancamento invalido." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("financial_entries")
    .insert({
      user_id: auth.user.id,
      type: payload.type,
      entry_date: payload.date ?? new Date().toISOString().slice(0, 10),
      description: payload.description.trim(),
      amount: payload.amount,
      category_id: payload.categoryId ?? null,
      source: "api",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
