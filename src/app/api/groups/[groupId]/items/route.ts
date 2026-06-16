import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";
import type { SplitMode } from "@/lib/finance";

type Params = {
  params: Promise<{ groupId: string }>;
};

type PaymentPayload = {
  userId: string;
  amount: number;
};

type SharedItemPayload = {
  title: string;
  amount: number;
  categoryId?: string | null;
  splitMode: SplitMode;
  recurrence?: "once" | "monthly";
  payments: PaymentPayload[];
};

const splitModes: SplitMode[] = [
  "equal",
  "proportional",
  "fixed_percent",
  "individual",
];

function isPayload(value: unknown): value is SharedItemPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.title === "string" &&
    typeof payload.amount === "number" &&
    typeof payload.splitMode === "string" &&
    splitModes.includes(payload.splitMode as SplitMode) &&
    Array.isArray(payload.payments)
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { groupId } = await params;
  const payload: unknown = await request.json();
  if (!isPayload(payload)) {
    return NextResponse.json({ error: "Payload de despesa em grupo invalido." }, { status: 400 });
  }

  const { data: members, error: membersError } = await auth.supabase
    .from("shared_group_members")
    .select("*")
    .eq("group_id", groupId);

  if (membersError || !members?.length) {
    return NextResponse.json(
      { error: membersError?.message ?? "Grupo sem membros." },
      { status: 422 },
    );
  }

  const { data: item, error: itemError } = await auth.supabase
    .from("shared_items")
    .insert({
      group_id: groupId,
      category_id: payload.categoryId ?? null,
      title: payload.title.trim(),
      period: new Date().toISOString().slice(0, 7),
      amount: payload.amount,
      split_mode: payload.splitMode,
      recurrence: payload.recurrence ?? "once",
    })
    .select("*")
    .single();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  const participants = members.map((member) => ({
    item_id: item.id,
    user_id: member.user_id,
    display_name: member.display_name,
    percent: member.percent,
    fixed_amount: member.fixed_amount,
  }));
  const payments = payload.payments
    .filter((payment) => payment.amount > 0)
    .map((payment) => ({
      item_id: item.id,
      user_id: payment.userId,
      amount: payment.amount,
    }));

  const { error: participantsError } = await auth.supabase
    .from("shared_item_participants")
    .insert(participants);

  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 400 });
  }

  if (payments.length) {
    const { error: paymentsError } = await auth.supabase
      .from("shared_item_payments")
      .insert(payments);

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { data: { ...item, participants, payments } },
    { status: 201 },
  );
}
