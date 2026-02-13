# ONMX® — Site

Landing page da ONMX®, construída com Vite + React + TypeScript + Tailwind (shadcn/ui).

## Supabase (MNNO)

Crie um arquivo `.env.local` (não comitar) baseado no `.env.example`:

```sh
cp .env.example .env.local
```

Preencha:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O client já está configurado em `src/lib/supabase/client.ts`.

## Rodar localmente

```sh
npm i
npm run dev
```

## Build

```sh
npm run build
npm run preview
```
