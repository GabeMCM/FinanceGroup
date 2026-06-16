export type EntryType = "income" | "expense";
export type Visibility = "private" | "shared";
export type BaseBehavior = "include" | "deduct" | "ignore";
export type SplitMode = "equal" | "proportional" | "fixed_percent" | "individual";
export type ConnectionStatus = "accepted" | "pending";

export type Category = {
  id: string;
  userId: string;
  name: string;
  type: EntryType;
  visibility: Visibility;
  baseBehavior: BaseBehavior;
  basePercent: number;
  defaultSplitMode?: SplitMode;
};

export type FinancialEntry = {
  id: string;
  userId: string;
  type: EntryType;
  date: string;
  description: string;
  amount: number;
  categoryId: string;
  source: "manual" | "api";
};

export type MonthlyCommitment = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  categoryId: string;
  dueDay: number;
  scope: Visibility;
  status: "active" | "paused";
};

export type RecurringDebt = {
  id: string;
  userId: string;
  title: string;
  creditor: string;
  totalAmount: number;
  installmentAmount: number;
  paidInstallments: number;
  totalInstallments: number;
  nextDueDate: string;
  protectedDeduction: boolean;
};

export type Connection = {
  id: string;
  name: string;
  status: ConnectionStatus;
  activeSharedItems: number;
};

export type SharedParticipant = {
  userId: string;
  name: string;
  percent?: number;
  fixedAmount?: number;
};

export type SharedPayment = {
  userId: string;
  amount: number;
};

export type SharedItem = {
  id: string;
  groupId: string;
  title: string;
  categoryId: string;
  period: string;
  amount: number;
  paidByUserId: string;
  payments?: SharedPayment[];
  splitMode: SplitMode;
  recurrence: "once" | "monthly";
  participants: SharedParticipant[];
};

export type SharedGroup = {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  defaultSplitMode: SplitMode;
  members: SharedParticipant[];
  items: SharedItem[];
};

export type SettlementLine = {
  itemId: string;
  groupId: string;
  groupName: string;
  title: string;
  splitMode: SplitMode;
  total: number;
  yourShare: number;
  balance: number;
  paidBy: string;
  direction: "pay" | "receive" | "settled";
  counterpart: string;
};

export type SettlementSummary = {
  receive: number;
  pay: number;
  final: number;
  lines: SettlementLine[];
};

export const currentUserId = "user-you";

export const peopleById: Record<string, string> = {
  "user-you": "Você",
  marina: "Marina",
  caio: "Caio",
  ana: "Ana",
};

export const seedCategories: Category[] = [
  {
    id: "salary",
    userId: currentUserId,
    name: "Salário",
    type: "income",
    visibility: "private",
    baseBehavior: "include",
    basePercent: 100,
  },
  {
    id: "freelance",
    userId: currentUserId,
    name: "Freelance",
    type: "income",
    visibility: "private",
    baseBehavior: "include",
    basePercent: 50,
  },
  {
    id: "personal-sale",
    userId: currentUserId,
    name: "Venda pessoal",
    type: "income",
    visibility: "private",
    baseBehavior: "ignore",
    basePercent: 0,
  },
  {
    id: "home",
    userId: currentUserId,
    name: "Casa",
    type: "expense",
    visibility: "shared",
    baseBehavior: "ignore",
    basePercent: 0,
    defaultSplitMode: "proportional",
  },
  {
    id: "child",
    userId: currentUserId,
    name: "Filha",
    type: "expense",
    visibility: "shared",
    baseBehavior: "ignore",
    basePercent: 0,
    defaultSplitMode: "equal",
  },
  {
    id: "pension",
    userId: currentUserId,
    name: "Pensão",
    type: "expense",
    visibility: "private",
    baseBehavior: "deduct",
    basePercent: 100,
  },
  {
    id: "primary-health",
    userId: currentUserId,
    name: "Saúde obrigatória",
    type: "expense",
    visibility: "private",
    baseBehavior: "deduct",
    basePercent: 100,
  },
  {
    id: "personal",
    userId: currentUserId,
    name: "Pessoal",
    type: "expense",
    visibility: "private",
    baseBehavior: "ignore",
    basePercent: 0,
  },
  {
    id: "debt",
    userId: currentUserId,
    name: "Dívida recorrente",
    type: "expense",
    visibility: "private",
    baseBehavior: "deduct",
    basePercent: 100,
  },
];

