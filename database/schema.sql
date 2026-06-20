-- =========================================================================
--  Solário — esquema da base de dados (Supabase / Postgres)
--  Executar UMA VEZ no SQL Editor do Supabase (antes do seed.sql).
--  Idempotente: pode correr-se de novo sem erro.
-- =========================================================================

-- ========== PERFIS (ligado a auth.users) ==========
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "perfil: ler"    on public.profiles;
drop policy if exists "perfil: criar"  on public.profiles;
drop policy if exists "perfil: editar" on public.profiles;
create policy "perfil: ler"    on public.profiles for select using (auth.uid() = id);
create policy "perfil: criar"  on public.profiles for insert with check (auth.uid() = id);
create policy "perfil: editar" on public.profiles for update using (auth.uid() = id);

-- cria automaticamente um perfil quando um utilizador se regista
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== REGIÕES (tabela do enunciado — leitura pública) ==========
-- Estrutura pedida: id, nome, producao_kwh_kwp, iva.
create table if not exists public.regioes (
  id                int primary key,
  nome              text,
  producao_kwh_kwp  int,      -- produção solar de referência (kWh/kWp/ano)
  iva               numeric   -- taxa de IVA aplicável (ex.: 0.23, 0.22, 0.16)
);
alter table public.regioes enable row level security;
drop policy if exists "regioes: leitura publica" on public.regioes;
create policy "regioes: leitura publica" on public.regioes for select using (true);

insert into public.regioes (id, nome, producao_kwh_kwp, iva) values
  (1, 'Norte (Porto)',       1300, 0.23),
  (2, 'Centro (Coimbra)',    1450, 0.23),
  (3, 'Lisboa',              1600, 0.23),
  (4, 'Alentejo (Évora)',    1650, 0.23),
  (5, 'Algarve (Faro)',      1680, 0.23),
  (6, 'Açores (P. Delgada)', 1400, 0.16),
  (7, 'Madeira (Funchal)',   1700, 0.22)
on conflict (id) do update
  set nome = excluded.nome,
      producao_kwh_kwp = excluded.producao_kwh_kwp,
      iva = excluded.iva;

-- ========== PAINÉIS (catálogo — leitura pública) ==========
create table if not exists public.paineis (
  id                text primary key,
  marca             text,
  serie             text,
  modelo            text,
  potencia          int,
  rendimento        numeric,
  area              numeric,
  comprimento       int,
  largura           int,
  peso              numeric,
  celulas           int,
  tec               text,
  bifacial          boolean,
  cor               text,
  segmento          text,
  tier              text,
  garantia_produto  int,
  garantia_potencia int,
  degradacao_ano    numeric,
  coef_temp         numeric,
  preco             int,
  preco_wp          numeric
);
alter table public.paineis enable row level security;
drop policy if exists "paineis: leitura publica" on public.paineis;
create policy "paineis: leitura publica" on public.paineis for select using (true);

-- ========== FAVORITOS (por utilizador) ==========
create table if not exists public.favoritos (
  user_id    uuid references auth.users(id) on delete cascade,
  painel_id  text references public.paineis(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, painel_id)
);
alter table public.favoritos enable row level security;
drop policy if exists "favoritos proprios" on public.favoritos;
create policy "favoritos proprios" on public.favoritos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== CÁLCULOS GUARDADOS (por utilizador) ==========
create table if not exists public.calculos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  regiao     text,
  conta      numeric,
  orcamento  numeric,
  tarifa     text,
  roof_area  numeric,
  resultado  jsonb,
  created_at timestamptz default now()
);
alter table public.calculos enable row level security;
drop policy if exists "calculos proprios" on public.calculos;
create policy "calculos proprios" on public.calculos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
