/* =========================================================================
   Solário — cliente Supabase + acesso a dados
   Requer: <script> do @supabase/supabase-js (CDN) e config.js antes deste.
   ========================================================================= */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* linha da BD (snake_case) → objeto usado na app (camelCase) */
function mapPainel(r){
  return {
    id:r.id, marca:r.marca, serie:r.serie, modelo:r.modelo,
    potencia:r.potencia, rendimento:r.rendimento, area:r.area,
    comprimento:r.comprimento, largura:r.largura, peso:r.peso,
    celulas:r.celulas, tec:r.tec, bifacial:r.bifacial, cor:r.cor,
    segmento:r.segmento, tier:r.tier,
    garantiaProduto:r.garantia_produto, garantiaPotencia:r.garantia_potencia,
    degradacaoAno:r.degradacao_ano, coefTemp:r.coef_temp,
    preco:r.preco, precoWp:r.preco_wp
  };
}

/* carrega a tabela Regioes (id, nome, producao_kwh_kwp, iva) do enunciado.
   Se existir, atualiza producao/iva no objeto REGIOES da app (chave = nome).
   Se a tabela ainda não existir, a app continua com os valores locais. */
async function fetchRegioes(){
  try {
    const { data, error } = await sb.from('regioes').select('*');
    if (error || !data || !data.length) return null;
    data.forEach(row => {
      if (typeof REGIOES !== 'undefined' && REGIOES[row.nome]){
        REGIOES[row.nome].producao = row.producao_kwh_kwp;
        REGIOES[row.nome].iva      = Number(row.iva);
      }
    });
    return data;
  } catch(e){ return null; }
}

/* carrega o catálogo completo da base de dados */
async function fetchPaineis(){
  const { data, error } = await sb.from('paineis').select('*').limit(1000);
  if (error) throw error;
  return data.map(mapPainel);
}

/* linha da BD (snake_case) → objeto bateria usado na app (camelCase) */
function mapBateria(r){
  return {
    id:r.id, marca:r.marca, serie:r.serie, modelo:r.modelo,
    capacidade:r.capacidade, capacidadeUtil:r.capacidade_util,
    potencia:r.potencia, quimica:r.quimica, tensao:r.tensao,
    modular:r.modular, ciclos:r.ciclos, dod:r.dod, eficiencia:r.eficiencia,
    garantia:r.garantia, peso:r.peso, preco:r.preco, precoKwh:r.preco_kwh,
    tier:r.tier
  };
}

/* carrega as baterias da BD; se a tabela ainda não existir,
   usa o catálogo local (baterias.js) como fallback */
async function fetchBaterias(){
  try {
    const { data, error } = await sb.from('baterias').select('*').limit(200);
    if (!error && data && data.length) return data.map(mapBateria);
  } catch(e){ /* tabela em falta ou sem rede — cai no fallback */ }
  return (typeof BATERIAS_DB !== 'undefined') ? BATERIAS_DB : [];
}

/* ---- favoritos (na BD, por utilizador) ---- */
async function fetchFavoritos(){
  const { data, error } = await sb.from('favoritos').select('painel_id');
  if (error) throw error;
  return new Set(data.map(r => r.painel_id));
}
async function addFavorito(userId, painelId){
  return sb.from('favoritos').insert({ user_id: userId, painel_id: painelId });
}
async function removeFavorito(userId, painelId){
  return sb.from('favoritos').delete().eq('user_id', userId).eq('painel_id', painelId);
}

/* ---- cálculos guardados (na BD, por utilizador) ---- */
async function fetchCalculos(){
  const { data, error } = await sb.from('calculos')
    .select('*').order('created_at', { ascending:false }).limit(20);
  if (error) throw error;
  return data;
}
async function saveCalculo(userId, payload){
  const { error } = await sb.from('calculos').insert({ user_id: userId, ...payload });
  if (error) throw error;
}
async function deleteCalculo(id){
  const { error } = await sb.from('calculos').delete().eq('id', id);
  if (error) throw error;
}

/* ---- pedidos de orçamento / instalação (na BD, por utilizador) ---- */
async function fetchPedidos(){
  const { data, error } = await sb.from('pedidos')
    .select('*').order('created_at', { ascending:false }).limit(20);
  if (error) throw error;
  return data;
}
async function savePedido(userId, payload){
  const { data, error } = await sb.from('pedidos')
    .insert({ user_id: userId, ...payload }).select().single();
  if (error) throw error;
  return data;
}
