/* =========================================================================
   Solário — gerador do SEED do catálogo para o Supabase
   Executa:  node scripts/gen-seed.js   →   escreve ../database/seed.sql
   Lê PAINEIS_DB de ../js/paineis.js e produz um INSERT em massa.
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---- ler o array PAINEIS_DB do ficheiro do browser ---- */
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'paineis.js'), 'utf8');
const arrStr = src.slice(src.indexOf('['), src.lastIndexOf(']') + 1);
const PAINEIS = JSON.parse(arrStr);

/* ---- colunas da tabela (snake_case) ↔ campos do objeto (camelCase) ---- */
const cols = ['id','marca','serie','modelo','potencia','rendimento','area','comprimento',
  'largura','peso','celulas','tec','bifacial','cor','segmento','tier','garantia_produto',
  'garantia_potencia','degradacao_ano','coef_temp','preco','preco_wp'];
const field = {                         // coluna SQL → campo JS (só os que diferem)
  garantia_produto:'garantiaProduto', garantia_potencia:'garantiaPotencia',
  degradacao_ano:'degradacaoAno', coef_temp:'coefTemp', preco_wp:'precoWp'
};
const q = v =>
  typeof v === 'string'  ? `'${v.replace(/'/g, "''")}'` :
  typeof v === 'boolean' ? (v ? 'true' : 'false') :
  v == null ? 'null' : v;

const rows = PAINEIS
  .map(p => '  (' + cols.map(c => q(p[field[c] || c])).join(', ') + ')')
  .join(',\n');

const sql =
`-- =========================================================================
--  Solário — SEED do catálogo (${PAINEIS.length} painéis)
--  GERADO por scripts/gen-seed.js — NÃO editar à mão.
--  Executar no SQL Editor do Supabase DEPOIS de schema.sql.
--  (truncate limpa o catálogo antes de recarregar — favoritos referentes
--   a painéis também são removidos via cascade.)
-- =========================================================================
truncate table public.paineis cascade;
insert into public.paineis (${cols.join(', ')}) values
${rows};
`;

const out = path.join(__dirname, '..', 'database', 'seed.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log(`✓ seed.sql gerado com ${PAINEIS.length} painéis → ${out}`);
