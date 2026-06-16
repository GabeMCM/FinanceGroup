import { NextRequest, NextResponse } from "next/server";

type AssistantIntentPayload = {
  intent?: string;
  title?: string;
  amount?: number;
  groupId?: string;
  participantId?: string;
  splitMode?: string;
  notes?: string;
};

function isAssistantIntentPayload(value: unknown): value is AssistantIntentPayload {
  return Boolean(value && typeof value === "object");
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json();

  if (!isAssistantIntentPayload(payload)) {
    return NextResponse.json(
      { error: "Payload inválido para intenção do assistente." },
      { status: 400 },
    );
  }

  if (
    payload.intent === "create_group_expense" ||
    payload.intent === "create_shared_expense"
  ) {
    return NextResponse.json({
      accepted: true,
      action: "create_group_expense",
      normalized: {
        groupId: payload.groupId ?? "group-home",
        title: payload.title,
        amount: payload.amount,
        participantId: payload.participantId,
        splitMode: payload.splitMode ?? "equal",
      },
      safety:
        "A API aceita a intenção, mas a gravação futura deve validar autenticação, vínculo e RLS.",
    });
  }

  if (payload.intent === "create_private_entry") {
    return NextResponse.json({
      accepted: true,
      action: "create_private_entry",
      normalized: payload,
      safety:
        "Lançamentos privados nunca devem ser expostos em respostas de terceiros.",
    });
  }

  return NextResponse.json(
    {
      accepted: false,
      error: "Intenção ainda não suportada.",
      supportedIntents: ["create_group_expense", "create_private_entry"],
    },
    { status: 422 },
  );
}