export const seedEntries: FinancialEntry[] = [
  {
    id: "entry-1",
    userId: currentUserId,
    type: "income",
    date: "2026-06-05",
    description: "Salário líquido",
    amount: 5200,
    categoryId: "salary",
    source: "manual",
  },
  {
    id: "entry-2",
    userId: currentUserId,
    type: "income",
    date: "2026-06-12",
    description: "Freelance landing page",
    amount: 900,
    categoryId: "freelance",
    source: "manual",
  },
  {
    id: "entry-3",
    userId: currentUserId,
    type: "expense",
    date: "2026-06-10",
    description: "Pensão",
    amount: 1300,
    categoryId: "pension",
    source: "manual",
  },
  {
    id: "entry-4",
    userId: currentUserId,
    type: "expense",
    date: "2026-06-14",
    description: "Plano de saúde",
    amount: 420,
    categoryId: "primary-health",
    source: "manual",
  },
];

export const seedMonthlyCommitments: MonthlyCommitment[] = [
  {
    id: "monthly-1",
    userId: currentUserId,
    title: "Internet casa",
    amount: 140,
    categoryId: "home",
    dueDay: 8,
    scope: "shared",
    status: "active",
  },
  {
    id: "monthly-2",
    userId: currentUserId,
    title: "Academia",
    amount: 120,
    categoryId: "personal",
    dueDay: 12,
    scope: "private",
    status: "active",
  },
  {
    id: "monthly-3",
    userId: currentUserId,
    title: "Escola da filha",
    amount: 680,
    categoryId: "child",
    dueDay: 5,
    scope: "shared",
    status: "active",
  },
];

export const seedRecurringDebts: RecurringDebt[] = [
  {
    id: "debt-1",
    userId: currentUserId,
    title: "Empréstimo consignado",
    creditor: "Banco",
    totalAmount: 6000,
    installmentAmount: 500,
    paidInstallments: 4,
    totalInstallments: 12,
    nextDueDate: "2026-07-05",
    protectedDeduction: true,
  },
  {
    id: "debt-2",
    userId: currentUserId,
    title: "Notebook",
    creditor: "Cartão",
    totalAmount: 3600,
    installmentAmount: 300,
    paidInstallments: 2,
    totalInstallments: 12,
    nextDueDate: "2026-07-18",
    protectedDeduction: false,
  },
];

export const seedConnections: Connection[] = [
  { id: "marina", name: "Marina", status: "accepted", activeSharedItems: 3 },
  { id: "caio", name: "Caio", status: "accepted", activeSharedItems: 1 },
  { id: "ana", name: "Ana", status: "pending", activeSharedItems: 0 },
];

export const seedSharedGroups: SharedGroup[] = [
  {
    id: "group-home",
    name: "Casa",
    description: "Moradia, contas fixas e compras do mês.",
    inviteCode: "casa-7k2m",
    defaultSplitMode: "proportional",
    members: [
      { userId: currentUserId, name: "Você" },
      { userId: "marina", name: "Marina" },
    ],
    items: [
      {
        id: "shared-1",
        groupId: "group-home",
        title: "Aluguel e contas",
        categoryId: "home",
        period: "2026-06",
        amount: 2480,
        paidByUserId: "marina",
        splitMode: "proportional",
        recurrence: "monthly",
        participants: [
          { userId: currentUserId, name: "Você" },
          { userId: "marina", name: "Marina" },
        ],
      },
      {
        id: "shared-3",
        groupId: "group-home",
        title: "Internet do apartamento",
        categoryId: "home",
        period: "2026-06",
        amount: 140,
        paidByUserId: "marina",
        splitMode: "equal",
        recurrence: "monthly",
        participants: [
          { userId: currentUserId, name: "Você" },
          { userId: "marina", name: "Marina" },
        ],
      },
    ],
  },
  {
    id: "group-child",
    name: "Filha",
    description: "Saúde, escola, roupas e despesas da filha.",
    inviteCode: "filha-4p9x",
    defaultSplitMode: "equal",
    members: [
      { userId: currentUserId, name: "Você" },
      { userId: "marina", name: "Marina" },
    ],
    items: [
      {
        id: "shared-2",
        groupId: "group-child",
        title: "Remédios",
        categoryId: "child",
        period: "2026-06",
        amount: 320,
        paidByUserId: currentUserId,
        splitMode: "equal",
        recurrence: "once",
        participants: [
          { userId: currentUserId, name: "Você" },
          { userId: "marina", name: "Marina" },
        ],
      },
    ],
  },
  {
    id: "group-travel",
    name: "Viagem",
    description: "Viagens, reservas e gastos ocasionais em grupo.",
    inviteCode: "trip-2h8q",
    defaultSplitMode: "equal",
    members: [
      { userId: currentUserId, name: "Você" },
      { userId: "caio", name: "Caio" },
    ],
    items: [],
  },
];

