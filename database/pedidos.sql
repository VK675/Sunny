-- =========================================================================
--  Sunny — PEDIDOS de orçamento / instalação (leads por utilizador)
--  Executar no SQL Editor do Supabase (depois de schema.sql).
--  Idempotente: pode correr-se de novo sem erro.
--  Cada utilizador autenticado vê e cria apenas os SEUS pedidos (RLS).
-- =========================================================================
create table if not exists public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  nome             text,
  contacto         text,          -- telefone / WhatsApp
  email            text,
  localidade       text,
  tipo_propriedade text,
  proprietario     text,
  ocupacao         text,
  procura          text,          -- inclui "Só equipamento (entrega)"
  gasto_mensal     text,
  financiamento    text,
  prazo            text,
  notas            text,
  solucao          jsonb,         -- foto da solução escolhida no cálculo (opcional)
  estado           text default 'novo',
  created_at       timestamptz default now()
);
alter table public.pedidos enable row level security;
drop policy if exists "pedidos proprios" on public.pedidos;
create policy "pedidos proprios" on public.pedidos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
