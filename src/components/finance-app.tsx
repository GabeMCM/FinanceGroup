"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  calculateProtectedBase,
  calculateSettlement,
  currentUserId,
  peopleById,
  protectedBaseByUserId,
  type Category,
  type Connection,
  type EntryType,
  type FinancialEntry,
  type MonthlyCommitment,
  type RecurringDebt,
  type SharedGroup,
  type SharedItem,
  type SplitMode,
} from "@/lib/finance";

type View =
  | "home"
  | "groups"
  | "entries"
  | "monthly"
  | "debts"
  | "categories"
  | "invites"
  | "api"
  | "more";

type Composer =
  | "entry"
  | "monthly"
  | "debt"
  | "group"
  | "groupExpense"
  | "category"
  | null;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const splitLabels: Record<SplitMode, string> = {
  equal: "50/50",
  proportional: "Proporcional",
  fixed_percent: "Percentual fixo",
  individual: "Individual",
};

const viewTitles: Record<View, string> = {
  home: "Resumo",
  groups: "Grupos",
  entries: "Lançamentos",
  monthly: "Mensais",
  debts: "Dívidas",
  categories: "Categorias",
  invites: "Convites",
  api: "API",
  more: "Menu",
};

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
    />
  );
}

function PrimaryButton({
  children,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 ${className}`}
    >
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "dark";
}) {
  const tones = {
    neutral: "bg-white text-slate-950 border-slate-200",
    good: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    dark: "bg-slate-950 text-white border-slate-950",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p
        className={`text-sm font-medium ${
          tone === "dark" ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function FinanceApp({
  onLogout,
  userEmail,
}: {
  onLogout?: () => void;
  userEmail?: string;
}) {
  const [activeView, setActiveView] = useState<View>("home");
  const [, setViewHistory] = useState<View[]>([]);
  const [actionOpen, setActionOpen] = useState(false);
  const [composer, setComposer] = useState<Composer>(null);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [monthlyCommitments, setMonthlyCommitments] = useState<
    MonthlyCommitment[]
  >([]);
  const [recurringDebts, setRecurringDebts] =
    useState<RecurringDebt[]>([]);
  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [entryDraft, setEntryDraft] = useState({
    type: "expense" as EntryType,
    description: "",
    amount: "",
    categoryId: "personal",
  });
  const [monthlyDraft, setMonthlyDraft] = useState({
    title: "",
    amount: "",
    dueDay: "10",
    categoryId: "personal",
    scope: "private" as "private" | "shared",
  });
  const [debtDraft, setDebtDraft] = useState({
    title: "",
    creditor: "",
    totalAmount: "",
    installmentAmount: "",
    totalInstallments: "12",
    protectedDeduction: true,
  });
  const [groupDraft, setGroupDraft] = useState({
    name: "",
    description: "",
    defaultSplitMode: "equal" as SplitMode,
  });
  const [groupExpenseDraft, setGroupExpenseDraft] = useState({
    groupId: "group-home",
    title: "",
    amount: "",
    paidByUserId: currentUserId,
    payments: {} as Record<string, string>,
    splitMode: "group-default" as SplitMode | "group-default",
    recurrence: "once" as "once" | "monthly",
  });
  const [categoryDraft, setCategoryDraft] = useState({
    id: "",
    name: "",
    type: "expense" as EntryType,
    visibility: "private" as "private" | "shared",
    baseBehavior: "ignore" as Category["baseBehavior"],
    basePercent: "0",
    defaultSplitMode: "" as SplitMode | "",
  });
  const [inviteGroupId, setInviteGroupId] = useState("group-home");

  const ownBase = useMemo(
    () => calculateProtectedBase(currentUserId, entries, categories),
    [categories, entries],
  );

  const bases = useMemo(
    () => ({
      ...protectedBaseByUserId,
      [currentUserId]: ownBase,
    }),
    [ownBase],
  );

  const settlement = useMemo(
    () => calculateSettlement(currentUserId, groups, bases),
    [bases, groups],
  );

  const allSharedItems = groups.flatMap((group) => group.items);
  const sharedMonthlyTotal = allSharedItems
    .filter((item) => item.recurrence === "monthly")
    .reduce((total, item) => total + item.amount, 0);
  const privateMonthlyTotal = monthlyCommitments
    .filter((item) => item.scope === "private")
    .reduce((total, item) => total + item.amount, 0);
  const debtOpenTotal = recurringDebts.reduce(
    (total, item) =>
      total +
      Math.max(item.totalInstallments - item.paidInstallments, 0) *
        item.installmentAmount,
    0,
  );

  function go(view: View) {
    setViewHistory((current) =>
      view === activeView ? current : [...current, activeView],
    );
    setActiveView(view);
    setActionOpen(false);
  }

  function goBack() {
    setViewHistory((current) => {
      const previous = current.at(-1) ?? "home";
      setActiveView(previous);
      return current.slice(0, -1);
    });
    setActionOpen(false);
    setComposer(null);
  }

  function openComposer(nextComposer: Exclude<Composer, null>) {
    setActionOpen(false);
    setComposer(nextComposer);
  }

  function getCategory(categoryId: string) {
    return categories.find((category) => category.id === categoryId);
  }

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(entryDraft.amount);

    if (!entryDraft.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setEntries((current) => [
      {
        id: nextId("entry"),
        userId: currentUserId,
        type: entryDraft.type,
        date: new Date().toISOString().slice(0, 10),
        description: entryDraft.description.trim(),
        amount,
        categoryId: entryDraft.categoryId,
        source: "manual",
      },
      ...current,
    ]);
    setEntryDraft((current) => ({ ...current, description: "", amount: "" }));
    setComposer(null);
  }

  function submitMonthly(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(monthlyDraft.amount);
    const dueDay = Number(monthlyDraft.dueDay);

    if (!monthlyDraft.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setMonthlyCommitments((current) => [
      {
        id: nextId("monthly"),
        userId: currentUserId,
        title: monthlyDraft.title.trim(),
        amount,
        categoryId: monthlyDraft.categoryId,
        dueDay: Math.min(Math.max(dueDay, 1), 31),
        scope: monthlyDraft.scope,
        status: "active",
      },
      ...current,
    ]);
    setMonthlyDraft((current) => ({ ...current, title: "", amount: "" }));
    setComposer(null);
  }

  function submitDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalAmount = Number(debtDraft.totalAmount);
    const installmentAmount = Number(debtDraft.installmentAmount);
    const totalInstallments = Number(debtDraft.totalInstallments);

    if (
      !debtDraft.title.trim() ||
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(installmentAmount)
    ) {
      return;
    }

    setRecurringDebts((current) => [
      {
        id: nextId("debt"),
        userId: currentUserId,
        title: debtDraft.title.trim(),
        creditor: debtDraft.creditor.trim() || "Não informado",
        totalAmount,
        installmentAmount,
        paidInstallments: 0,
        totalInstallments,
        nextDueDate: "2026-07-10",
        protectedDeduction: debtDraft.protectedDeduction,
      },
      ...current,
    ]);
    setDebtDraft((current) => ({
      ...current,
      title: "",
      creditor: "",
      totalAmount: "",
      installmentAmount: "",
    }));
    setComposer(null);
  }

  function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupDraft.name.trim()) {
      return;
    }

    const id = nextId("group");

    setGroups((current) => [
      {
        id,
        name: groupDraft.name.trim(),
        description: groupDraft.description.trim() || "Grupo de divisão",
        inviteCode: `${groupDraft.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()
          .toString(36)
          .slice(-4)}`,
        defaultSplitMode: groupDraft.defaultSplitMode,
        members: [{ userId: currentUserId, name: "Você" }],
        items: [],
      },
      ...current,
    ]);
    setInviteGroupId(id);
    setGroupExpenseDraft((current) => ({ ...current, groupId: id }));
    setGroupDraft({ name: "", description: "", defaultSplitMode: "equal" });
    setComposer(null);
  }

  function submitGroupExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(groupExpenseDraft.amount);
    const group = groups.find((item) => item.id === groupExpenseDraft.groupId);

    if (
      !group ||
      !groupExpenseDraft.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    const splitMode =
      groupExpenseDraft.splitMode === "group-default"
        ? group.defaultSplitMode
        : groupExpenseDraft.splitMode;
    const payments = group.members
      .map((member) => ({
        userId: member.userId,
        amount: Number(groupExpenseDraft.payments[member.userId] ?? 0),
      }))
      .filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0);
    const mainPayment = payments.reduce(
      (highest, payment) => (payment.amount > highest.amount ? payment : highest),
      { userId: groupExpenseDraft.paidByUserId, amount: 0 },
    );

    const item: SharedItem = {
      id: nextId("shared"),
      groupId: group.id,
      title: groupExpenseDraft.title.trim(),
      categoryId: group.id === "group-child" ? "child" : "home",
      period: "2026-06",
      amount,
      paidByUserId: mainPayment.userId,
      payments,
      splitMode,
      recurrence: groupExpenseDraft.recurrence,
      participants: group.members,
    };

    setGroups((current) =>
      current.map((currentGroup) =>
        currentGroup.id === group.id
          ? { ...currentGroup, items: [item, ...currentGroup.items] }
          : currentGroup,
      ),
    );
    setGroupExpenseDraft((current) => ({
      ...current,
      title: "",
      amount: "",
      payments: {},
    }));
    setComposer(null);
  }

  function editCategory(category: Category) {
    setCategoryDraft({
      id: category.id,
      name: category.name,
      type: category.type,
      visibility: category.visibility,
      baseBehavior: category.baseBehavior,
      basePercent: String(category.basePercent),
      defaultSplitMode: category.defaultSplitMode ?? "",
    });
    setComposer("category");
  }

  function deleteCategory(categoryId: string) {
    const fallback = categories.find(
      (category) => category.userId === currentUserId && category.id !== categoryId,
    );

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId),
    );
    if (fallback) {
      setEntries((current) =>
        current.map((entry) =>
          entry.categoryId === categoryId
            ? { ...entry, categoryId: fallback.id }
            : entry,
        ),
      );
      setMonthlyCommitments((current) =>
        current.map((item) =>
          item.categoryId === categoryId ? { ...item, categoryId: fallback.id } : item,
        ),
      );
    }
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryDraft.name.trim()) {
      return;
    }

    const basePercent = Math.min(
      Math.max(Number(categoryDraft.basePercent) || 0, 0),
      100,
    );
    const nextCategory: Category = {
      id: categoryDraft.id || nextId("category"),
      userId: currentUserId,
      name: categoryDraft.name.trim(),
      type: categoryDraft.type,
      visibility: categoryDraft.visibility,
      baseBehavior: categoryDraft.baseBehavior,
      basePercent,
      defaultSplitMode: categoryDraft.defaultSplitMode || undefined,
    };

    setCategories((current) =>
      categoryDraft.id
        ? current.map((category) =>
            category.id === categoryDraft.id ? nextCategory : category,
          )
        : [nextCategory, ...current],
    );
    setCategoryDraft({
      id: "",
      name: "",
      type: "expense",
      visibility: "private",
      baseBehavior: "ignore",
      basePercent: "0",
      defaultSplitMode: "",
    });
    setComposer(null);
  }

  function submitConnection(event: FormEvent<HTMLFormElement>, value: string) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    setConnections((current) => [
      {
        id: nextId("connection"),
        name: value.trim(),
        status: "pending",
        activeSharedItems: 0,
      },
      ...current,
    ]);
  }

  const activeGroup =
    groups.find((group) => group.id === groupExpenseDraft.groupId) ?? groups[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[min(100vw-24px,520px)] pb-36 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <header className="sticky top-0 z-20 bg-background/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="relative flex min-h-14 items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-600">
                Finance
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {viewTitles[activeView]}
              </h1>
            </div>
            {activeView !== "home" && (
              <button
                aria-label="Voltar"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200"
                onClick={goBack}
                type="button"
              >
                ‹
              </button>
            )}
          </div>
        </header>

        <div className="px-4 py-5 md:px-8">
          {activeView === "home" && (
            <HomeView
              debtOpenTotal={debtOpenTotal}
              groups={groups}
              ownBase={ownBase}
              privateMonthlyTotal={privateMonthlyTotal}
              settlement={settlement}
              sharedMonthlyTotal={sharedMonthlyTotal}
              setView={go}
            />
          )}

          {activeView === "groups" && (
            <GroupsView
              groups={groups}
              openComposer={openComposer}
              setInviteGroupId={setInviteGroupId}
              setView={go}
            />
          )}

          {activeView === "entries" && (
            <EntriesView
              entries={entries}
              getCategory={getCategory}
              openComposer={openComposer}
            />
          )}

          {activeView === "monthly" && (
            <MonthlyView
              items={monthlyCommitments}
              openComposer={openComposer}
            />
          )}

          {activeView === "debts" && (
            <DebtsView
              items={recurringDebts}
              openComposer={openComposer}
            />
          )}

          {activeView === "categories" && (
            <CategoriesView
              categories={categories.filter(
                (category) => category.userId === currentUserId,
              )}
              deleteCategory={deleteCategory}
              editCategory={editCategory}
              openComposer={openComposer}
            />
          )}

          {activeView === "invites" && (
            <InvitesView
              connections={connections}
              groups={groups}
              inviteGroupId={inviteGroupId}
              onConnectionSubmit={submitConnection}
              setInviteGroupId={setInviteGroupId}
            />
          )}

          {activeView === "api" && <ApiView />}

          {activeView === "more" && (
            <MoreView onLogout={onLogout} setView={go} userEmail={userEmail} />
          )}
        </div>
      </div>

      <ActionSheet
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        openComposer={openComposer}
      />
      <ComposerModal
        activeGroup={activeGroup}
        categories={categories.filter((category) => category.userId === currentUserId)}
        categoryDraft={categoryDraft}
        composer={composer}
        debtDraft={debtDraft}
        entryDraft={entryDraft}
        groupDraft={groupDraft}
        groupExpenseDraft={groupExpenseDraft}
        groups={groups}
        monthlyDraft={monthlyDraft}
        onClose={() => setComposer(null)}
        onCategoryDraftChange={setCategoryDraft}
        onCategorySubmit={submitCategory}
        onDebtDraftChange={setDebtDraft}
        onDebtSubmit={submitDebt}
        onEntryDraftChange={setEntryDraft}
        onEntrySubmit={submitEntry}
        onGroupDraftChange={setGroupDraft}
        onGroupExpenseDraftChange={setGroupExpenseDraft}
        onGroupExpenseSubmit={submitGroupExpense}
        onGroupSubmit={submitGroup}
        onMonthlyDraftChange={setMonthlyDraft}
        onMonthlySubmit={submitMonthly}
      />
      <BottomNav
        activeView={activeView}
        actionOpen={actionOpen}
        setActionOpen={setActionOpen}
        setView={go}
      />
      <MoreSheet open={false} onClose={() => undefined} setView={go} />
    </main>
  );
}

