# Deploy

## Ordem recomendada

1. Crie o projeto no Supabase.
2. Conecte o repositório no Supabase e aplique as migrations em `supabase/migrations`.
3. Copie `Project URL` e `anon public key` do Supabase.
4. Crie o projeto na Vercel conectado ao mesmo repositório.
5. Configure na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

6. Faça o deploy na Vercel.

## Observação

Supabase hospeda banco, auth e storage. Vercel hospeda o app Next.js.
