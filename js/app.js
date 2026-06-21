/* ============ DADOS POR REGIÃO (PVGIS + tabela Regioes do projeto) ============ */
/* hsp = horas de Sol de pico por mês (kWh/m²/dia), plano inclinado ótimo, Jan..Dez
   producao = produção solar de referência (kWh/kWp/ano) — valor da tabela Regioes (ver enunciado)
   iva = taxa de IVA aplicável (enunciado): Continente 23% · Madeira 22% · Açores 16%
   zona = grupo do enunciado (Norte / Centro / Sul / Açores / Madeira) */
const REGIOES = {
  "Norte (Porto)":       {hsp:[2.7,3.5,4.5,5.0,5.6,6.0,6.5,6.2,5.0,3.8,2.8,2.5], producao:1300, iva:0.23, zona:'Norte',   lat:41.1},
  "Centro (Coimbra)":    {hsp:[3.0,3.8,4.8,5.4,6.0,6.6,7.0,6.6,5.4,4.2,3.1,2.8], producao:1450, iva:0.23, zona:'Centro',  lat:40.2},
  "Lisboa":              {hsp:[3.2,4.0,5.0,5.6,6.2,6.8,7.0,6.7,5.6,4.4,3.4,3.0], producao:1600, iva:0.23, zona:'Sul',     lat:38.7},
  "Alentejo (Évora)":    {hsp:[3.4,4.2,5.2,5.9,6.6,7.3,7.6,7.1,6.0,4.7,3.6,3.2], producao:1650, iva:0.23, zona:'Sul',     lat:38.6},
  "Algarve (Faro)":      {hsp:[3.5,4.3,5.3,6.0,6.6,7.2,7.4,7.0,6.0,4.8,3.7,3.3], producao:1680, iva:0.23, zona:'Sul',     lat:37.0},
  "Açores (P. Delgada)": {hsp:[2.5,3.0,3.8,4.5,5.0,5.2,5.6,5.6,4.8,3.6,2.7,2.3], producao:1400, iva:0.16, zona:'Açores',  lat:37.7},
  "Madeira (Funchal)":   {hsp:[3.3,4.0,4.8,5.4,5.8,6.2,6.6,6.5,5.6,4.6,3.6,3.1], producao:1700, iva:0.22, zona:'Madeira', lat:32.7},
};

/* ============ CONSTANTES ============ */
const RENDIMENTO  = 0.80;     // η (perdas: calor, inversor, pó)
const PRECO_VENDA = 0.05;     // € por kWh excedente vendido à rede
const FATOR_CO2   = 0.20;     // kg CO2 por kWh
const EXTRA_KW    = 1000;     // € por kW: inversor + estrutura + instalação
const DIAS  = [31,28,31,30,31,30,31,31,30,31,30,31];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/* estimativa teórica (fórmula da aula): η por gama do painel + Sol de referência */
const IRRADIACAO_BASE = 5;   // kWh/m²/dia — valor de referência (usamos o real da região)
const ETA_TIER = { 'Económico':18, 'Equilibrado':20, 'Premium':22 };

/* dica para aproveitar melhor a tarifa — os painéis cobrem o consumo mais caro */
const TARIFF_TIPS = {
  simples: 'Com tarifa simples o preço é igual a toda a hora: usa a energia mal é produzida — liga os electrodomésticos durante o dia para comprares menos à rede.',
  bi:      'Com bi-horário, a eletricidade da rede é mais cara de dia. Põe a máquina de lavar, a loiça e o aquecimento de água a funcionar de dia — é quando os painéis produzem e substituem a energia mais cara.',
  tri:     'Com tri-horário, evita as horas de ponta (fim da tarde). Concentra os consumos pesados ao meio-dia, quando os painéis produzem no máximo e a tarifa é a mais cara.'
};

/* ============ BASE DE DADOS DE PAINÉIS ============ */
/* Carregado da base de dados (Supabase) por loadPaineis(), no arranque da app.
   Antes vinha do ficheiro estático paineis.js. */
let PAINEIS = [];
let BATERIAS = [];           // catálogo de baterias (BD com fallback local)
let marketPending = false;   // catálogo aberto antes de os dados chegarem?

/* ============ ESTADO ============ */
let step = 1;
let appReady = false;
const state = { regiao:null, consumoAno:0, cobertura:1.0, orcamento:0,
                preco:0.22, tarifa:'simples', roofArea:0, bateria:'nao',
                utilizacao:'habitacao', habitacao:'moradia', kva:0 };
let sel; // dropdown de região (preenchido quando a app fica pronta)

/* ============ ARRANQUE DA APP (chamado pelo Auth após login) ============ */
function onAppReady(){
  if (appReady) return;
  appReady = true;
  sel = document.getElementById('regiao');
  Object.keys(REGIOES).forEach(r => {
    const o = document.createElement('option');
    o.value = r; o.textContent = r; sel.appendChild(o);
  });
  // fechar o modal com a tecla Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
  if (typeof fetchRegioes === 'function') fetchRegioes();  // tabela Regioes (BD) → atualiza producao/iva
  loadPaineis();   // carrega o catálogo da base de dados
  loadBaterias();  // carrega as baterias (BD ou fallback local)
  loadFavs();      // favoritos do utilizador (BD)
  loadCalculos();  // histórico de cálculos guardados (BD)
}

/* ---- fotos reais dos painéis (Pexels, URLs verificados) ----
   Atribuídas no cliente de forma determinística a partir do id —
   a BD não precisa de guardar URLs de imagens. */