function HomeView({
  debtOpenTotal,
  groups,
  ownBase,
  privateMonthlyTotal,
  settlement,
  setView,
  sharedMonthlyTotal,
}: {
  debtOpenTotal: number;
  groups: SharedGroup[];
  ownBase: number;
  privateMonthlyTotal: number;
  settlement: ReturnType<typeof calculateSettlement>;
  setView: (view: View) => void;
  sharedMonthlyTotal: number;
}) {
  const finalLabel =
    settlement.final >= 0
      ? `Receber ${currency.format(settlement.final)}`
      : `Pagar ${currency.format(Math.abs(settlement.final))}`;

  return (
    <div className="space-y-5">
      <section className="hero-balance-card p-5">
        <p className="text-sm font-medium text-slate-300">Saldo de repasses</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">
          {finalLabel}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="hero-balance-tile p-3">
            <p className="text-xs text-slate-300">A receber</p>
            <p className="mt-1 font-semibold">
              {currency.format(settlement.receive)}
            </p>
          </div>
          <div className="hero-balance-tile p-3">
            <p className="text-xs text-slate-300">A pagar</p>
            <p className="mt-1 font-semibold">
              {currency.format(settlement.pay)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Base protegida" value={currency.format(ownBase)} />
        <Metric
          label="Mensais privadas"
          value={currency.format(privateMonthlyTotal)}
        />
        <Metric
          label="Mensais em grupos"
          value={currency.format(sharedMonthlyTotal)}
        />
        <Metric label="Dívidas abertas" value={currency.format(debtOpenTotal)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="font-semibold">Grupos ativos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Despesas são lançadas dentro de grupos.
              </p>
            </div>
            <GhostButton onClick={() => setView("groups")}>Ver</GhostButton>
          </div>
          <div className="divide-y divide-slate-100">
            {groups.map((group) => {
              const total = group.items.reduce(
                (sum, item) => sum + item.amount,
                0,
              );

              return (
                <article className="flex items-start justify-between gap-3 p-4" key={group.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="font-semibold">{group.name}</p>
                      <strong>{currency.format(total)}</strong>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {group.members.length} membros - {splitLabels[group.defaultSplitMode]} -{" "}
                      {group.items.length} despesas
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-semibold">Privacidade</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Grupos calculam sua parte sem mostrar salário, entradas privadas,
            base protegida ou dívidas pessoais para outros membros.
          </p>
          <div className="mt-4 space-y-2">
            <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-950">
              Resultado exposto: valor a pagar ou receber.
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              Dados brutos ficam privados por usuário.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function GroupsView({
  groups,
  openComposer,
  setInviteGroupId,
  setView,
}: {
  groups: SharedGroup[];
  openComposer: (composer: Exclude<Composer, null>) => void;
  setInviteGroupId: (value: string) => void;
  setView: (view: View) => void;
}) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Grupos de divisão</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada grupo tem membros, regra padrão e despesas próprias.
            </p>
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={() => openComposer("group")}>
              Novo grupo
            </GhostButton>
            <PrimaryButton onClick={() => openComposer("groupExpense")}>
              Despesa
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      {groups.map((group) => {
        const total = group.items.reduce((sum, item) => sum + item.amount, 0);
        const isExpanded = expandedGroupId === group.id;

        return (
          <Panel className="overflow-hidden" key={group.id}>
            <div className="border-b border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <strong className="text-base">{currency.format(total)}</strong>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-slate-500">
                    {group.description}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    type="button"
                  >
                    {isExpanded ? "Ocultar" : "Ver"}
                  </button>
                  <button
                    className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700"
                    onClick={() => {
                      setInviteGroupId(group.id);
                      setView("invites");
                    }}
                    type="button"
                  >
                    Link
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full bg-slate-50 px-3 py-1.5">
                  {group.members.length} membros
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1.5">
                  {splitLabels[group.defaultSplitMode]}
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1.5">
                  {group.items.length} despesas
                </span>
              </div>
            </div>
            {isExpanded && (
              <div className="divide-y divide-slate-100">
              {group.items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  Nenhuma despesa lançada nesse grupo.
                </p>
              ) : (
                group.items.map((item) => (
                  <article
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    key={item.id}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-snug text-slate-500">
                          {(item.payments?.length
                            ? item.payments
                                .map(
                                  (payment) =>
                                    `${peopleById[payment.userId] ?? payment.userId} ${currency.format(payment.amount)}`,
                                )
                                .join(", ")
                            : peopleById[item.paidByUserId])} -{" "}
                        {splitLabels[item.splitMode]}
                        {" - "}
                        {item.recurrence === "monthly" ? "Mensal" : "Unica"}
                      </p>
                    </div>
                    <strong className="shrink-0 text-right">
                      {currency.format(item.amount)}
                    </strong>
                  </article>
                ))
              )}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function EntriesView({
  entries,
  getCategory,
  openComposer,
}: {
  entries: FinancialEntry[];
  getCategory: (categoryId: string) => Category | undefined;
  openComposer: (composer: Exclude<Composer, null>) => void;
}) {
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-semibold">Histórico</h2>
            <p className="mt-1 text-sm text-slate-500">
              Entradas e saídas privadas do mês.
            </p>
          </div>
          <PrimaryButton onClick={() => openComposer("entry")}>Novo</PrimaryButton>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const category = getCategory(entry.categoryId);
            return (
              <article
                className="flex items-start justify-between gap-3 p-4"
                key={entry.id}
              >
                <div className="min-w-0">
                  <p className="font-medium">{entry.description}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {category?.name} -{" "}
                    {entry.type === "income" ? "Entrada" : "Saída"}
                  </p>
                </div>
                <span className="hidden">{entry.date}</span>
                <strong
                  className={
                    entry.type === "income" ? "shrink-0 text-right text-emerald-700" : "shrink-0 text-right text-amber-700"
                  }
                >
                  {currency.format(entry.amount)}
                </strong>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function MonthlyView({
  items,
  openComposer,
}: {
  items: MonthlyCommitment[];
  openComposer: (composer: Exclude<Composer, null>) => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="font-semibold">Compromissos mensais</h2>
          <p className="mt-1 text-sm text-slate-500">
            Contas fixas, assinaturas e despesas mensais.
          </p>
        </div>
        <PrimaryButton onClick={() => openComposer("monthly")}>Nova</PrimaryButton>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <article className="flex items-start justify-between gap-3 p-4" key={item.id}>
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm leading-snug text-slate-500">
                Vence dia {item.dueDay} - {item.scope === "shared" ? "Compartilhada" : "Privada"} - Ativa
              </p>
            </div>
            <strong className="shrink-0 text-right">{currency.format(item.amount)}</strong>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function DebtsView({
  items,
  openComposer,
}: {
  items: RecurringDebt[];
  openComposer: (composer: Exclude<Composer, null>) => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="font-semibold">Dívidas e parcelamentos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe parcelas e o que deduz da base.
          </p>
        </div>
        <PrimaryButton onClick={() => openComposer("debt")}>Nova</PrimaryButton>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const progress = (item.paidInstallments / item.totalInstallments) * 100;
          return (
            <article className="p-4" key={item.id}>
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.creditor} - próxima em {item.nextDueDate}
                  </p>
                </div>
                <strong className="shrink-0 text-right">{currency.format(item.installmentAmount)}</strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {item.paidInstallments}/{item.totalInstallments} parcelas -{" "}
                {item.protectedDeduction ? "deduz da base" : "fora da base"}
              </p>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function CategoriesView({
  categories,
  deleteCategory,
  editCategory,
  openComposer,
}: {
  categories: Category[];
  deleteCategory: (categoryId: string) => void;
  editCategory: (category: Category) => void;
  openComposer: (composer: Exclude<Composer, null>) => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
        <h2 className="font-semibold">Categorias e regras</h2>
        <p className="mt-1 text-sm text-slate-500">
          A categoria decide privacidade, base e regra padrão.
        </p>
        </div>
        <PrimaryButton onClick={() => openComposer("category")}>Nova</PrimaryButton>
      </div>
      <div className="divide-y divide-slate-100">
        {categories.map((category) => (
          <article
            className="p-4 text-sm text-slate-500"
            key={category.id}
          >
            <p className="mb-1 text-base font-medium text-slate-950">{category.name}</p>
            <span className="mr-2">
              {category.type === "income" ? "Entrada" : "Saída"}
            </span>
            <span className="mr-2">
              {category.visibility === "private" ? "Privada" : "Compartilhada"}
            </span>
            <span className="mr-2">
              {category.baseBehavior === "include"
                ? `${category.basePercent}% entra na base`
                : category.baseBehavior === "deduct"
                  ? `${category.basePercent}% deduz da base`
                  : "Fora da base"}
            </span>
            <span className="mr-2">
              {category.defaultSplitMode
                ? splitLabels[category.defaultSplitMode]
                : "Sem divisão"}
            </span>
            <div className="mt-2 flex gap-3">
              <button
                className="text-sm font-semibold text-slate-700"
                onClick={() => editCategory(category)}
                type="button"
              >
                Editar
              </button>
              <button
                className="text-sm font-semibold text-orange-700"
                onClick={() => deleteCategory(category.id)}
                type="button"
              >
                Remover
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function InvitesView({
  connections,
  groups,
  inviteGroupId,
  onConnectionSubmit,
  setInviteGroupId,
}: {
  connections: Connection[];
  groups: SharedGroup[];
  inviteGroupId: string;
  onConnectionSubmit: (event: FormEvent<HTMLFormElement>, value: string) => void;
  setInviteGroupId: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const group = groups.find((item) => item.id === inviteGroupId) ?? groups[0];
  const inviteLink = `https://finance.local/cadastro?convite=${group?.inviteCode ?? ""}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Panel className="overflow-hidden">
        <div className="bg-slate-950 p-5 text-white">
          <p className="text-sm font-medium text-slate-300">Convite por link</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Compartilhe o acesso ao grupo
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            A pessoa se cadastra pelo link e entra no grupo escolhido. Isso não
            libera seus lançamentos privados.
          </p>
        </div>
        <div className="grid gap-4 p-5">
          <Field label="Grupo">
            <Select
              onChange={(event) => setInviteGroupId(event.target.value)}
              value={group?.id}
            >
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Link
            </p>
            <p className="mt-2 break-all font-mono text-sm text-slate-800">
              {inviteLink}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={copyInvite}>
              {copied ? "Copiado" : "Copiar link"}
            </PrimaryButton>
            <GhostButton>Gerar novo link</GhostButton>
          </div>
        </div>
      </Panel>

      <Panel className="p-4">
        <h2 className="font-semibold">Convite manual</h2>
        <p className="mt-1 text-sm text-slate-500">
          Registro local para lembrar quem recebeu o link.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            onConnectionSubmit(event, draft);
            setDraft("");
          }}
        >
          <Field label="Nome">
            <Input
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nome do convidado"
              value={draft}
            />
          </Field>
          <PrimaryButton type="submit">Registrar convite</PrimaryButton>
        </form>

        <div className="mt-5 space-y-3">
          {connections.map((connection) => (
            <div
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              key={connection.id}
            >
              <div>
                <p className="font-medium">{connection.name}</p>
                <p className="text-sm text-slate-500">
                  {connection.activeSharedItems} grupos/itens
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {connection.status === "accepted" ? "Aceito" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ApiView() {
  const samplePayload = `{
  "intent": "create_group_expense",
  "groupId": "group-home",
  "title": "Mercado",
  "amount": 420,
  "splitMode": "proportional"
}`;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Panel className="p-4">
        <h2 className="font-semibold">API do app</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          A interface e uma futura IA devem falar com os mesmos contratos. O
          chat envia intenções estruturadas, e a API valida usuário, grupo,
          permissões e privacidade antes de persistir.
        </p>
        <div className="mt-4 grid gap-3">
          {[
            ["GET", "/api/finance/overview", "Resumo privado do usuário"],
            ["POST", "/api/entries", "Criar entrada ou saída privada"],
            ["POST", "/api/shared-items", "Criar despesa em grupo"],
            ["POST", "/api/assistant/intents", "Intenções vindas do chat"],
          ].map(([method, path, description]) => (
            <div
              className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[80px_1fr]"
              key={path}
            >
              <span className="rounded-lg bg-slate-950 px-2 py-1 text-center text-xs font-semibold text-white">
                {method}
              </span>
              <div>
                <p className="font-mono text-sm">{path}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="bg-slate-950 p-4 text-white">
        <h2 className="font-semibold">Payload de exemplo</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-black p-4 text-xs leading-6 text-slate-100">
          {samplePayload}
        </pre>
      </Panel>
    </div>
  );
}

function ComposerModal({
  activeGroup,
  categories,
  categoryDraft,
  composer,
  debtDraft,
  entryDraft,
  groupDraft,
  groupExpenseDraft,
  groups,
  monthlyDraft,
  onClose,
  onCategoryDraftChange,
  onCategorySubmit,
  onDebtDraftChange,
  onDebtSubmit,
  onEntryDraftChange,
  onEntrySubmit,
  onGroupDraftChange,
  onGroupExpenseDraftChange,
  onGroupExpenseSubmit,
  onGroupSubmit,
  onMonthlyDraftChange,
  onMonthlySubmit,
}: {
  activeGroup?: SharedGroup;
  categories: Category[];
  categoryDraft: {
    id: string;
    name: string;
    type: EntryType;
    visibility: "private" | "shared";
    baseBehavior: Category["baseBehavior"];
    basePercent: string;
    defaultSplitMode: SplitMode | "";
  };
  composer: Composer;
  debtDraft: {
    title: string;
    creditor: string;
    totalAmount: string;
    installmentAmount: string;
    totalInstallments: string;
    protectedDeduction: boolean;
  };
  entryDraft: {
    type: EntryType;
    description: string;
    amount: string;
    categoryId: string;
  };
  groupDraft: {
    name: string;
    description: string;
    defaultSplitMode: SplitMode;
  };
  groupExpenseDraft: {
    groupId: string;
    title: string;
    amount: string;
    paidByUserId: string;
    payments: Record<string, string>;
    splitMode: SplitMode | "group-default";
    recurrence: "once" | "monthly";
  };
  groups: SharedGroup[];
  monthlyDraft: {
    title: string;
    amount: string;
    dueDay: string;
    categoryId: string;
    scope: "private" | "shared";
  };
  onClose: () => void;
  onCategoryDraftChange: React.Dispatch<
    React.SetStateAction<{
      id: string;
      name: string;
      type: EntryType;
      visibility: "private" | "shared";
      baseBehavior: Category["baseBehavior"];
      basePercent: string;
      defaultSplitMode: SplitMode | "";
    }>
  >;
  onCategorySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDebtDraftChange: React.Dispatch<
    React.SetStateAction<{
      title: string;
      creditor: string;
      totalAmount: string;
      installmentAmount: string;
      totalInstallments: string;
      protectedDeduction: boolean;
    }>
  >;
  onDebtSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEntryDraftChange: React.Dispatch<
    React.SetStateAction<{
      type: EntryType;
      description: string;
      amount: string;
      categoryId: string;
    }>
  >;
  onEntrySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGroupDraftChange: React.Dispatch<
    React.SetStateAction<{
      name: string;
      description: string;
      defaultSplitMode: SplitMode;
    }>
  >;
  onGroupExpenseDraftChange: React.Dispatch<
    React.SetStateAction<{
      groupId: string;
      title: string;
      amount: string;
      paidByUserId: string;
      payments: Record<string, string>;
      splitMode: SplitMode | "group-default";
      recurrence: "once" | "monthly";
    }>
  >;
  onGroupExpenseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGroupSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMonthlyDraftChange: React.Dispatch<
    React.SetStateAction<{
      title: string;
      amount: string;
      dueDay: string;
      categoryId: string;
      scope: "private" | "shared";
    }>
  >;
  onMonthlySubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!composer) {
    return null;
  }

  const titles: Record<Exclude<Composer, null>, string> = {
    debt: "Nova dívida",
    entry: "Novo lançamento",
    category: categoryDraft.id ? "Editar categoria" : "Nova categoria",
    group: "Novo grupo",
    groupExpense: "Despesa no grupo",
    monthly: "Nova mensal",
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">
              Inserir
            </p>
            <h2 className="mt-1 text-xl font-semibold">{titles[composer]}</h2>
          </div>
          <button
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {composer === "entry" && (
            <form className="grid gap-3" onSubmit={onEntrySubmit}>
              <Field label="Tipo">
                <Select
                  onChange={(event) =>
                    onEntryDraftChange((current) => ({
                      ...current,
                      type: event.target.value as EntryType,
                      categoryId:
                        event.target.value === "income" ? "salary" : "personal",
                    }))
                  }
                  value={entryDraft.type}
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </Select>
              </Field>
              <Field label="Descrição">
                <Input
                  onChange={(event) =>
                    onEntryDraftChange((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={entryDraft.description}
                />
              </Field>
              <Field label="Valor">
                <Input
                  onChange={(event) =>
                    onEntryDraftChange((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  type="number"
                  value={entryDraft.amount}
                />
              </Field>
              <Field label="Categoria">
                <Select
                  onChange={(event) =>
                    onEntryDraftChange((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  value={entryDraft.categoryId}
                >
                  {categories
                    .filter((category) => category.type === entryDraft.type)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <PrimaryButton type="submit">Salvar lançamento</PrimaryButton>
            </form>
          )}

          {composer === "groupExpense" && (
            <form className="grid gap-3" onSubmit={onGroupExpenseSubmit}>
              <Field label="Grupo">
                <Select
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      groupId: event.target.value,
                    }))
                  }
                  value={groupExpenseDraft.groupId}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Descrição">
                <Input
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  value={groupExpenseDraft.title}
                />
              </Field>
              <Field label="Valor">
                <Input
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  type="number"
                  value={groupExpenseDraft.amount}
                />
              </Field>
              <div className="grid gap-2 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  Pagamentos realizados
                </p>
                {(activeGroup?.members ?? []).map((member) => (
                  <Field key={member.userId} label={member.name}>
                    <Input
                      onChange={(event) =>
                        onGroupExpenseDraftChange((current) => ({
                          ...current,
                          payments: {
                            ...current.payments,
                            [member.userId]: event.target.value,
                          },
                        }))
                      }
                      placeholder="0,00"
                      type="number"
                      value={groupExpenseDraft.payments[member.userId] ?? ""}
                    />
                  </Field>
                ))}
              </div>
              <Field label="Pago por">
                <Select
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      paidByUserId: event.target.value,
                    }))
                  }
                  value={groupExpenseDraft.paidByUserId}
                >
                  {(activeGroup?.members ?? []).map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Divisão">
                <Select
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      splitMode: event.target.value as SplitMode | "group-default",
                    }))
                  }
                  value={groupExpenseDraft.splitMode}
                >
                  <option value="group-default">Padrão do grupo</option>
                  <option value="equal">50/50</option>
                  <option value="proportional">Proporcional</option>
                  <option value="fixed_percent">Percentual fixo</option>
                  <option value="individual">Individual</option>
                </Select>
              </Field>
              <Field label="Recorrência">
                <Select
                  onChange={(event) =>
                    onGroupExpenseDraftChange((current) => ({
                      ...current,
                      recurrence: event.target.value as "once" | "monthly",
                    }))
                  }
                  value={groupExpenseDraft.recurrence}
                >
                  <option value="once">Única</option>
                  <option value="monthly">Mensal</option>
                </Select>
              </Field>
              <PrimaryButton type="submit">Adicionar ao grupo</PrimaryButton>
            </form>
          )}

          {composer === "monthly" && (
            <form className="grid gap-3" onSubmit={onMonthlySubmit}>
              <Field label="Nome">
                <Input
                  onChange={(event) =>
                    onMonthlyDraftChange((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  value={monthlyDraft.title}
                />
              </Field>
              <Field label="Valor">
                <Input
                  onChange={(event) =>
                    onMonthlyDraftChange((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  type="number"
                  value={monthlyDraft.amount}
                />
              </Field>
              <Field label="Vencimento">
                <Input
                  max={31}
                  min={1}
                  onChange={(event) =>
                    onMonthlyDraftChange((current) => ({
                      ...current,
                      dueDay: event.target.value,
                    }))
                  }
                  type="number"
                  value={monthlyDraft.dueDay}
                />
              </Field>
              <Field label="Escopo">
                <Select
                  onChange={(event) =>
                    onMonthlyDraftChange((current) => ({
                      ...current,
                      scope: event.target.value as "private" | "shared",
                    }))
                  }
                  value={monthlyDraft.scope}
                >
                  <option value="private">Privada</option>
                  <option value="shared">Compartilhada</option>
                </Select>
              </Field>
              <Field label="Categoria">
                <Select
                  onChange={(event) =>
                    onMonthlyDraftChange((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  value={monthlyDraft.categoryId}
                >
                  {categories
                    .filter((category) => category.type === "expense")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <PrimaryButton type="submit">Adicionar mensal</PrimaryButton>
            </form>
          )}

          {composer === "debt" && (
            <form className="grid gap-3" onSubmit={onDebtSubmit}>
              <Field label="Nome">
                <Input
                  onChange={(event) =>
                    onDebtDraftChange((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  value={debtDraft.title}
                />
              </Field>
              <Field label="Credor">
                <Input
                  onChange={(event) =>
                    onDebtDraftChange((current) => ({
                      ...current,
                      creditor: event.target.value,
                    }))
                  }
                  value={debtDraft.creditor}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total">
                  <Input
                    onChange={(event) =>
                      onDebtDraftChange((current) => ({
                        ...current,
                        totalAmount: event.target.value,
                      }))
                    }
                    type="number"
                    value={debtDraft.totalAmount}
                  />
                </Field>
                <Field label="Parcela">
                  <Input
                    onChange={(event) =>
                      onDebtDraftChange((current) => ({
                        ...current,
                        installmentAmount: event.target.value,
                      }))
                    }
                    type="number"
                    value={debtDraft.installmentAmount}
                  />
                </Field>
              </div>
              <Field label="Parcelas">
                <Input
                  onChange={(event) =>
                    onDebtDraftChange((current) => ({
                      ...current,
                      totalInstallments: event.target.value,
                    }))
                  }
                  type="number"
                  value={debtDraft.totalInstallments}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  checked={debtDraft.protectedDeduction}
                  onChange={(event) =>
                    onDebtDraftChange((current) => ({
                      ...current,
                      protectedDeduction: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Deduzir da base protegida
              </label>
              <PrimaryButton type="submit">Adicionar dívida</PrimaryButton>
            </form>
          )}

          {composer === "category" && (
            <form className="grid gap-3" onSubmit={onCategorySubmit}>
              <Field label="Nome">
                <Input
                  onChange={(event) =>
                    onCategoryDraftChange((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={categoryDraft.name}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <Select
                    onChange={(event) =>
                      onCategoryDraftChange((current) => ({
                        ...current,
                        type: event.target.value as EntryType,
                      }))
                    }
                    value={categoryDraft.type}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saida</option>
                  </Select>
                </Field>
                <Field label="Privacidade">
                  <Select
                    onChange={(event) =>
                      onCategoryDraftChange((current) => ({
                        ...current,
                        visibility: event.target.value as "private" | "shared",
                      }))
                    }
                    value={categoryDraft.visibility}
                  >
                    <option value="private">Privada</option>
                    <option value="shared">Compartilhada</option>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base">
                  <Select
                    onChange={(event) =>
                      onCategoryDraftChange((current) => ({
                        ...current,
                        baseBehavior: event.target.value as Category["baseBehavior"],
                      }))
                    }
                    value={categoryDraft.baseBehavior}
                  >
                    <option value="include">Entra na base</option>
                    <option value="deduct">Deduz da base</option>
                    <option value="ignore">Fora da base</option>
                  </Select>
                </Field>
                <Field label="Percentual">
                  <Input
                    max="100"
                    min="0"
                    onChange={(event) =>
                      onCategoryDraftChange((current) => ({
                        ...current,
                        basePercent: event.target.value,
                      }))
                    }
                    type="number"
                    value={categoryDraft.basePercent}
                  />
                </Field>
              </div>
              <Field label="Divisao padrao">
                <Select
                  onChange={(event) =>
                    onCategoryDraftChange((current) => ({
                      ...current,
                      defaultSplitMode: event.target.value as SplitMode | "",
                    }))
                  }
                  value={categoryDraft.defaultSplitMode}
                >
                  <option value="">Sem divisao</option>
                  <option value="equal">50/50</option>
                  <option value="proportional">Proporcional</option>
                  <option value="fixed_percent">Percentual fixo</option>
                  <option value="individual">Individual</option>
                </Select>
              </Field>
              <PrimaryButton type="submit">
                {categoryDraft.id ? "Atualizar categoria" : "Criar categoria"}
              </PrimaryButton>
            </form>
          )}

          {composer === "group" && (
            <form className="grid gap-3" onSubmit={onGroupSubmit}>
              <Field label="Nome do grupo">
                <Input
                  onChange={(event) =>
                    onGroupDraftChange((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={groupDraft.name}
                />
              </Field>
              <Field label="Descrição">
                <Input
                  onChange={(event) =>
                    onGroupDraftChange((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={groupDraft.description}
                />
              </Field>
              <Field label="Divisão padrão">
                <Select
                  onChange={(event) =>
                    onGroupDraftChange((current) => ({
                      ...current,
                      defaultSplitMode: event.target.value as SplitMode,
                    }))
                  }
                  value={groupDraft.defaultSplitMode}
                >
                  <option value="equal">50/50</option>
                  <option value="proportional">Proporcional</option>
                  <option value="fixed_percent">Percentual fixo</option>
                  <option value="individual">Individual</option>
                </Select>
              </Field>
              <PrimaryButton type="submit">Criar grupo</PrimaryButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionSheet({
  open,
  onClose,
  openComposer,
}: {
  open: boolean;
  onClose: () => void;
  openComposer: (composer: Exclude<Composer, null>) => void;
}) {
  if (!open) {
    return null;
  }

  const actions: Array<[string, string, Exclude<Composer, null>]> = [
    ["Lançamento", "Entrada ou saída privada", "entry"],
    ["Despesa no grupo", "Divide com membros do grupo", "groupExpense"],
    ["Mensal", "Conta fixa ou assinatura", "monthly"],
    ["Dívida", "Parcelamento recorrente", "debt"],
    ["Grupo", "Cria um novo grupo de divisão", "group"],
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 px-4 pb-24 pt-24 backdrop-blur-sm">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Inserir</h2>
          <button
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {actions.map(([title, description, composerType]) => (
            <button
              className="rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50"
              key={title}
              onClick={() => openComposer(composerType)}
              type="button"
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: "home" | "groups" | "monthly" | "more" }) {
  const common = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
        <path d="M10 19v-5h4v5" />
      </svg>
    );
  }

  if (name === "groups") {
    return (
      <svg {...common}>
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M3.5 19c.6-3 2.1-4.5 4.5-4.5S11.9 16 12.5 19" />
        <path d="M13.5 18.5c.6-2.1 1.8-3.2 3.7-3.2 1.8 0 3 1.1 3.4 3.2" />
      </svg>
    );
  }

  if (name === "monthly") {
    return (
      <svg {...common}>
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <path d="M5 8h14" />
        <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
        <path d="M8 12h2" />
        <path d="M14 12h2" />
        <path d="M8 16h2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
      <path d="M5 12a.5.5 0 1 0 0 .01" />
      <path d="M12 12a.5.5 0 1 0 0 .01" />
      <path d="M19 12a.5.5 0 1 0 0 .01" />
    </svg>
  );
}

function BottomNav({
  activeView,
  actionOpen,
  setActionOpen,
  setView,
}: {
  activeView: View;
  actionOpen: boolean;
  setActionOpen: (value: boolean) => void;
  setView: (view: View) => void;
}) {
  const items: Array<[string, View | "more"]> = [
    ["Resumo", "home"],
    ["Grupos", "groups"],
    ["Mensais", "monthly"],
    ["Mais", "more"],
  ];

  return (
    <nav className="bottom-nav-wrap">
      <div className="bottom-nav-shadow" />
      <div className="bottom-nav-shell">
        {items.slice(0, 2).map(([label, view]) => (
          <button
            className={`bottom-nav-item ${
              activeView === view ? "is-active" : ""
            }`}
            key={label}
            onClick={() => setView(view as View)}
            type="button"
          >
            <NavIcon name={view === "home" ? "home" : "groups"} />
            {label}
          </button>
        ))}

        <button
          aria-label="Inserir"
          className={`bottom-nav-plus ${actionOpen ? "is-open" : ""}`}
          onClick={() => setActionOpen(!actionOpen)}
          type="button"
        >
          +
        </button>

        {items.slice(2).map(([label, view]) => (
          <button
            className={`bottom-nav-item ${
              activeView === view ||
              (view === "more" &&
                ["categories", "invites", "api", "debts", "entries", "more"].includes(
                  activeView,
                ))
                ? "is-active"
                : ""
            }`}
            key={label}
            onClick={() => {
              setActionOpen(false);
              setView(view as View);
            }}
            type="button"
          >
            <NavIcon name={view === "monthly" ? "monthly" : "more"} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function MoreView({
  onLogout,
  setView,
  userEmail,
}: {
  onLogout?: () => void;
  setView: (view: View) => void;
  userEmail?: string;
}) {
  const shortcuts: Array<[View, string, string]> = [
    ["entries", "Lancamentos", "Entradas, saidas e historico"],
    ["debts", "Dividas", "Parcelas e saldos em aberto"],
    ["categories", "Categorias", "Regras de base, privacidade e divisao"],
    ["invites", "Convites", "Links para grupos compartilhados"],
    ["api", "API", "Contratos para chat e automacoes"],
  ];

  const accountItems = [
    ["Perfil", "Nome, foto e dados da conta"],
    ["Configuracoes", "Privacidade, moeda e preferencias"],
    ["Seguranca", "Senha, sessoes e acesso"],
    ["Sair da conta", "Encerrar sessao neste aparelho"],
  ];
  const displayName = userEmail?.split("@")[0] || "Usuario";

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-lg font-semibold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{displayName}</h2>
            <p className="truncate text-sm text-slate-500">
              {userEmail || "Conta pessoal privada"}
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold">Sistema</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {shortcuts.map(([view, title, description]) => (
            <button
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              key={view}
              onClick={() => setView(view)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
              </span>
              <span className="text-lg text-slate-400">›</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold">Conta</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {accountItems.map(([title, description]) => (
            <button
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              key={title}
              onClick={title === "Sair da conta" ? onLogout : undefined}
              type="button"
            >
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
              </span>
              <span className="text-lg text-slate-400">›</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MoreSheet({
  open,
  onClose,
  setView,
}: {
  open: boolean;
  onClose: () => void;
  setView: (view: View) => void;
}) {
  if (!open) {
    return null;
  }

  const options: Array<[View, string]> = [
    ["entries", "Lançamentos"],
    ["debts", "Dívidas"],
    ["categories", "Categorias"],
    ["invites", "Convites"],
    ["api", "API"],
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 px-4 pb-28 pt-24 backdrop-blur-sm">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Mais opções</h2>
          <button
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {options.map(([view, label]) => (
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold"
              key={view}
              onClick={() => setView(view)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
