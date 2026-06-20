/* =========================================================================
   Solário — gerador da base de dados de painéis solares
   Executa:  node scripts/gen-paineis.js   →   escreve ../paineis.js
   --------------------------------------------------------------------------
   Os registos são GERADOS de forma determinística (mesma seed = mesmos dados)
   a partir de séries REAIS de fabricantes. Especificações e preços são
   indicativos/realistas para fins de demonstração — não são tabelas oficiais.
   --------------------------------------------------------------------------
   Física usada:  área (m²) = Potência(W) / (η · 1000 W/m²)   [STC]
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------- PRNG determinístico (mulberry32) ---------- */
let _seed = 20260608 >>> 0;
function rng(){
  _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0;
  let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const rnd  = (min, max) => min + (max - min) * rng();
const pick = arr => arr[Math.floor(rng() * arr.length)];
const r2   = n => Math.round(n * 100) / 100;
const r1   = n => Math.round(n * 10) / 10;

/* ---------- fotos reais (Pexels, URLs verificados) ----------
   Banco de imagens reais de painéis solares. Cada painel recebe uma foto
   de forma determinística: telhado/residencial vs. parque/comercial.       */
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

/* ---------- parâmetros por tecnologia ---------- */
const TECDATA = {
  'Mono PERC':        { degr: 0.55, coef: -0.34, gp: 12, gpot: 25 },
  'N-Type TOPCon':    { degr: 0.40, coef: -0.29, gp: 15, gpot: 30 },
  'N-Type HJT':       { degr: 0.25, coef: -0.24, gp: 25, gpot: 30 },
  'IBC':              { degr: 0.25, coef: -0.27, gp: 25, gpot: 30 },
  'ABC (N-Type)':     { degr: 0.35, coef: -0.26, gp: 15, gpot: 30 },
};

/* ---------- séries reais (templates) ---------- */
/* pMin..pMax = gama de potência (W); step = incremento; colors; larguraMódulo(m);
   effMin..effMax = rendimento (%); wpMin..wpMax = €/Wp (módulo);
   tier: Económico | Equilibrado | Premium                                   */
const SERIES = [
  // ---- ECONÓMICO (Mono PERC) ----
  { brand:'Risen',        serie:'Titan S',        tec:'Mono PERC',     pMin:405, pMax:455, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:20.0, effMax:21.0, wpMin:0.13, wpMax:0.17, tier:'Económico' },
  { brand:'Talesun',      serie:'Bistar',         tec:'Mono PERC',     pMin:410, pMax:460, step:5,  colors:['Silver'],              larg:1.13, effMin:20.1, effMax:21.0, wpMin:0.13, wpMax:0.16, tier:'Económico' },
  { brand:'Leapton',      serie:'LP182',          tec:'Mono PERC',     pMin:410, pMax:455, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:20.2, effMax:21.0, wpMin:0.13, wpMax:0.17, tier:'Económico' },
  { brand:'Amerisolar',   serie:'AS-6M',          tec:'Mono PERC',     pMin:400, pMax:450, step:5,  colors:['Silver'],              larg:1.13, effMin:19.8, effMax:20.6, wpMin:0.12, wpMax:0.16, tier:'Económico' },
  { brand:'Sunket',       serie:'SKT-M',          tec:'Mono PERC',     pMin:540, pMax:560, step:5,  colors:['Silver'],              larg:1.13, effMin:20.5, effMax:21.2, wpMin:0.12, wpMax:0.15, tier:'Económico' },

  // ---- EQUILIBRADO (N-Type TOPCon) ----
  { brand:'Jinko',        serie:'Tiger Neo',      tec:'N-Type TOPCon', pMin:425, pMax:475, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.5, effMax:23.0, wpMin:0.18, wpMax:0.25, tier:'Equilibrado' },
  { brand:'Jinko',        serie:'Tiger Neo 72',   tec:'N-Type TOPCon', pMin:565, pMax:625, step:5,  colors:['Silver'],              larg:1.13, effMin:22.0, effMax:23.2, wpMin:0.16, wpMax:0.21, tier:'Equilibrado' },
  { brand:'LONGi',        serie:'Hi-MO X6',       tec:'N-Type TOPCon', pMin:420, pMax:470, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.3, effMax:22.8, wpMin:0.18, wpMax:0.25, tier:'Equilibrado' },
  { brand:'LONGi',        serie:'Hi-MO 7',        tec:'N-Type TOPCon', pMin:570, pMax:620, step:5,  colors:['Silver'],              larg:1.13, effMin:21.8, effMax:22.6, wpMin:0.16, wpMax:0.21, tier:'Equilibrado' },
  { brand:'JA Solar',     serie:'DeepBlue 4.0',   tec:'N-Type TOPCon', pMin:425, pMax:470, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.0, effMax:22.5, wpMin:0.17, wpMax:0.24, tier:'Equilibrado' },
  { brand:'JA Solar',     serie:'DeepBlue 4.0 Pro',tec:'N-Type TOPCon',pMin:570, pMax:625, step:5,  colors:['Silver'],              larg:1.13, effMin:21.6, effMax:22.8, wpMin:0.16, wpMax:0.21, tier:'Equilibrado' },
  { brand:'Trina',        serie:'Vertex S+',      tec:'N-Type TOPCon', pMin:425, pMax:470, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.3, effMax:22.8, wpMin:0.18, wpMax:0.25, tier:'Equilibrado' },
  { brand:'Trina',        serie:'Vertex N',       tec:'N-Type TOPCon', pMin:575, pMax:625, step:5,  colors:['Silver'],              larg:1.13, effMin:21.8, effMax:22.7, wpMin:0.16, wpMax:0.21, tier:'Equilibrado' },
  { brand:'Canadian Solar',serie:'TOPHiKu6',      tec:'N-Type TOPCon', pMin:430, pMax:475, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.2, effMax:22.5, wpMin:0.16, wpMax:0.23, tier:'Equilibrado' },
  { brand:'Canadian Solar',serie:'TOPBiHiKu6',    tec:'N-Type TOPCon', pMin:580, pMax:630, step:5,  colors:['Silver'],              larg:1.13, effMin:21.6, effMax:22.6, wpMin:0.15, wpMax:0.20, tier:'Equilibrado' },
  { brand:'Q-Cells',      serie:'Q.TRON BLK',     tec:'N-Type TOPCon', pMin:425, pMax:445, step:5,  colors:['Full Black'],          larg:1.13, effMin:21.5, effMax:22.5, wpMin:0.20, wpMax:0.27, tier:'Equilibrado' },
  { brand:'Q-Cells',      serie:'Q.PEAK DUO',     tec:'N-Type TOPCon', pMin:410, pMax:440, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.0, effMax:22.0, wpMin:0.19, wpMax:0.26, tier:'Equilibrado' },
  { brand:'Astronergy',   serie:'ASTRO N5',       tec:'N-Type TOPCon', pMin:425, pMax:470, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.5, effMax:22.6, wpMin:0.15, wpMax:0.21, tier:'Equilibrado' },
  { brand:'DAS Solar',    serie:'DAS-DH',         tec:'N-Type TOPCon', pMin:430, pMax:475, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.3, effMax:22.5, wpMin:0.15, wpMax:0.21, tier:'Equilibrado' },
  { brand:'Risen',        serie:'Hyper-ion N',    tec:'N-Type TOPCon', pMin:430, pMax:475, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.4, effMax:22.5, wpMin:0.15, wpMax:0.20, tier:'Equilibrado' },
  { brand:'TW Solar',     serie:'TWMND',          tec:'N-Type TOPCon', pMin:565, pMax:615, step:5,  colors:['Silver'],              larg:1.13, effMin:21.8, effMax:22.6, wpMin:0.15, wpMax:0.20, tier:'Equilibrado' },

  // ---- PREMIUM (HJT / IBC / ABC) ----
  { brand:'REC',          serie:'Alpha Pure-RX',  tec:'N-Type HJT',    pMin:440, pMax:470, step:5,  colors:['Full Black'],          larg:1.04, effMin:22.0, effMax:22.6, wpMin:0.35, wpMax:0.50, tier:'Premium' },
  { brand:'Meyer Burger', serie:'White',          tec:'N-Type HJT',    pMin:390, pMax:425, step:5,  colors:['Full Black','Silver'], larg:1.10, effMin:21.4, effMax:22.5, wpMin:0.40, wpMax:0.55, tier:'Premium' },
  { brand:'Huasun',       serie:'Himalaya G12',   tec:'N-Type HJT',    pMin:580, pMax:720, step:10, colors:['Silver'],              larg:1.30, effMin:22.0, effMax:23.5, wpMin:0.26, wpMax:0.40, tier:'Premium' },
  { brand:'Panasonic',    serie:'EverVolt',       tec:'N-Type HJT',    pMin:400, pMax:440, step:5,  colors:['Full Black'],          larg:1.05, effMin:21.6, effMax:22.5, wpMin:0.34, wpMax:0.48, tier:'Premium' },
  { brand:'SunPower',     serie:'Maxeon 6',       tec:'IBC',           pMin:420, pMax:445, step:5,  colors:['Full Black'],          larg:1.04, effMin:22.5, effMax:24.1, wpMin:0.45, wpMax:0.65, tier:'Premium' },
  { brand:'Aiko',         serie:'Neostar 2P',     tec:'ABC (N-Type)',  pMin:445, pMax:480, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:22.8, effMax:24.2, wpMin:0.30, wpMax:0.45, tier:'Premium' },

  // ---- reforço do segmento COMERCIAL e mais marcas ----
  { brand:'Jinko',        serie:'Tiger Neo 66',   tec:'N-Type TOPCon', pMin:490, pMax:555, step:5,  colors:['Silver'],              larg:1.13, effMin:21.8, effMax:22.8, wpMin:0.16, wpMax:0.22, tier:'Equilibrado' },
  { brand:'LONGi',        serie:'Hi-MO 6 Scientist',tec:'N-Type TOPCon',pMin:490, pMax:560, step:5, colors:['Silver'],              larg:1.13, effMin:21.7, effMax:22.7, wpMin:0.16, wpMax:0.22, tier:'Equilibrado' },
  { brand:'GCL',          serie:'GCL-M10/66',     tec:'N-Type TOPCon', pMin:490, pMax:550, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.5, effMax:22.5, wpMin:0.15, wpMax:0.20, tier:'Equilibrado' },
  { brand:'Phono Solar',  serie:'TwinPlus',       tec:'N-Type TOPCon', pMin:430, pMax:475, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.3, effMax:22.4, wpMin:0.15, wpMax:0.21, tier:'Equilibrado' },
  { brand:'Seraphim',     serie:'S5',             tec:'N-Type TOPCon', pMin:425, pMax:470, step:5,  colors:['Full Black','Silver'], larg:1.13, effMin:21.2, effMax:22.3, wpMin:0.15, wpMax:0.20, tier:'Equilibrado' },
  { brand:'Canadian Solar',serie:'HiKu6',         tec:'Mono PERC',     pMin:525, pMax:560, step:5,  colors:['Silver'],              larg:1.13, effMin:20.8, effMax:21.5, wpMin:0.13, wpMax:0.17, tier:'Económico' },
];

/* ---------- gerar variantes de uma série ---------- */
function genSeries(s){
  const out = [];
  const td = TECDATA[s.tec];
  const span = Math.max(1, s.pMax - s.pMin);
  for (let p = s.pMin; p <= s.pMax; p += s.step){
    const t = (p - s.pMin) / span;                 // 0..1 dentro da gama
    let effBase = s.effMin + (s.effMax - s.effMin) * t + rnd(-0.12, 0.12);
    for (const cor of s.colors){
      const eff = r2(Math.max(s.effMin - 0.1, Math.min(s.effMax + 0.1,
                    cor === 'Full Black' ? effBase - 0.1 : effBase)));
      const effFrac = eff / 100;
      const area = p / (effFrac * 1000);            // m²  (física STC)
      const larguraM = s.larg;
      const comprimentoM = area / larguraM;
      const peso = r1(area * rnd(11.5, 13.5));      // ~12 kg/m²
      const cells = p < 470 ? pick([108, 120, 132]) : pick([144, 156, 132]);
      const segmento = p < 470 ? 'Residencial' : (p <= 560 ? 'Comercial' : 'Industrial');
      // €/Wp desce ligeiramente com a potência
      const wp = (s.wpMax - (s.wpMax - s.wpMin) * t) * rnd(0.95, 1.06);
      const preco = Math.round(p * wp);
      const bifacial = segmento !== 'Residencial' ? rng() > 0.4 : rng() > 0.85;

      out.push({
        marca: s.brand,
        serie: s.serie,
        modelo: `${s.serie} ${p}W${cor === 'Full Black' ? ' Black' : ''}`,
        potencia: p,
        rendimento: eff,
        area: r2(area),
        comprimento: Math.round(comprimentoM * 1000),   // mm
        largura: Math.round(larguraM * 1000),            // mm
        peso,
        celulas: cells,
        tec: s.tec,
        bifacial,
        cor,
        segmento,
        tier: s.tier,
        garantiaProduto: td.gp,
        garantiaPotencia: td.gpot,
        degradacaoAno: td.degr,
        coefTemp: td.coef,
        preco,
        precoWp: r2(preco / p),
      });
    }
  }
  return out;
}

/* ---------- gerar tudo + ids únicos ---------- */
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

let all = [];
SERIES.forEach(s => { all = all.concat(genSeries(s)); });

const seen = {};
all.forEach((p, i) => {
  let id = `${slug(p.marca)}-${slug(p.serie)}-${p.potencia}-${p.cor === 'Full Black' ? 'b' : 's'}`;
  if (seen[id]) id += '-' + i;
  seen[id] = true;
  p.id = id;
  p.imagem = imageFor(p);
});

/* baralhar de forma determinística para não agrupar por marca */
for (let i = all.length - 1; i > 0; i--){
  const j = Math.floor(rng() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}

/* ---------- escrever paineis.js ---------- */
const header =
`/* =========================================================================
   Solário — BASE DE DADOS DE PAINÉIS SOLARES  (${all.length} registos)
   GERADO automaticamente por scripts/gen-paineis.js — NÃO editar à mão.
   Marcas e séries REAIS; especificações/preços indicativos para demonstração.
   Fotos: imagens reais de painéis solares (Pexels, uso livre).
   Cada objeto = um registo; 'id' = chave primária; 'imagem' = foto.
   ========================================================================= */
`;
const body = `const PAINEIS_DB = ${JSON.stringify(all, null, 0)};\n`;
const out = path.join(__dirname, '..', 'js', 'paineis.js');
fs.writeFileSync(out, header + body, 'utf8');

/* resumo */
const by = k => all.reduce((m, p) => (m[p[k]] = (m[p[k]] || 0) + 1, m), {});
console.log(`✓ ${all.length} painéis → ${out}`);
console.log('  por tier:', by('tier'));
console.log('  por segmento:', by('segmento'));
console.log('  marcas:', Object.keys(by('marca')).length, '| preço €', Math.min(...all.map(p=>p.preco)), '–', Math.max(...all.map(p=>p.preco)));
