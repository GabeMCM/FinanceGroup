import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/supabase-route";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const [
    categories,
    entries,
    monthlyCommitments,
    recurringDebts,
    sharedGroups,
  ] = await Promise.all([
    auth.supabase.from("categories").select("*").eq("user_id", auth.user.id),
    auth.supabase
      .from("financial_entries")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("entry_date", { ascending: false }),
    auth.supabase.from("monthly_commitments").select("*").eq("user_id", auth.user.id),
    auth.supabase.from("recurring_debts").select("*").eq("user_id", auth.user.id),
    auth.supabase
      .from("shared_groups")
      .select(
        "*, members:shared_group_members(*), items:shared_items(*, payments:shared_item_payments(*), participants:shared_item_participants(*))",
      ),
  ]);

  const firstError = [
    categories.error,
    entries.error,
    monthlyCommitments.error,
    recurringDebts.error,
    sharedGroups.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({
    period: new Date().toISOString().slice(0, 7),
    currentUserId: auth.user.id,
    privacyMode: "private_by_default",
    categories: categories.data ?? [],
    entries: entries.data ?? [],
    monthlyCommitments: monthlyCommitments.data ?? [],
    recurringDebts: recurringDebts.data ?? [],
    sharedGroups: sharedGroups.data ?? [],
  });
}