export const seedSharedItems = seedSharedGroups.flatMap((group) => group.items);

export const protectedBaseByUserId: Record<string, number> = {
  "user-you": 3930,
  marina: 4720,
  caio: 3100,
  ana: 2600,
};

export function calculateProtectedBase(
  userId: string,
  entries: FinancialEntry[],
  categories: Category[],
) {
  return entries
    .filter((entry) => entry.userId === userId)
    .reduce((total, entry) => {
      const category = categories.find((item) => item.id === entry.categoryId);

      if (!category || category.baseBehavior === "ignore") {
        return total;
      }

      const consideredAmount = entry.amount * (category.basePercent / 100);
      return category.baseBehavior === "include"
        ? total + consideredAmount
        : total - consideredAmount;
    }, 0);
}

export function flattenGroupItems(groups: SharedGroup[]) {
  return groups.flatMap((group) => group.items);
}

export function getParticipantShares(
  item: SharedItem,
  bases: Record<string, number>,
) {
  if (item.splitMode === "equal") {
    const share = item.amount / item.participants.length;
    return Object.fromEntries(
      item.participants.map((participant) => [participant.userId, share]),
    );
  }

  if (item.splitMode === "fixed_percent") {
    return Object.fromEntries(
      item.participants.map((participant) => [
        participant.userId,
        item.amount * ((participant.percent ?? 0) / 100),
      ]),
    );
  }

  if (item.splitMode === "individual") {
    return Object.fromEntries(
      item.participants.map((participant) => [
        participant.userId,
        participant.fixedAmount ?? 0,
      ]),
    );
  }

  const totalBase = item.participants.reduce(
    (total, participant) => total + Math.max(bases[participant.userId] ?? 0, 0),
    0,
  );

  if (totalBase <= 0) {
    const fallbackShare = item.amount / item.participants.length;
    return Object.fromEntries(
      item.participants.map((participant) => [
        participant.userId,
        fallbackShare,
      ]),
    );
  }

  return Object.fromEntries(
    item.participants.map((participant) => [
      participant.userId,
      item.amount * ((bases[participant.userId] ?? 0) / totalBase),
    ]),
  );
}

export function calculateSettlement(
  currentUser: string,
  groups: SharedGroup[],
  bases: Record<string, number>,
): SettlementSummary {
  const lines = groups.flatMap((group) =>
    group.items
      .filter((item) =>
        item.participants.some(
          (participant) => participant.userId === currentUser,
        ),
      )
      .map((item) => {
        const shares = getParticipantShares(item, bases);
        const yourShare = shares[currentUser] ?? 0;
        const payments = item.payments?.length
          ? item.payments
          : [{ userId: item.paidByUserId, amount: item.amount }];
        const yourPaid = payments
          .filter((payment) => payment.userId === currentUser)
          .reduce((total, payment) => total + payment.amount, 0);
        const net = yourPaid - yourShare;
        const paidBy = payments
          .filter((payment) => payment.amount > 0)
          .map((payment) => peopleById[payment.userId] ?? payment.userId)
          .join(", ");

        return {
          itemId: item.id,
          groupId: group.id,
          groupName: group.name,
          title: item.title,
          splitMode: item.splitMode,
          total: item.amount,
          yourShare,
          balance: net,
          paidBy,
          direction: net > 0 ? "receive" : net < 0 ? "pay" : "settled",
          counterpart: "grupo",
        } satisfies SettlementLine;
      }),
  );

  const receive = lines
    .filter((line) => line.direction === "receive")
    .reduce((total, line) => total + Math.max(line.balance, 0), 0);

  const pay = lines
    .filter((line) => line.direction === "pay")
    .reduce((total, line) => total + Math.abs(Math.min(line.balance, 0)), 0);

  return {
    receive,
    pay,
    final: receive - pay,
    lines,
  };
}

export function getOverviewPayload() {
  const ownBase = calculateProtectedBase(
    currentUserId,
    seedEntries,
    seedCategories,
  );
  const bases = {
    ...protectedBaseByUserId,
    [currentUserId]: ownBase,
  };

  return {
    period: "2026-06",
    currentUserId,
    privacyMode: "private_by_default",
    protectedBase: {
      currentUser: ownBase,
      exposedToConnections: false,
    },
    settlement: calculateSettlement(currentUserId, seedSharedGroups, bases),
    entries: seedEntries,
    monthlyCommitments: seedMonthlyCommitments,
    recurringDebts: seedRecurringDebts,
    sharedGroups: seedSharedGroups,
    sharedItems: seedSharedItems,
    categories: seedCategories,
    connections: seedConnections,
  };
}
