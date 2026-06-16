# FinanceGroup

FinanceGroup e um app web mobile-first para gestao financeira privada entre pessoas, familias ou grupos que dividem despesas.

O foco nao e expor renda, saldo ou gastos pessoais. O app calcula repasses e saldos entre participantes mantendo dados sensiveis privados por usuario.

## Ideia central

- Tudo nasce privado por padrao.
- Cada usuario tem suas proprias categorias, entradas, saidas, dividas e bases de calculo.
- Despesas compartilhadas acontecem dentro de grupos.
- Cada grupo pode ter regra de divisao propria: 50/50, proporcional, percentual fixo ou individual.
- Uma despesa de grupo pode registrar quanto cada integrante ja pagou.
- O sistema calcula quem deve pagar, quem deve receber e o saldo final.

## Funcionalidades atuais

- Login e cadastro com Supabase Auth.
- Perfil basico de usuario.
- Dashboard mobile-first.
- Categorias individuais por usuario.
- Lancamentos privados.
- Compromissos mensais.
- Dividas e parcelamentos.
- Grupos compartilhados.
- Convites por link.
- Despesas de grupo com pagamentos por membro.
- API preparada para integracao futura com IA/chat.
- Schema Supabase com RLS para isolamento de dados.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Vercel
- Yarn

## Variaveis de ambiente

Crie um `.env.local` apenas para desenvolvimento local:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Na Vercel, configure as mesmas variaveis em **Settings > Environment Variables**.

## Desenvolvimento

```bash
yarn install
yarn dev
```

Abra:

```text
http://127.0.0.1:3001
```

## Banco de dados

O schema esta em:

```text
supabase/migrations/202606160001_initial_schema.sql
```

Para configurar manualmente:

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Cole e execute o conteudo da migration.
4. Copie `Project URL` e `publishable key`.
5. Configure as variaveis no ambiente local ou na Vercel.

## Deploy

A ordem recomendada e:

1. Configurar Supabase.
2. Aplicar migrations.
3. Configurar variaveis na Vercel.
4. Fazer deploy do app Next.js.

Mais detalhes em:

```text
docs/deploy.md
```

## Privacidade

O app foi desenhado para nunca exibir para outra pessoa:

- salario;
- ganhos privados;
- gastos pessoais;
- saldo disponivel;
- patrimonio;
- base financeira bruta.

O que pode ser compartilhado sao apenas resultados de divisao, repasses e saldos finais dentro dos grupos permitidos.