/* todos VERIFICADOS visualmente — só painéis, sem pessoas/flores/céu */
const IMG_ROOF  = [356049, 8853509, 9799702, 7102661, 18306343, 17965455, 15751129, 25751713];
const IMG_FIELD = [356036, 4320449, 4320475, 9799706, 11145690, 13963757, 2800832, 18523430, 14384696];
function hashStr(s){
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function imageFor(p){
  const pool = p.segmento === 'Residencial' ? IMG_ROOF : IMG_FIELD;
  const id = pool[hashStr(p.id) % pool.length];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
}

/* ---- carrega as baterias (tabela da BD ou fallback baterias.js) ---- */
async function loadBaterias(){
  try { BATERIAS = await fetchBaterias(); }
  catch(e){ BATERIAS = (typeof BATERIAS_DB !== 'undefined') ? BATERIAS_DB : []; }
}

/* ---- fallback: carrega paineis.js dinamicamente (só quando a BD falha) ---- */
function loadLocalPaineis(){
  return new Promise((res, rej) => {
    if (typeof PAINEIS_DB !== 'undefined') return res(PAINEIS_DB);
    const s = document.createElement('script');
    s.src = 'js/paineis.js?v=20260615a';
    s.onload  = () => (typeof PAINEIS_DB !== 'undefined') ? res(PAINEIS_DB) : rej(new Error('PAINEIS_DB vazio'));
    s.onerror = () => rej(new Error('paineis.js não encontrado'));
    document.head.appendChild(s);
  });
}

/* ---- carrega o catálogo da BD (Supabase) e atualiza a UI se necessário ---- */
async function loadPaineis(){
  try {
    PAINEIS = await fetchPaineis();
  } catch(e){
    console.warn('BD indisponível — a usar o catálogo local:', e);
    try { PAINEIS = await loadLocalPaineis(); }
    catch(e2){
      console.error('Falha também no catálogo local:', e2);
      const mc = document.getElementById('marketCount');
      if (mc) mc.textContent = 'Não foi possível carregar o catálogo. Verifica a ligação.';
      return;
    }
  }
  // foto sempre atribuída no cliente (pool verificado) — ignora URLs antigos
  PAINEIS.forEach(p => { p.imagem = imageFor(p); });
  if (marketPending){ marketPending = false; initMarket(); }
  else if (marketInit){
    document.getElementById('dbCount').textContent = PAINEIS.length;
    renderMarket();
  }
}

/* ============ NAVEGAÇÃO ENTRE VISTAS ============ */
function showView(v){
  document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('tab-calc').classList.toggle('active', v==='calc');
  document.getElementById('tab-cat').classList.toggle('active', v==='cat');
  document.getElementById('tab-orc').classList.toggle('active', v==='orc');
  document.getElementById('tab-form').classList.toggle('active', v==='form');
  if (v==='cat') initMarket();
  if (v==='orc') initOrcamento();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* =========================================================================
   MARKETPLACE / CATÁLOGO
   ========================================================================= */
const market = {
  filters: { segmento:new Set(), tec:new Set(), tier:new Set(), cor:new Set(), marca:new Set() },
  search:'', sort:'relevance', favOnly:false,
  priceMax:null, powerMin:null,
  page:0, perPage:24, filtered:[]
};
let marketInit = false;

/* ---------- favoritos (na BD, por utilizador — sincronizam entre dispositivos) ----------
   Cache em memória para a UI ficar instantânea; a escrita na BD é em segundo plano. */
let FAVS = new Set();
async function loadFavs(){
  const u = Auth.currentUser();
  if (!u || !u.id) return;
  try {
    FAVS = await fetchFavoritos();
    // migração única: favoritos antigos do localStorage → BD
    const legacyKey = 'solario_fav_' + u.email;
    const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    if (legacy.length){
      legacy.forEach(id => { if (!FAVS.has(id)){ FAVS.add(id); addFavorito(u.id, id); } });
      localStorage.removeItem(legacyKey);
    }
  } catch(e){ console.warn('favoritos: BD indisponível', e); }
  updateFavCount();
  if (marketInit) renderMarket();
}
function isFav(id){ return FAVS.has(id); }
function toggleFav(id){
  const u = Auth.currentUser();
  if (FAVS.has(id)){
    FAVS.delete(id);
    if (u && u.id) removeFavorito(u.id, id).then(r => { if (r && r.error) console.warn(r.error); });
  } else {
    FAVS.add(id);
    if (u && u.id) addFavorito(u.id, id).then(r => { if (r && r.error) console.warn(r.error); });
  }
  updateFavCount();
}
function updateFavCount(){ const el = document.getElementById('favCount'); if (el) el.textContent = FAVS.size; }

/* ---------- arranque do marketplace (uma vez) ---------- */
function initMarket(){
  if (marketInit) { updateFavCount(); return; }
  if (!PAINEIS.length){   // dados ainda não chegaram — fica pendente
    marketPending = true;
    const mc = document.getElementById('marketCount');
    if (mc) mc.textContent = 'A carregar catálogo…';
    return;
  }
  marketInit = true;
  document.getElementById('dbCount').textContent = PAINEIS.length;

  buildChips('fSegmento','segmento', ['Residencial','Comercial','Industrial']);
  buildChips('fTec','tec',           [...new Set(PAINEIS.map(p=>p.tec))]);
  buildChips('fTier','tier',         ['Económico','Equilibrado','Premium']);
  buildChips('fCor','cor',           ['Full Black','Silver']);
  buildChips('fMarca','marca',       [...new Set(PAINEIS.map(p=>p.marca))].sort());

  const prices = PAINEIS.map(p=>p.preco), powers = PAINEIS.map(p=>p.potencia);
  const pmax = Math.max(...prices), pmin = Math.min(...prices);
  const wmax = Math.max(...powers), wmin = Math.min(...powers);
  const pr = document.getElementById('priceRange');
  pr.min = pmin; pr.max = pmax; pr.value = pmax; market.priceMax = pmax;
  document.getElementById('priceVal').textContent = eur(pmax);
  pr.setAttribute('aria-valuetext', 'até ' + eur(pmax));
  const wr = document.getElementById('powerRange');
  wr.min = wmin; wr.max = wmax; wr.value = wmin; market.powerMin = wmin;
  document.getElementById('powerVal').textContent = wmin + ' W';
  wr.setAttribute('aria-valuetext', 'a partir de ' + wmin + ' W');

  renderMarket();
}

function buildChips(containerId, key, values){
  const c = document.getElementById(containerId); c.innerHTML = '';
  values.forEach(v => {
    const el = document.createElement('div');
    el.className = 'chip'; el.textContent = v;
    el.onclick = () => toggleChip(key, v, el);
    c.appendChild(el);
  });
}
function toggleChip(key, v, el){
  const set = market.filters[key];
  if (set.has(v)){ set.delete(v); el.classList.remove('active'); }
  else { set.add(v); el.classList.add('active'); }
  market.page = 0; renderMarket();
}

/* ---------- pesquisa, ordenação, faixas ---------- */
function onFilter(){
  market.search = document.getElementById('mSearch').value.trim().toLowerCase();
  market.sort   = document.getElementById('mSort').value;
  market.page = 0; renderMarket();
}
function onPriceInput(){ const r = document.getElementById('priceRange'); market.priceMax = +r.value; const t = 'até ' + eur(+r.value); document.getElementById('priceVal').textContent = eur(+r.value); r.setAttribute('aria-valuetext', t); }
function onPowerInput(){ const r = document.getElementById('powerRange'); market.powerMin = +r.value; document.getElementById('powerVal').textContent = r.value + ' W'; r.setAttribute('aria-valuetext', 'a partir de ' + r.value + ' W'); }
function toggleFavOnly(){
  market.favOnly = !market.favOnly;
  document.getElementById('favToggle').classList.toggle('active', market.favOnly);
  market.page = 0; renderMarket();
}
function clearFilters(){
  Object.values(market.filters).forEach(s => s.clear());
  document.querySelectorAll('#view-cat .chip.active').forEach(c => c.classList.remove('active'));
  market.search = ''; document.getElementById('mSearch').value = '';
  market.sort = 'relevance'; document.getElementById('mSort').value = 'relevance';
  market.favOnly = false; document.getElementById('favToggle').classList.remove('active');
  const pr = document.getElementById('priceRange'); pr.value = pr.max; market.priceMax = +pr.max;
  document.getElementById('priceVal').textContent = eur(+pr.max);
  const wr = document.getElementById('powerRange'); wr.value = wr.min; market.powerMin = +wr.min;
  document.getElementById('powerVal').textContent = wr.min + ' W';
  market.page = 0; renderMarket();
}

const tierRank = t => t==='Equilibrado' ? 0 : t==='Premium' ? 1 : 2;
const tierClass = t => t==='Económico' ? 't-eco' : t==='Premium' ? 't-pr' : 't-eq';

function applyFilters(){
  const f = market.filters;
  const favs = market.favOnly ? FAVS : null;
  let list = PAINEIS.filter(p => {
    if (f.segmento.size && !f.segmento.has(p.segmento)) return false;
    if (f.tec.size      && !f.tec.has(p.tec))           return false;
    if (f.tier.size     && !f.tier.has(p.tier))         return false;
    if (f.cor.size      && !f.cor.has(p.cor))           return false;
    if (f.marca.size    && !f.marca.has(p.marca))       return false;
    if (market.priceMax != null && p.preco > market.priceMax)   return false;
    if (market.powerMin != null && p.potencia < market.powerMin) return false;
    if (favs && !favs.has(p.id)) return false;
    if (market.search){
      const s = (p.marca + ' ' + p.serie + ' ' + p.modelo).toLowerCase();
      if (!s.includes(market.search)) return false;
    }
    return true;
  });
  const sorters = {
    'price-asc':  (a,b)=>a.preco-b.preco,
    'price-desc': (a,b)=>b.preco-a.preco,
    'power-desc': (a,b)=>b.potencia-a.potencia,
    'eff-desc':   (a,b)=>b.rendimento-a.rendimento,
    'value':      (a,b)=>a.precoWp-b.precoWp,
    'relevance':  (a,b)=>(tierRank(a.tier)-tierRank(b.tier)) || (b.rendimento-a.rendimento),
  };
  return list.sort(sorters[market.sort] || sorters.relevance);
}

function renderMarket(){
  market.filtered = applyFilters();
  const total = market.filtered.length;
  const shown = Math.min((market.page+1)*market.perPage, total);
  document.getElementById('marketGrid').innerHTML =
    market.filtered.slice(0, shown).map(cardHTML).join('');
  document.getElementById('marketCount').innerHTML =
    total ? `A mostrar <b>${shown}</b> de <b>${total}</b> painéis` : '';
  document.getElementById('marketEmpty').style.display = total ? 'none' : 'block';
  document.getElementById('loadMore').style.display = shown < total ? 'inline-flex' : 'none';
  updateFavCount();
}
function loadMore(){ market.page++; renderMarket(); }

function cardHTML(p){
  const fav = isFav(p.id);
  const colorCls = p.cor === 'Full Black' ? 'black' : 'silver';
  return `<div class="pcard" onclick="openPanel('${p.id}')">
    <div class="pthumb">
      <span class="ptier ${tierClass(p.tier)}">${p.tier}</span>
      <button class="pheart ${fav?'on':''}" onclick="event.stopPropagation();heartClick(this,'${p.id}')" aria-label="favorito">${fav?'♥':'♡'}</button>
      <div class="pvisual ${colorCls}">
        ${p.imagem ? `<img class="pphoto" src="${p.imagem}?auto=compress&cs=tinysrgb&fit=crop&w=520&h=340" alt="${p.marca} ${p.serie}" loading="lazy" onerror="this.remove()">` : ''}
      </div>
    </div>
    <div class="pbody">
      <div class="pbrand">${p.marca}</div>
      <h4>${p.serie}</h4>
      <div class="pspecs">
        <span class="ptag">${p.potencia} W</span>
        <span class="ptag">${p.rendimento}%</span>
        <span class="ptag">${p.segmento}</span>
      </div>
      <div class="pprice"><b>${p.preco} €</b><small>${p.precoWp.toFixed(2)} €/Wp</small></div>
    </div>
  </div>`;
}
function heartClick(btn, id){
  toggleFav(id);
  const on = isFav(id);
  btn.classList.toggle('on', on); btn.textContent = on ? '♥' : '♡';
  if (market.favOnly) renderMarket();
}

/* ---------- modal de detalhe ---------- */
function openPanel(id){
  const p = PAINEIS.find(x => x.id === id); if (!p) return;
  const fav = isFav(id);
  const colorCls = p.cor === 'Full Black' ? 'black' : 'silver';
  const cell = (k,v) => `<div class="m-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  document.getElementById('modalContent').innerHTML = `
    <div class="m-head">
      <div class="m-visual"><div class="pvisual ${colorCls}">${p.imagem ? `<img class="pphoto" src="${p.imagem}?auto=compress&cs=tinysrgb&fit=crop&w=600&h=400" alt="${p.marca} ${p.serie}" onerror="this.remove()">` : ''}</div></div>
      <div class="m-title">
        <div class="pbrand">${p.marca}</div>
        <h3>${p.modelo}</h3>
        <div class="m-badges">
          <span class="ptier ${tierClass(p.tier)}">${p.tier}</span>
          <span class="ptag">${p.tec}</span>
          ${p.bifacial ? '<span class="ptag">Bifacial</span>' : ''}
          <span class="ptag">${p.cor}</span>
        </div>
      </div>
    </div>
    <div class="m-price"><b>${p.preco} €</b><small>${p.precoWp.toFixed(2)} €/Wp · por painel</small></div>
    <div class="m-grid">
      ${cell('Potência', p.potencia + ' W')}
      ${cell('Rendimento', p.rendimento + ' %')}
      ${cell('Segmento', p.segmento)}
      ${cell('Dimensões', p.comprimento + ' × ' + p.largura + ' mm')}
      ${cell('Área', p.area + ' m²')}
      ${cell('Peso', p.peso + ' kg')}
      ${cell('Células', p.celulas)}
      ${cell('Degradação / ano', p.degradacaoAno + ' %')}
      ${cell('Coef. de temperatura', p.coefTemp + ' %/°C')}
      ${cell('Garantia do produto', p.garantiaProduto + ' anos')}
      ${cell('Garantia de potência', p.garantiaPotencia + ' anos')}
      ${cell('Tecnologia', p.tec)}
    </div>
    <div class="m-actions">
      <button class="btn m-fav ${fav?'on':''}" onclick="modalFav('${p.id}', this)">${fav ? '♥ Nos favoritos' : '♡ Guardar nos favoritos'}</button>
    </div>`;
  document.getElementById('panelModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  trapModal(document.getElementById('panelModal'));
}

/* ---------- gestão de foco em modais (acessibilidade) ----------
   prende o Tab dentro do modal e devolve o foco ao elemento anterior ao fechar.
   Exposto em window para o modal "Sobre" (inline no index.html) reutilizar. */
let _modalLastFocus = null, _modalTrapHandler = null;
function trapModal(modalEl){
  if (!modalEl) return;
  _modalLastFocus = document.activeElement;
  const SEL = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusables = () => [...modalEl.querySelectorAll(SEL)].filter(el => el.offsetParent !== null);
  const first = focusables()[0];
  if (first) first.focus();
  _modalTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const a = f[0], b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a){ e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b){ e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown', _modalTrapHandler, true);
}
function untrapModal(){
  if (_modalTrapHandler) document.removeEventListener('keydown', _modalTrapHandler, true);
  _modalTrapHandler = null;
  if (_modalLastFocus && _modalLastFocus.focus){ try { _modalLastFocus.focus(); } catch(e){} }
  _modalLastFocus = null;
}
window.trapModal = trapModal;
window.untrapModal = untrapModal;
function modalFav(id, btn){
  toggleFav(id);
  const on = isFav(id);
  btn.classList.toggle('on', on);
  btn.textContent = on ? '♥ Nos favoritos' : '♡ Guardar nos favoritos';
  if (marketInit) renderMarket();
}
function closePanel(e){
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-x')) return;
  document.getElementById('panelModal').classList.remove('show');
  document.body.style.overflow = '';
  untrapModal();
}

/* ============ QUIZ ============ */
function startQuiz(){
  document.getElementById('intro').style.display = 'none';
  document.getElementById('savedCalcs').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
  step = 1; showStep(1);            // garante rótulo/pontos corretos (nº de passos dinâmico)
}
function totalSteps(){ return document.querySelectorAll('#quiz .step').length; }
function pickTarifa(el){
  document.querySelectorAll('#tarifaOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  state.preco  = parseFloat(el.dataset.t);
  state.tarifa = el.dataset.name;
}
function pickBateria(el){
  document.querySelectorAll('#batOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  state.bateria = el.dataset.b;
}
function pickHab(el){
  document.querySelectorAll('#habOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  state.habitacao = el.dataset.h;
}
function pickUtil(el){
  document.querySelectorAll('#utilOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  state.utilizacao = el.dataset.u;
}
let consPeriodo = 'ano';   // 'ano' | 'mes' — período do valor de consumo introduzido
function pickPeriodo(el){
  document.querySelectorAll('#consPeriodoOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  consPeriodo = el.dataset.p;
}
function pickCobertura(el){
  document.querySelectorAll('#cobOpts .opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  state.cobertura = parseFloat(el.dataset.c);
}
function showStep(n){
  const total = totalSteps();
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector('.step[data-step="'+n+'"]').classList.add('active');
  document.getElementById('plbl').textContent = 'Passo '+n+' de '+total;
  for (let i=1;i<=total;i++){ const d=document.getElementById('p'+i); if (d) d.classList.toggle('done', i<=n); }
  document.getElementById('btnPrev').style.visibility = n===1 ? 'hidden' : 'visible';
  document.getElementById('btnNext').textContent = n===total ? 'Ver resultados ☀' : 'Seguinte →';
}
function clearErr(){ document.querySelectorAll('.err').forEach(e => e.style.display='none'); }
function nextStep(){
  clearErr();
  if (step===1){
    if (!sel.value){ document.getElementById('err1').style.display='block'; return; }
    state.regiao = sel.value;
  }
  if (step===2){                                  // utilização + casa + potência contratada
    state.kva = parseFloat(document.getElementById('kva').value) || 0;
  }
  if (step===3){                                  // consumo em kWh (anual ou mensal)
    const v = parseFloat(document.getElementById('consumo').value);
    if (!(v>0)){ document.getElementById('err3').style.display='block'; return; }
    state.consumoAno = consPeriodo === 'mes' ? v*12 : v;
  }
  // step 4 = autossuficiência (já gravada em pickCobertura; default 100%)
  if (step===5){                                  // área do telhado (opcional)
    const v = parseFloat(document.getElementById('telhado').value);
    state.roofArea = (v>0) ? v : 0;               // 0 = sem limite de espaço
  }
  if (step===7){                                  // orçamento (OPCIONAL)
    const v = parseFloat(document.getElementById('orcamento').value);
    state.orcamento = (v>0) ? v : 0;              // 0 = sem limite de orçamento
  }
  if (step===totalSteps()){ calcular(); return; }
  step++; showStep(step);
}
function prevStep(){ if (step>1){ step--; showStep(step); } }

/* ============ GEOLOCALIZAÇÃO (opcional, sem servidor) ============ */
function detectar(){
  const msg = document.getElementById('geomsg');
  if (!navigator.geolocation){ msg.textContent='O teu navegador não suporta localização.'; return; }
  msg.textContent = 'A obter localização…';
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude:la, longitude:lo} = pos.coords;
    let regiao;
    if (lo < -20) regiao = "Açores (P. Delgada)";
    else if (lo < -13) regiao = "Madeira (Funchal)";
    else { // continente: região mais próxima por latitude
      let best=null, d=99;
      for (const r in REGIOES){
        if (REGIOES[r].lat>45 || r.includes("Açores") || r.includes("Madeira")) continue;
        const dist = Math.abs(REGIOES[r].lat - la);
        if (dist<d){ d=dist; best=r; }
      }
      regiao = best;
    }
    sel.value = regiao;
    msg.textContent = 'Detetado: ' + regiao;
  }, () => { msg.textContent = 'Não foi possível obter a localização. Escolhe manualmente.'; });
}

/* =========================================================================
   MOTOR DE CÁLCULO — agora orientado ao ORÇAMENTO
   Princípio: primeiro vemos quanto o utilizador pode pagar e só depois
   dimensionamos. Nenhuma opção ultrapassa o orçamento.
   ========================================================================= */
function buildContext(){
  const reg = REGIOES[state.regiao];
  const consumoAno = state.consumoAno;             // kWh/ano (introduzido pelo utilizador)
  const consumoMes = consumoAno / 12;              // kWh/mês (média)
  const hspMedia   = reg.hsp.reduce((a,b)=>a+b,0)/12;
  // ---- algoritmo do enunciado ----
  const cobertura       = state.cobertura;                         // 0,25 / 0,5 / 0,75 / 1
  const consumoObjetivo = consumoAno * cobertura;                  // ConsumoObjetivo
  const prodRegional    = reg.producao;                            // ProducaoRegional (kWh/kWp/ano)
  const potenciaNec     = consumoObjetivo / prodRegional;          // PotenciaNecessaria (kWp)
  return { reg, consumoMes, consumoAno, hspMedia,
           cobertura, consumoObjetivo, prodRegional, potenciaNec };
}

/* ---------------------------------------------------------------------------
   ESTIMATIVA TEÓRICA (fórmula da aula): Eu_dia → Et → z
   Independente do orçamento — diz a área de painéis para cobrir 100% do consumo.
   η = rendimento da gama do painel recomendado (Económico 18 / Equilibrado 20 / Premium 22).
   Irradiação = Sol médio diário REAL da região (base de referência ≈ 5).
   --------------------------------------------------------------------------- */
function theoreticalEstimate(ctx, painel){
  const euDay = ctx.consumoMes / 30;                          // Eu_day (kWh/dia)
  const eta   = ETA_TIER[painel.tier] || Math.round(painel.rendimento);
  const irr   = ctx.hspMedia;                                 // Irradiação real da região
  const et    = (euDay * 100) / eta;                          // Et (kWh/dia a captar)
  const z     = et / irr;                                     // área teórica (m²)
  return {
    required_area_m2:     Math.ceil(z),
    daily_generation_kwh: et,
    euDay, eta, irr,
    tariff_tip: TARIFF_TIPS[state.tarifa] || TARIFF_TIPS.simples
  };
}

/* custo de 1 painel já instalado (painel + parte do inversor/instalação + IVA) */
function unitCost(ctx, painel){
  const potPainel = painel.potencia/1000;
  return (painel.preco + potPainel*EXTRA_KW) * (1 + ctx.reg.iva);
}
/* quantos painéis cabem no espaço do telhado (0 = sem limite indicado) */
function maxPanelsForArea(painel){
  return state.roofArea > 0 ? Math.floor(state.roofArea / painel.area) : Infinity;
}
/* nº de painéis para atingir a autossuficiência pedida (algoritmo do enunciado):
   NumeroPaineis = PotenciaNecessaria(W) / PotenciaPainel(W) */
function nForTarget(ctx, painel){
  return Math.max(1, Math.ceil(ctx.potenciaNec * 1000 / painel.potencia));
}

/* avalia um sistema concreto: N painéis de um modelo */
function evaluate(ctx, painel, N){
  const potPainel = painel.potencia/1000;
  const Preal   = N * potPainel;                       // kWp instalados
  const prodAno = Preal * ctx.prodRegional;            // Produção anual = P × ProducaoRegional (enunciado)
  // distribuição mensal pela curva de Sol (PVGIS) — a soma dá prodAno
  const pesoMes  = ctx.reg.hsp.map((h,m)=> h*DIAS[m]);
  const somaPeso = pesoMes.reduce((a,b)=>a+b,0);
  let prodMes=[], autoAno=0, excAno=0;
  for (let m=0;m<12;m++){
    const prod = prodAno * (pesoMes[m]/somaPeso);
    prodMes.push(prod);
    autoAno += Math.min(prod, ctx.consumoMes);          // aproveitado em casa
    excAno  += Math.max(0, prod - ctx.consumoMes);      // excedente vendido
  }
  const custo   = N * unitCost(ctx, painel);
  const poupAno = autoAno*state.preco + excAno*PRECO_VENDA;
  const payback = poupAno>0 ? custo/poupAno : Infinity;
  return {
    N, Preal, custo, poupAno, poupMes:poupAno/12, payback,
    co2: prodAno*FATOR_CO2, area:N*painel.area,
    prodMes, prodAno, consumoMes:ctx.consumoMes,
    cobReal: prodAno/ctx.consumoAno, painel
  };
}

/* monta um plano para um painel: dimensiona p/ a autossuficiência, limita ao telhado */
function planFor(ctx, painel, key, tag, desc, extra){
  const nTarget = nForTarget(ctx, painel);             // p/ atingir a cobertura pedida
  const nRoof   = maxPanelsForArea(painel);            // limite físico do telhado
  const N       = Math.max(1, Math.min(nTarget, nRoof));
  const d = evaluate(ctx, painel, N);
  return { ...d, key, tag, desc, nTarget,
           roofCapped: N < nTarget,                              // telhado obrigou a reduzir
           overBudget: state.orcamento > 0 && d.custo > state.orcamento,
           ...(extra||{}) };
}

/* =========================================================================
   TRÊS SOLUÇÕES (enunciado):
     • Económica  — menor custo
     • Equilibrada — melhor relação preço/produção  (recomendada)
     • Premium    — maior eficiência e menor área ocupada
   Dimensionamento pela autossuficiência pretendida. O orçamento é opcional:
   se for indicado, assinalamos as soluções que o ultrapassam (não as escondemos).
   ========================================================================= */
function buildPlans(){
  const ctx = buildContext();
  if (!PAINEIS.length) return { insufficient:true, reason:'loading', ctx };

  // telhado pequeno demais para qualquer painel?
  if (state.roofArea > 0){
    const smallest = [...PAINEIS].sort((a,b)=> a.area-b.area)[0];
    if (state.roofArea < smallest.area)
      return { insufficient:true, reason:'space', smallest, ctx };
  }

  const usados = new Set();
  const distinct = sorted => sorted.find(p => !usados.has(p.id)) || sorted[0];

  // 1) ECONÓMICA — menor custo instalado por painel
  const pEco = [...PAINEIS].sort((a,b)=> unitCost(ctx,a)-unitCost(ctx,b))[0];
  usados.add(pEco.id);
  const eco = planFor(ctx, pEco, 'eco', 'Económica', 'Menor custo');

  // 2) EQUILIBRADA (recomendada) — melhor relação preço/produção (menor €/Wp)
  const pMid = distinct([...PAINEIS].sort((a,b)=> a.precoWp-b.precoWp || b.rendimento-a.rendimento));
  usados.add(pMid.id);
  const mid = planFor(ctx, pMid, 'mid', 'Equilibrada', 'Melhor relação preço/produção', { best:true });

  // 3) PREMIUM — maior eficiência e menor área ocupada
  const pTop = distinct([...PAINEIS].sort((a,b)=> b.rendimento-a.rendimento || a.area-b.area));
  const ideal = planFor(ctx, pTop, 'ideal', 'Premium', 'Maior eficiência, menor área');

  return { insufficient:false, plans:[eco, mid, ideal], ctx };
}

/* =========================================================================
   OFERTA DE BATERIAS — só se o utilizador quis armazenamento.
   Mesmo princípio do resto da app: a bateria tem de caber na SOBRA do
   orçamento depois do plano recomendado. Nunca propomos acima do orçamento.
   ========================================================================= */
function buildBatteryOffer(ctx, plans){
  const iva  = ctx.reg.iva;
  const cost = b => b.preco * (1 + iva);                  // preço c/ IVA
  const rec  = plans.find(p => p.best) || plans[1] || plans[0];
  // orçamento opcional: sem orçamento (0) não há limite para a bateria
  const semOrcamento = !(state.orcamento > 0);
  const sobra = semOrcamento ? Infinity : state.orcamento - rec.custo;

  // alvo: guardar ~60% do consumo diário (a parte da noite)
  const euDay = ctx.consumoMes / 30;
  const alvo  = euDay * 0.6;

  // excedente diário do plano recomendado (o que há para guardar)
  let excAno = 0;
  rec.prodMes.forEach(v => { excAno += Math.max(0, v - ctx.consumoMes); });
  const excDay = excAno / 365;

  if (!BATERIAS.length) return { none:true, loading:true, rec, sobra };

  const fits = BATERIAS.filter(b => cost(b) <= sobra).sort((a,b) => cost(a) - cost(b));
  if (!fits.length){
    const cheapest = [...BATERIAS].sort((a,b) => cost(a) - cost(b))[0];
    return { none:true, cheapest, custoCheapest:cost(cheapest),
             falta: cost(cheapest) - sobra, rec, sobra };
  }

  /* poupança extra: cada kWh guardado deixa de ser vendido barato (0,05)
     e evita comprar à rede ao preço da tarifa → vale a diferença.
     Limites físicos: capacidade útil da bateria, excedente real do sistema
     E o consumo noturno (~60% do diário) — não dá para "usar" mais do que isso. */
  const withCalc = (b) => {
    const guardada = Math.min(b.capacidadeUtil * (b.eficiencia/100), Math.max(excDay, 0), alvo);
    const poupAno  = guardada * 365 * (state.preco - PRECO_VENDA);
    return { b, custo:cost(b), guardada, poupAno,
             payback: poupAno > 0 ? cost(b)/poupAno : Infinity };
  };

  const eco  = withCalc(fits[0]);                                          // mais barata
  const recB = withCalc([...fits].sort((a,b) =>                            // mais próxima do alvo
    Math.abs(a.capacidadeUtil - alvo) - Math.abs(b.capacidadeUtil - alvo) || a.preco - b.preco)[0]);
  const max  = withCalc([...fits].sort((a,b) =>                            // maior que cabe
    b.capacidadeUtil - a.capacidadeUtil || a.preco - b.preco)[0]);

  const opts = [], seen = new Set();
  [['Económica', eco], ['Recomendada', recB], ['Máxima', max]].forEach(([tag, o]) => {
    if (!seen.has(o.b.id)){ seen.add(o.b.id); opts.push({ tag, ...o }); }
  });
  return { none:false, opts, rec, sobra, alvo, excDay };
}

function renderBatteryOffer(out){
  const box = document.getElementById('batBox');
  selectedBateriaId = null; lastBatteryOpts = [];   // reposto a cada cálculo
  if (state.bateria !== 'sim'){ box.style.display = 'none'; return; }
  box.style.display = 'block';

  const offer = buildBatteryOffer(out.ctx, out.plans);

  if (offer.none){
    if (offer.loading){
      box.innerHTML = `<h4>🔋 Armazenamento de energia</h4>
        <div class="sub">O catálogo de baterias ainda está a carregar — tenta calcular de novo daqui a um instante.</div>`;
      return;
    }
    box.innerHTML = `
      <h4>🔋 Armazenamento de energia</h4>
      <div class="sub">Quiseste uma bateria, mas <b>não cabe no orçamento</b> junto com o plano recomendado — e não te vamos propor o que não podes pagar.</div>
      <div class="insight">Depois do plano recomendado sobram <b>${eur(Math.max(0, offer.sobra))}</b>.
        A bateria mais barata do catálogo (${offer.cheapest.marca} ${offer.cheapest.modelo},
        ${offer.cheapest.capacidadeUtil} kWh) custa <b>${eur(offer.custoCheapest)}</b> instalada —
        faltam <b>${eur(offer.falta)}</b>. 💡 Aumenta o orçamento para
        <b>${eur(Math.ceil((state.orcamento + offer.falta)/50)*50)}</b> ou escolhe a opção Económica de painéis.</div>`;
    return;
  }

  const semOrc = !(state.orcamento > 0);
  lastBatteryOpts = offer.opts;   // para resolver a bateria escolhida ao guardar/enviar
  const cards = offer.opts.map(o => {
    const b = o.b;
    const totalCom = offer.rec.custo + o.custo;
    const usado = Math.round(totalCom / state.orcamento * 100);
    const fitTxt = semOrc
      ? `✓ Plano + bateria: ${eur(totalCom)}`
      : `✓ Cabe na sobra · plano + bateria usa ${usado}%`;
    return `
      <div class="plan bat ${o.tag === 'Recomendada' ? 'recommended' : ''}" data-bat="${b.id}" role="button" tabindex="0"
           onclick="selectBateria('${b.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectBateria('${b.id}')}">
        ${o.tag === 'Recomendada' ? '<span class="badge-best">Recomendada</span>' : ''}
        <span class="pcheck" aria-hidden="true">✓ Escolhida</span>
        <span class="tag">${o.tag}</span>
        <div class="desc">${b.marca} · ${b.quimica} · ${b.tensao}</div>
        <h3>${b.modelo}</h3>
        <div class="big">${eur(o.custo)}<small> c/ IVA</small></div>
        <div class="fit">${fitTxt}</div>
        <ul>
          <li>Capacidade útil <b>${b.capacidadeUtil} kWh</b></li>
          <li>Potência <b>${b.potencia} kW</b></li>
          <li>Guarda <b>${o.guardada.toFixed(1)} kWh/dia</b> do excedente</li>
          <li>Poupança extra <b>${eur(o.poupAno/12)}/mês</b></li>
          <li>Recupera em <b>${isFinite(o.payback) ? o.payback.toFixed(1)+' anos' : '—'}</b></li>
          <li>${b.ciclos.toLocaleString('pt-PT')} ciclos · garantia <b>${b.garantia} anos</b></li>
        </ul>
        <div class="painel">Total painéis + bateria: <b>${eur(totalCom)}</b></div>
      </div>`;
  }).join('');

  const note = offer.excDay < 1
    ? `<div class="insight">⚠ Com o plano recomendado sobra pouca energia por dia (~${offer.excDay.toFixed(1)} kWh) — a bateria ficaria quase vazia. Considera primeiro mais painéis (opção Premium) ou uma bateria pequena.</div>`
    : `<div class="insight">🌙 O teu consumo é ~<b>${(out.ctx.consumoMes/30).toFixed(1)} kWh/dia</b>; apontámos para guardar ~60% (<b>${offer.alvo.toFixed(1)} kWh</b>) para a noite. Excedente disponível: ~${offer.excDay.toFixed(1)} kWh/dia.</div>`;

  const subTxt = semOrc
    ? `Para o plano recomendado (<b>${eur(offer.rec.custo)}</b>), estas baterias acrescentam armazenamento:`
    : `Depois do plano recomendado (<b>${eur(offer.rec.custo)}</b>) sobram <b>${eur(offer.sobra)}</b> do teu orçamento. Estas baterias cabem nessa sobra:`;
  document.getElementById('batBox').innerHTML = `
    <h4>🔋 Armazenamento de energia — baterias ao teu alcance</h4>
    <div class="sub">${subTxt}</div>
    <div class="cards bat-cards">${cards}</div>
    ${note}
    <div class="sub" style="margin-top:12px;margin-bottom:0">⚙️ Nota: a bateria liga-se a um <b>inversor híbrido</b> (ou é AC acoplada, como a Tesla/Enphase). Se o inversor do sistema não for híbrido, conta com mais 300–600 € na instalação.</div>`;
  // escolha por defeito = bateria Recomendada (o utilizador pode trocar)
  const recB = offer.opts.find(o => o.tag === 'Recomendada') || offer.opts[0];
  if (recB) selectBateria(recB.b.id);
}

function calcular(){
  document.getElementById('quiz').style.display = 'none';
  const results = document.getElementById('results');
  results.style.display = 'block';

  document.getElementById('resSub').textContent =
    `${state.regiao} · ${state.utilizacao === 'empresa' ? 'Empresa' : 'Habitação'} · consumo ${Math.round(state.consumoAno)} kWh/ano · autossuficiência ${Math.round(state.cobertura*100)}%`
    + (state.orcamento > 0 ? ` · orçamento ${eur(state.orcamento)}` : '');

  const out = buildPlans();
  lastOut = out;   // para "Guardar cálculo"
  const cont     = document.getElementById('planCards');
  const noBudget = document.getElementById('noBudget');
  const chartBox = document.getElementById('chartBox');

  /* ---- orçamento insuficiente ---- */
  if (out.insufficient){
    cont.innerHTML = '';
    chartBox.style.display = 'none';
    document.getElementById('theoryBox').style.display = 'none';
    document.getElementById('batBox').style.display = 'none';
    document.getElementById('regBox').style.display = 'none';
    document.getElementById('planHint').style.display = 'none';
    noBudget.style.display = 'block';
    if (out.reason === 'loading'){
      noBudget.innerHTML = `<h3>Catálogo ainda a carregar ⏳</h3><p>Aguarda um instante e tenta de novo.</p>`;
    } else if (out.reason === 'space'){
      noBudget.innerHTML = `
        <h3>O telhado é pequeno demais 📐</h3>
        <p>Com <b>${state.roofArea} m²</b> não cabe nem o painel mais compacto (o mais pequeno ocupa <b>${out.smallest.area} m²</b>).</p>
        <p style="margin-top:10px">💡 Indica uma área maior, ou deixa o espaço em branco para veres todas as opções.</p>`;
    }
    return;
  }

  noBudget.style.display = 'none';
  chartBox.style.display = 'block';

  cont.innerHTML = '';
  out.plans.forEach(d => {
    // linha de orçamento (opcional): ✓ cabe · % usado, ou ⚠ ultrapassa
    let fitLine = '';
    if (state.orcamento > 0){
      const usado = Math.round(d.custo/state.orcamento*100);
      fitLine = d.overBudget
        ? `<div class="fit warn">⚠ Ultrapassa o orçamento (${eur(state.orcamento)})</div>`
        : `<div class="fit">✓ Cabe no orçamento · usa ${usado}%</div>`;
    } else {
      fitLine = `<div class="fit">Dimensionado para ${Math.round(state.cobertura*100)}% de autossuficiência</div>`;
    }
    cont.innerHTML += `
      <div class="plan ${d.key} ${d.best?'recommended':''}" data-plan="${d.key}" role="button" tabindex="0"
           onclick="selectPlan('${d.key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectPlan('${d.key}')}">
        ${d.best ? '<span class="badge-best">Recomendado</span>' : ''}
        <span class="pcheck" aria-hidden="true">✓ Escolhido</span>
        <span class="tag">${d.tag}</span>
        <div class="desc">${d.desc}</div>
        <h3>${d.N} ${d.N===1?'painel':'painéis'}</h3>
        <div class="big">${eur(d.custo)}<small> total</small></div>
        ${fitLine}
        ${d.roofCapped ? `<div class="fit warn">⚠ Limitado pelo telhado (${state.roofArea} m²) — cobre menos do que pediste</div>` : ''}
        ${state.kva > 0 && d.Preal > state.kva ? `<div class="fit warn">⚠ Acima da potência contratada (${state.kva} kVA)</div>` : ''}
        <ul>
          <li>Potência <b>${d.Preal.toFixed(1)} kW</b></li>
          <li>Cobre <b>${Math.round(d.cobReal*100)}%</b> do consumo</li>
          <li>Poupança <b>${eur(d.poupMes)}/mês</b></li>
          <li>Recupera em <b>${isFinite(d.payback)?d.payback.toFixed(1)+' anos':'—'}</b></li>
          <li>Área no telhado <b>${d.area.toFixed(0)} m²</b></li>
          <li>CO₂ evitado <b>${Math.round(d.co2)} kg/ano</b></li>
        </ul>
        <div class="painel">Painel: <b>${d.painel.marca} ${d.painel.potencia}W</b> · ${d.painel.rendimento}% · ${d.painel.preco}€/un <a class="plink" onclick="event.stopPropagation();openPanel('${d.painel.id}')">ver ficha →</a></div>
      </div>`;
  });
  // seleção por defeito = plano recomendado (o utilizador pode trocar clicando)
  const bestPlan = out.plans.find(p => p.best) || out.plans[1];
  selectPlan(bestPlan.key);
  document.getElementById('planHint').style.display = 'block';

  // ---- estimativa teórica (fórmula da aula) + dica de tarifa ----
  const est = theoreticalEstimate(out.ctx, out.plans[1].painel);
  const tarifaLbl = { simples:'Simples', bi:'Bi-horário', tri:'Tri-horário' }[state.tarifa] || 'Simples';
  // verdict de espaço: compara a área teórica (z) com o telhado indicado
  const roofLine = state.roofArea > 0
    ? `<div class="m-cell"><div class="k">Espaço no telhado</div><div class="v">${state.roofArea} m² · ${est.required_area_m2 <= state.roofArea ? '✓ chega para 100%' : '⚠ apertado'}</div></div>`
    : '';
  const theoryBox = document.getElementById('theoryBox');
  theoryBox.style.display = 'block';
  theoryBox.innerHTML = `
    <h4>🔬 Estimativa teórica (Física pura)</h4>
    <div class="sub">Pela fórmula da aula: que área de telhado cobriria <b>100% do teu consumo</b> — independentemente do orçamento.</div>
    <div class="m-grid">
      <div class="m-cell"><div class="k">Consumo diário (Eu_dia)</div><div class="v">${est.euDay.toFixed(1)} kWh</div></div>
      <div class="m-cell"><div class="k">Rendimento do painel (η)</div><div class="v">${est.eta} %</div></div>
      <div class="m-cell"><div class="k">Energia a captar (Et)</div><div class="v">${est.daily_generation_kwh.toFixed(1)} kWh/dia</div></div>
      <div class="m-cell"><div class="k">Irradiação da região</div><div class="v">${est.irr.toFixed(1)} kWh/m²/dia</div></div>
      <div class="m-cell"><div class="k">Área de painéis (z)</div><div class="v">${est.required_area_m2} m²</div></div>
      ${roofLine}
      <div class="m-cell"><div class="k">Tarifa escolhida</div><div class="v">${tarifaLbl}</div></div>
    </div>
    <div class="insight">☀ <b>Dica para a tua tarifa (${tarifaLbl}):</b> ${est.tariff_tip}</div>`;

  renderBatteryOffer(out);       // baterias (se o utilizador quis)
  renderRegBox(out);             // DGEG / potência contratada / condomínio
  desenharGrafico(out.plans[1]); // opção recomendada
}

/* =========================================================================
   REALIDADE PORTUGUESA — registo DGEG, potência contratada, condomínio
   (DL 15/2022: ≤1,5 kW sem registo; 1,5–30 kW Comunicação Prévia; >30 kW
   licenciamento. O inversor não deve exceder a potência contratada — senão
   é preciso pedir aumento ao comercializador / E-Redes.)
   ========================================================================= */
function dgegInfo(potKw){
  if (potKw <= 1.5) return { nivel:'Sem registo', cls:'ok',
    txt:'Até <b>1,5 kW</b> não precisas de registar nada na DGEG — instala e usa.' };
  if (potKw <= 30)  return { nivel:'Comunicação Prévia', cls:'mid',
    txt:'Entre <b>1,5 e 30 kW</b> é obrigatório submeter uma <b>Comunicação Prévia</b> no portal da DGEG antes de ligar o sistema à rede (taxa ~30 €, o instalador costuma tratar disto).' };
  return { nivel:'Licenciamento completo', cls:'hi',
    txt:'Acima de <b>30 kW</b> é preciso registo prévio com controlo prévio e certificado de exploração na DGEG.' };
}

function renderRegBox(out){
  const box = document.getElementById('regBox');
  if (out.insufficient){ box.style.display = 'none'; return; }
  const rec = out.plans.find(p => p.best) || out.plans[1];
  const pot = rec.Preal;
  const d = dgegInfo(pot);

  const kvaCell = state.kva > 0
    ? (pot <= state.kva
      ? `<div class="m-cell"><div class="k">Potência contratada</div><div class="v">✓ ${pot.toFixed(1)} kW cabe nos teus ${state.kva} kVA</div></div>`
      : `<div class="m-cell"><div class="k">Potência contratada</div><div class="v vwarn">⚠ ${pot.toFixed(1)} kW excede os ${state.kva} kVA</div></div>`)
    : `<div class="m-cell"><div class="k">Potência contratada</div><div class="v">Confirma na fatura — o inversor não deve excedê-la (kVA ≈ kW)</div></div>`;

  const kvaWarn = (state.kva > 0 && pot > state.kva)
    ? `<div class="insight">⚡ <b>Atenção:</b> o sistema recomendado (${pot.toFixed(1)} kW) é maior do que a tua potência contratada (${state.kva} kVA). Antes de instalar, pede um <b>aumento de potência</b> ao teu comercializador (a alteração é feita na rede E-Redes) — ou escolhe a opção Económico.</div>`
    : '';

  const condo = state.habitacao === 'apartamento'
    ? `<div class="insight">🏢 <b>Apartamento:</b> o telhado e a fachada são partes comuns do prédio — precisas da <b>autorização do condomínio</b> (assembleia de condóminos) antes de instalar os painéis.</div>`
    : '';

  box.style.display = 'block';
  box.innerHTML = `
    <h4>📋 Ligação à rede e burocracia (Portugal)</h4>
    <div class="sub">O que precisas de tratar para o sistema recomendado de <b>${pot.toFixed(1)} kW</b>:</div>
    <div class="m-grid">
      <div class="m-cell"><div class="k">Registo DGEG</div><div class="v"><span class="plaque ${d.cls}">${d.nivel}</span></div></div>
      ${kvaCell}
    </div>
    <div class="insight">📄 ${d.txt}</div>
    ${kvaWarn}
    ${condo}`;
}

/* =========================================================================
   HISTÓRICO DE CÁLCULOS — guardados na BD (tabela calculos, RLS por user)
   ========================================================================= */
let lastOut = null;   // resultado do último cálculo (para guardar)
let CALCS = [];       // cache das linhas carregadas
let selectedPlanKey = null;     // plano escolhido pelo utilizador (eco|mid|ideal)
let selectedBateriaId = null;   // bateria escolhida (id) — quando há oferta
let lastBatteryOpts = [];       // opções de bateria do último cálculo (para resolver a escolha)

/* plano atualmente escolhido (fallback: recomendado) */
function chosenPlan(){
  if (!lastOut || lastOut.insufficient) return null;
  return lastOut.plans.find(p => p.key === selectedPlanKey)
      || lastOut.plans.find(p => p.best) || lastOut.plans[1];
}
/* bateria atualmente escolhida (objeto da oferta) ou null */
function chosenBateria(){
  if (state.bateria !== 'sim' || !selectedBateriaId) return null;
  return lastBatteryOpts.find(o => o.b.id === selectedBateriaId) || null;
}
/* clique num cartão de plano */
function selectPlan(key){
  selectedPlanKey = key;
  document.querySelectorAll('#planCards .plan').forEach(el =>
    el.classList.toggle('sel', el.dataset.plan === key));
}
/* clique num cartão de bateria */
function selectBateria(id){
  selectedBateriaId = id;
  document.querySelectorAll('#batBox .plan.bat').forEach(el =>
    el.classList.toggle('sel', el.dataset.bat === id));
}

async function loadCalculos(){
  const u = Auth.currentUser();
  if (!u || !u.id) return;
  try { CALCS = await fetchCalculos(); renderSavedCalcs(); }
  catch(e){ console.warn('cálculos: BD indisponível', e); }
}

function renderSavedCalcs(){
  const box = document.getElementById('savedCalcs');
  if (!box) return;
  if (!CALCS.length){ box.innerHTML = ''; return; }
  box.innerHTML = `<div class="saved glass"><h4>📁 Os teus cálculos guardados</h4>` +
    CALCS.map(r => {
      const d = new Date(r.created_at).toLocaleDateString('pt-PT');
      const rec = r.resultado && r.resultado.recomendado;
      const sum = rec ? ` · ${rec.n} painéis ${rec.marca} · ${eur(rec.custo)} · payback ${rec.payback} anos` : '';
      const bat = r.resultado && r.resultado.bateria === 'sim' ? ' · 🔋' : '';
      const res = r.resultado || {};
      const consumo = res.consumoAno != null ? Math.round(res.consumoAno) + ' kWh/ano'
                    : (r.conta ? r.conta + ' €/mês' : '—');           // compat. com registos antigos
      const cob = res.cobertura != null ? ' · ' + Math.round(res.cobertura*100) + '%' : '';
      const orc = r.orcamento ? ' · orçamento ' + eur(r.orcamento) : '';
      return `<div class="srow">
        <div class="sinfo"><b>${r.regiao}</b> · ${consumo}${cob}${orc}
          <small>${d}${sum}${bat}</small></div>
        <div class="sbtns">
          <button class="btn btn-ghost btn-sm" onclick="repeatCalculo('${r.id}')">↻ Repetir</button>
          <button class="btn btn-ghost btn-sm sdel" onclick="removeCalculo('${r.id}')" aria-label="apagar">✕</button>
        </div>
      </div>`;
    }).join('') + `</div>`;
}

async function guardarCalculo(btn){
  const u = Auth.currentUser();
  if (!u || !u.id) return Auth.toast('Inicia sessão para guardar cálculos.');
  const rec = chosenPlan();
  if (!rec) return Auth.toast('Faz um cálculo completo primeiro.');
  const bat = chosenBateria();
  btn.disabled = true;
  try {
    await saveCalculo(u.id, {
      regiao: state.regiao, orcamento: state.orcamento,
      tarifa: state.tarifa, roof_area: state.roofArea,
      resultado: {
        consumoAno: state.consumoAno, cobertura: state.cobertura,
        utilizacao: state.utilizacao, bateria: state.bateria,
        habitacao: state.habitacao, kva: state.kva,
        // 'recomendado' = a opção ESCOLHIDA pelo utilizador (mantém o nome p/ compat.)
        recomendado: { n: rec.N, marca: rec.painel.marca, modelo: rec.painel.modelo,
                       plano: rec.tag, custo: Math.round(rec.custo),
                       payback: +rec.payback.toFixed(1) },
        bateria_escolhida: bat ? { modelo: bat.b.marca + ' ' + bat.b.modelo,
                       kwh: bat.b.capacidadeUtil, custo: Math.round(bat.custo) } : null
      }
    });
    Auth.toast('Cálculo guardado ✓');
    loadCalculos();
  } catch(e){
    console.warn('guardar cálculo:', e);
    Auth.toast('Não foi possível guardar. Tenta de novo.');
  }
  btn.disabled = false;
}

/* =========================================================================
   PEDIDO DE ORÇAMENTO / INSTALAÇÃO (vista #view-orc)
   Captura um lead: pré-preenche do cálculo/conta, grava na BD (RLS por user)
   e mostra o histórico. "procura = Só equipamento" cobre a entrega sem obra.
   ========================================================================= */
let pedidoSolucao = null;   // foto da solução escolhida (quando vem dos resultados)
let orcWired = false, orcPrefilled = false;

function initOrcamento(){
  const form = document.getElementById('orcForm');
  if (form && !orcWired){ form.addEventListener('submit', submitOrcamento); orcWired = true; }
  // se entrou pela aba (sem passar pelo botão dos resultados) mas há um cálculo
  // recente, anexa-o na mesma — o pedido leva sempre o contexto da solução.
  if (!pedidoSolucao) pedidoSolucao = snapshotSolucao();
  prefillOrcamento();
  renderSolucaoBox();
  loadPedidos();
}

/* "foto" da solução ESCOLHIDA do último cálculo (null se não houver) */
function snapshotSolucao(){
  const rec = chosenPlan();
  if (!rec) return null;
  const snap = {
    regiao: state.regiao,
    plano: rec.tag,                              // Económica / Equilibrada / Premium
    sistema_kw: +rec.Preal.toFixed(2),
    n_paineis: rec.N,
    painel: rec.painel.marca + ' ' + rec.painel.modelo,
    custo: Math.round(rec.custo),
    payback: isFinite(rec.payback) ? +rec.payback.toFixed(1) : null,
    bateria: state.bateria === 'sim'
  };
  const bat = chosenBateria();
  if (bat){
    snap.bateria_modelo = bat.b.marca + ' ' + bat.b.modelo;
    snap.bateria_kwh = bat.b.capacidadeUtil;
    snap.bateria_custo = Math.round(bat.custo);
  }
  return snap;
}

/* preenche o que já sabemos (sem sobrescrever o que o utilizador escreveu) */
function prefillOrcamento(){
  if (orcPrefilled) return;
  const u = Auth.currentUser();
  const setIfEmpty = (id, v) => { const el = document.getElementById(id); if (el && !el.value && v) el.value = v; };
  if (u){ setIfEmpty('o-nome', u.name); setIfEmpty('o-email', u.email); }
  if (state.regiao) setIfEmpty('o-localidade', state.regiao);
  // tipo de propriedade a partir das respostas do quiz
  const tipo = state.utilizacao === 'empresa' ? 'Comércio / Escritório'
             : state.habitacao === 'apartamento' ? 'Apartamento' : 'Moradia';
  const tEl = document.getElementById('o-tipo'); if (tEl) tEl.value = tipo;
  // gasto mensal estimado a partir do consumo anual e preço
  if (state.consumoAno > 0){
    const m = (state.consumoAno / 12) * state.preco;
    const bucket = m < 50 ? 'Menos de €50' : m < 100 ? '€50 – €100' : m < 200 ? '€100 – €200'
                 : m < 400 ? '€200 – €400' : 'Mais de €400';
    const gEl = document.getElementById('o-gasto'); if (gEl) gEl.value = bucket;
  }
  orcPrefilled = true;
}

/* botão "Pedir instalação desta solução" nos resultados */
function pedirInstalacao(){
  const snap = snapshotSolucao();
  if (snap){
    pedidoSolucao = snap;
    const proc = document.getElementById('o-procura'); if (proc) proc.value = 'Reduzir a fatura';
  }
  showView('orc');
}

function renderSolucaoBox(){
  const box = document.getElementById('o-sol');
  if (!box) return;
  if (!pedidoSolucao){ box.style.display = 'none'; return; }
  const s = pedidoSolucao;
  box.style.display = 'block';
  const planoLbl = s.plano ? ` <span class="o-sol-tag">${s.plano}</span>` : '';
  const batLbl = s.bateria_modelo ? ` · 🔋 ${s.bateria_modelo} (${s.bateria_kwh} kWh)` : (s.bateria ? ' · com bateria' : '');
  box.innerHTML = `🔆 <b>Solução escolhida:</b>${planoLbl} ${s.n_paineis} painéis (${s.painel}) · <b>${s.sistema_kw} kW</b>`
    + ` · ${eur(s.custo)}${s.payback ? ` · retorno ~${s.payback} anos` : ''}${batLbl}`
    + `. Enviamos esta proposta ao instalador junto com o pedido.`;
}

function showOrcErr(msg){
  const el = document.getElementById('o-err');
  el.textContent = msg; el.classList.add('show');
  el.scrollIntoView({ block:'center', behavior:'smooth' });
}

async function submitOrcamento(e){
  e.preventDefault();
  const el = document.getElementById('o-err'); el.textContent = ''; el.classList.remove('show');
  const val = id => (document.getElementById(id).value || '').trim();
  const nome = val('o-nome'), contacto = val('o-contacto');
  if (nome.length < 2)     return showOrcErr('Escreve o teu nome.');
  if (contacto.length < 6) return showOrcErr('Indica um telefone ou WhatsApp para te contactarmos.');

  const payload = {
    nome, contacto, email: val('o-email'), localidade: val('o-localidade'),
    tipo_propriedade: val('o-tipo'), proprietario: val('o-prop'), ocupacao: val('o-ocup'),
    procura: val('o-procura'), gasto_mensal: val('o-gasto'), financiamento: val('o-fin'),
    prazo: val('o-prazo'), notas: val('o-notas'), solucao: pedidoSolucao || null
  };
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.classList.add('loading');
  try {
    const u = Auth.currentUser();
    if (!u || !u.id) throw new Error('sem sessão');
    await savePedido(u.id, payload);
    e.target.reset(); pedidoSolucao = null; orcPrefilled = false;
    renderSolucaoBox();
    showOrcConfirm(nome);
    loadPedidos();
  } catch(ex){
    console.warn('pedido:', ex);
    showOrcErr('Não foi possível enviar agora. Verifica a ligação e tenta de novo. ' +
               '(Se a tabela "pedidos" ainda não existir na base de dados, é preciso criá-la com database/pedidos.sql.)');
  }
  btn.disabled = false; btn.classList.remove('loading');
}

function showOrcConfirm(nome){
  const c = document.getElementById('o-confirm');
  c.style.display = 'block';
  c.innerHTML = `<h3 style="font-family:var(--serif);font-weight:600;font-size:1.3rem;margin-bottom:6px">Pedido enviado ✓</h3>`
    + `<p style="color:var(--muted);line-height:1.6">Obrigado, ${nome.split(/\s+/)[0]}! Um instalador certificado vai analisar o teu pedido e contactar-te. Podes acompanhar os teus pedidos aqui em baixo.</p>`;
  c.scrollIntoView({ block:'center', behavior:'smooth' });
  setTimeout(() => { c.style.display = 'none'; }, 9000);
}

async function loadPedidos(){
  const list = document.getElementById('o-list');
  if (!list) return;
  const u = Auth.currentUser();
  if (!u || !u.id){ list.innerHTML = ''; return; }
  let pedidos = [];
  try { pedidos = await fetchPedidos(); }
  catch(e){ list.innerHTML = ''; return; }      // tabela ainda não existe → simplesmente não mostra histórico
  if (!pedidos.length){ list.innerHTML = ''; return; }
  list.innerHTML = `<h3 style="font-family:var(--serif);font-weight:600;font-size:1.25rem;margin:26px 0 4px">Os meus pedidos</h3>`
    + pedidos.map(p => {
        const d = new Date(p.created_at).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' });
        const linhas = [p.tipo_propriedade, p.localidade, p.procura, p.prazo].filter(Boolean).join(' · ');
        return `<div class="o-ped">
          <div class="o-ped-top">
            <h4>${p.procura || 'Pedido de instalação'}</h4>
            <span class="o-when">${d} · <span class="o-badge">${p.estado || 'novo'}</span></span>
          </div>
          <div class="o-meta">${linhas}${p.contacto ? ' · 📞 ' + p.contacto : ''}</div>
        </div>`;
      }).join('');
}

function repeatCalculo(id){
  const r = CALCS.find(c => c.id === id); if (!r) return;
  const res = r.resultado || {};
  // repor as respostas do quiz (UI + estado) e recalcular com o catálogo atual
  sel.value = r.regiao;
  const consumoAno = res.consumoAno != null ? +res.consumoAno
                   : (r.conta ? +r.conta * 12 / 0.22 : 0);   // compat. registos antigos (fatura €)
  document.getElementById('consumo').value = Math.round(consumoAno);
  document.querySelector('#consPeriodoOpts .opt[data-p="ano"]') &&
    pickPeriodo(document.querySelector('#consPeriodoOpts .opt[data-p="ano"]'));
  document.getElementById('orcamento').value = r.orcamento || '';
  document.getElementById('telhado').value = r.roof_area || '';
  state.regiao = r.regiao; state.consumoAno = consumoAno;
  state.orcamento = +r.orcamento || 0; state.roofArea = +r.roof_area || 0;
  state.cobertura = res.cobertura != null ? +res.cobertura : 1.0;
  const cOpt = document.querySelector('#cobOpts .opt[data-c="'+state.cobertura+'"]');
  if (cOpt) pickCobertura(cOpt);
  const util = res.utilizacao || 'habitacao';
  const uOpt = document.querySelector('#utilOpts .opt[data-u="'+util+'"]');
  if (uOpt) pickUtil(uOpt);
  const tOpt = document.querySelector('#tarifaOpts .opt[data-name="'+(r.tarifa || 'simples')+'"]');
  if (tOpt) pickTarifa(tOpt);
  const bat = res.bateria || 'nao';
  const bOpt = document.querySelector('#batOpts .opt[data-b="'+bat+'"]');
  if (bOpt) pickBateria(bOpt);
  const hab = res.habitacao || 'moradia';
  const hOpt = document.querySelector('#habOpts .opt[data-h="'+hab+'"]');
  if (hOpt) pickHab(hOpt);
  state.kva = (+res.kva) || 0;
  document.getElementById('kva').value = String(state.kva || 0);
  document.getElementById('intro').style.display = 'none';
  document.getElementById('savedCalcs').style.display = 'none';
  document.getElementById('quiz').style.display = 'none';
  calcular();
}

async function removeCalculo(id){
  try {
    await deleteCalculo(id);
    CALCS = CALCS.filter(c => c.id !== id);
    renderSavedCalcs();
  } catch(e){ Auth.toast('Não foi possível apagar.'); }
}

/* ============ GRÁFICO SAZONAL (CSS puro) ============ */
function desenharGrafico(d){
  const bars = document.getElementById('bars'); bars.innerHTML = '';
  const max = Math.max(...d.prodMes, d.consumoMes) * 1.1;
  d.prodMes.forEach((v,m) => {
    const hBar  = (v/max)*100;
    const hNeed = (d.consumoMes/max)*100;
    bars.innerHTML += `
      <div class="bcol">
        <div class="stack">
          <div class="need" style="bottom:${hNeed}%"></div>
          <div class="bar" style="height:0%" data-h="${hBar}"></div>
        </div>
        <div class="m">${MESES[m]}</div>
      </div>`;
  });
  // animar barras
  requestAnimationFrame(() => { setTimeout(() => {
    document.querySelectorAll('#bars .bar').forEach(b => b.style.height = b.dataset.h+'%');
  }, 60); });

  const verao = d.prodMes[6], inverno = d.prodMes[11];
  const ratio = (verao/inverno).toFixed(1);
  document.getElementById('insight').innerHTML =
    `☀ Em Julho produz <b>${Math.round(verao)} kWh</b>, mas em Dezembro só <b>${Math.round(inverno)} kWh</b> — cerca de <b>${ratio}× mais</b> no Verão. É a inclinação da Terra em ação!`;
}

/* =========================================================================
   RELATÓRIO FINAL — exportação PDF e Excel/CSV (Funcionalidades Extra)
   Inclui: dados introduzidos, solução escolhida, custos c/ IVA, produção
   anual, poupança anual, retorno do investimento e redução de CO2.
   ========================================================================= */
function relatorioDados(){
  if (!lastOut || lastOut.insufficient) return null;
  const ctx = lastOut.ctx;
  const rec = lastOut.plans.find(p => p.best) || lastOut.plans[1];
  const ivaPct = Math.round(ctx.reg.iva*100);
  return { ctx, rec, ivaPct,
    entradas: {
      regiao: state.regiao,
      utilizacao: state.utilizacao === 'empresa' ? 'Empresa' : 'Habitação',
      consumoAno: Math.round(state.consumoAno),
      cobertura: Math.round(state.cobertura*100),
      roofArea: state.roofArea || '—',
      tarifa: { simples:'Simples', bi:'Bi-horário', tri:'Tri-horário' }[state.tarifa] || 'Simples',
      orcamento: state.orcamento > 0 ? eur(state.orcamento) : 'Sem limite'
    }
  };
}

function exportarPDF(){
  const r = relatorioDados();
  if (!r){ Auth.toast('Faz um cálculo completo primeiro.'); return; }
  const { ctx, rec, ivaPct, entradas } = r;
  const linha = (k,v) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`;
  const planRows = lastOut.plans.map(p => `
    <tr>
      <td>${p.tag}${p.best?' ★':''}</td>
      <td>${p.N}</td>
      <td>${p.Preal.toFixed(1)} kW</td>
      <td>${Math.round(p.prodAno)} kWh</td>
      <td>${eur(p.custo)}</td>
      <td>${isFinite(p.payback)?p.payback.toFixed(1)+' anos':'—'}</td>
    </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8">
    <title>Relatório Sunny — ${state.regiao}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:760px;margin:24px auto;padding:0 20px}
      h1{color:#1463E8;margin:0 0 2px} h2{border-bottom:2px solid #3D9BFF;padding-bottom:4px;margin-top:26px;font-size:17px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}
      td,th{border:1px solid #ddd;padding:7px 10px;text-align:left}
      th{background:#E7F2FF} .muted{color:#777;font-size:12px}
      .big{font-size:15px}
    </style></head><body>
    <h1>☀ Sunny — Relatório de Dimensionamento</h1>
    <div class="muted">Sistema de Dimensionamento Fotovoltaico · ${new Date().toLocaleDateString('pt-PT')}</div>

    <h2>1. Dados introduzidos</h2>
    <table>
      ${linha('Região', entradas.regiao)}
      ${linha('Tipo de utilização', entradas.utilizacao)}
      ${linha('Consumo anual', entradas.consumoAno + ' kWh')}
      ${linha('Autossuficiência pretendida', entradas.cobertura + ' %')}
      ${linha('Área disponível', entradas.roofArea + (state.roofArea?' m²':''))}
      ${linha('Tarifa', entradas.tarifa)}
      ${linha('Orçamento', entradas.orcamento)}
    </table>

    <h2>2. Solução escolhida — ${rec.tag} (recomendada)</h2>
    <table>
      ${linha('Painel', rec.painel.marca + ' ' + rec.painel.modelo + ' (' + rec.painel.potencia + ' Wp, ' + rec.painel.rendimento + '%)')}
      ${linha('Número de painéis', rec.N)}
      ${linha('Potência instalada', rec.Preal.toFixed(2) + ' kW')}
      ${linha('Área ocupada', rec.area.toFixed(0) + ' m²')}
      ${linha('Produção anual estimada', Math.round(rec.prodAno) + ' kWh')}
      ${linha('Cobertura real do consumo', Math.round(rec.cobReal*100) + ' %')}
      ${linha('Custo do sistema (c/ IVA ' + ivaPct + '%)', eur(rec.custo))}
      ${linha('Poupança anual', eur(rec.poupAno))}
      ${linha('Retorno do investimento', (isFinite(rec.payback)?rec.payback.toFixed(1)+' anos':'—'))}
      ${linha('Redução de CO₂', Math.round(rec.co2) + ' kg/ano')}
    </table>

    <h2>3. Três propostas alternativas</h2>
    <table>
      <tr><th>Solução</th><th>Painéis</th><th>Potência</th><th>Produção/ano</th><th>Custo c/ IVA</th><th>Retorno</th></tr>
      ${planRows}
    </table>
    <p class="muted">Produção de referência da região: ${ctx.prodRegional} kWh/kWp/ano · IVA aplicável: ${ivaPct}%.
    Gerado por Sunny — projeto Gestão e Programação de Sistemas Informáticos.</p>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}

function exportarCSV(){
  const r = relatorioDados();
  if (!r){ Auth.toast('Faz um cálculo completo primeiro.'); return; }
  const { ctx, rec, ivaPct, entradas } = r;
  const rows = [];
  const add = (a,b) => rows.push([a, b]);
  add('Relatório Sunny', new Date().toLocaleDateString('pt-PT'));
  add('', '');
  add('DADOS INTRODUZIDOS', '');
  add('Região', entradas.regiao);
  add('Tipo de utilização', entradas.utilizacao);
  add('Consumo anual (kWh)', entradas.consumoAno);
  add('Autossuficiência (%)', entradas.cobertura);
  add('Área disponível (m²)', state.roofArea || '');
  add('Tarifa', entradas.tarifa);
  add('Orçamento', entradas.orcamento);
  add('', '');
  add('SOLUÇÃO ESCOLHIDA', rec.tag + ' (recomendada)');
  add('Painel', rec.painel.marca + ' ' + rec.painel.modelo);
  add('Número de painéis', rec.N);
  add('Potência instalada (kW)', rec.Preal.toFixed(2));
  add('Área ocupada (m²)', rec.area.toFixed(0));
  add('Produção anual (kWh)', Math.round(rec.prodAno));
  add('Cobertura real (%)', Math.round(rec.cobReal*100));
  add('IVA (%)', ivaPct);
  add('Custo c/ IVA (€)', Math.round(rec.custo));
  add('Poupança anual (€)', Math.round(rec.poupAno));
  add('Retorno (anos)', isFinite(rec.payback)?rec.payback.toFixed(1):'-');
  add('Redução CO2 (kg/ano)', Math.round(rec.co2));
  add('', '');
  add('TRÊS PROPOSTAS', '');
  rows.push(['Solução','Painéis','Potência (kW)','Produção/ano (kWh)','Custo c/ IVA (€)','Retorno (anos)']);
  lastOut.plans.forEach(p => rows.push([
    p.tag, p.N, p.Preal.toFixed(1), Math.round(p.prodAno), Math.round(p.custo),
    isFinite(p.payback)?p.payback.toFixed(1):'-'
  ]));
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n');   // ; + BOM → Excel PT
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sunny_${state.regiao.replace(/[^a-z0-9]/gi,'_')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}

/* ============ UTILS ============ */
function eur(n){ return Math.round(n).toLocaleString('pt-PT',{maximumFractionDigits:0}) + ' €'; }
function restart(){
  step = 1; showStep(1);
  document.getElementById('results').style.display = 'none';
  document.getElementById('intro').style.display = 'block';
  document.getElementById('savedCalcs').style.display = 'block';
  document.getElementById('consumo').value = '';
  document.getElementById('orcamento').value = '';
  document.getElementById('telhado').value = '';
  state.consumoAno = 0; state.roofArea = 0; state.orcamento = 0;
  state.cobertura = 1.0;
  document.querySelectorAll('#cobOpts .opt').forEach(o =>
    o.classList.toggle('sel', o.dataset.c === '1'));
  consPeriodo = 'ano';
  document.querySelectorAll('#consPeriodoOpts .opt').forEach(o =>
    o.classList.toggle('sel', o.dataset.p === 'ano'));
  state.bateria = 'nao';
  document.querySelectorAll('#batOpts .opt').forEach(o =>
    o.classList.toggle('sel', o.dataset.b === 'nao'));
  state.utilizacao = 'habitacao';
  document.querySelectorAll('#utilOpts .opt').forEach(o =>
    o.classList.toggle('sel', o.dataset.u === 'habitacao'));
  state.habitacao = 'moradia'; state.kva = 0;
  document.querySelectorAll('#habOpts .opt').forEach(o =>
    o.classList.toggle('sel', o.dataset.h === 'moradia'));
  document.getElementById('kva').value = '0';
  sel.value = '';
  document.getElementById('geomsg').textContent = '';
  window.scrollTo({top:0, behavior:'smooth'});
}
