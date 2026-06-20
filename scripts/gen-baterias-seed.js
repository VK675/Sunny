/* =========================================================================
   Solário — gerador do SQL das BATERIAS para o Supabase
   Executa:  node scripts/gen-baterias-seed.js  →  escreve ../database/baterias.sql
   Lê BATERIAS_DB de ../js/baterias.js e produz: create table + RLS + seed.
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---- ler o array BATERIAS_DB do ficheiro do browser ---- */
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'baterias.js'), 'utf8');
const arrStr = src.slice(src.indexOf('['), src.lastIndexOf(']') + 1);
const BATERIAS = eval(arrStr);   // contém comentários → eval em vez de JSON.parse

/* ---- colunas da tabela (snake_case) ↔ campos do objeto (camelCase) ---- */
const cols = ['id','marca','serie','modelo','capacidade','capacidade_util','potencia',
  'quimica','tensao','modular','ciclos','dod','eficiencia','garantia','peso','preco',
  'preco_kwh','tier'];
const field = { capacidade_util:'capacidadeUtil', preco_kwh:'precoKwh' };
const q = v =>
  typeof v === 'string'  ? `'${v.replace(/'/g, "''")}'` :
  typeof v === 'boolean' ? (v ? 'true' : 'false') :
  v == null ? 'null' : v;

const rows = BATERIAS
  .map(b => '  (' + cols.map(c => q(b[field[c] || c])).join(', ') + ')')
  .join(',\n');

const sql =
`-- =========================================================================
--  Solário — BATERIAS: tabela + seed (${BATERIAS.length} modelos reais)
--  GERADO por scripts/gen-baterias-seed.js — NÃO editar à mão.
--  Executar no SQL Editor do Supabase (depois de schema.sql).
--  Idempotente: pode correr-se de novo sem erro.
-- =========================================================================

create table if not exists public.baterias (
  id              text primary key,
  marca           text,
  serie           text,
  modelo          text,
  capacidade      numeric,
  capacidade_util numeric,
  potencia        numeric,
  quimica         text,
  tensao          text,
  modular         boolean,
  ciclos          int,
  dod             int,
  eficiencia      int,
  garantia        int,
  peso            numeric,
  preco           int,
  preco_kwh       int,
  tier            text
);
alter table public.baterias enable row level security;
drop policy if exists "baterias: leitura publica" on public.baterias;
create policy "baterias: leitura publica" on public.baterias for select using (true);

truncate table public.baterias;
insert into public.baterias (${cols.join(', ')}) values
${rows};
`;

const out = path.join(__dirname, '..', 'database', 'baterias.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log(`✓ baterias.sql gerado com ${BATERIAS.length} baterias → ${out}`);
