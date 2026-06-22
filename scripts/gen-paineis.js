/* =========================================================================
   Sunny — gerador da base de dados de painéis solares (MODELOS REAIS)
   Executa:  node scripts/gen-paineis.js   →   escreve ../js/paineis.js
   --------------------------------------------------------------------------
   Cada série abaixo corresponde a um produto REAL de um fabricante real, com
   dimensões, peso, células e tecnologia retirados das FICHAS TÉCNICAS oficiais
   (ver URL em 'ds'). As potências listadas são as variantes reais vendidas.
   O rendimento (%) é calculado pela física STC a partir das dimensões reais e
   da potência:  η = Potência / (Área · 1000 W/m²)  — coincide com a ficha no
   modelo de referência. Os PREÇOS são ORIENTATIVOS (retalho PT/Ibérico, €/Wp
   típico por gama) — ver README/secção "Fontes" para as lojas consultadas.
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const r2 = n => Math.round(n * 100) / 100;

/* ---------- fotos reais (Pexels, URLs verificados) ---------- */
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

/* ---------- séries REAIS ----------
   l,w,h  = dimensões do módulo (mm) da ficha técnica
   peso   = kg (ficha); cells = nº de células; coef = coef. temperatura Pmax (%/°C)
   degr   = degradação anual (%); gp/gpot = garantia produto/potência (anos)
   eurWp  = preço orientativo €/Wp (retalho PT/Ibérico) → preço = potência·eurWp
   pots   = potências reais (Wp) vendidas;  cores = acabamentos                    */
const SERIES = [
  /* ===================== ECONÓMICO — Mono PERC ===================== */
  { marca:'Jinko',          serie:'Tiger Pro 54HC',     tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1722, w:1134, h:30, peso:21.0, cells:108, coef:-0.35, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.15, cores:['Silver'],               pots:[405,410,415], ds:'https://www.jinkosolar.com/en/site/tigerpro' },
  { marca:'LONGi',          serie:'Hi-MO 5 LR5-54HPH',  tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1722, w:1134, h:30, peso:21.3, cells:108, coef:-0.34, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.15, cores:['Silver'],               pots:[405,410,415], ds:'https://www.longi.com/en/products/modules/hi-mo-5/' },
  { marca:'JA Solar',       serie:'JAM54S31',           tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1722, w:1134, h:30, peso:21.5, cells:108, coef:-0.35, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.15, cores:['Silver'],               pots:[405,410,415], ds:'https://www.jasolar.com/html/en/MonocrystallineModule/' },
  { marca:'Trina',          serie:'Vertex S DE09R.08',  tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1754, w:1096, h:30, peso:21.0, cells:108, coef:-0.34, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.15, cores:['Silver'],               pots:[405,410,415], ds:'https://www.trinasolar.com/en-glb/product/VERTEX-S-DE09R.08' },
  { marca:'Canadian Solar', serie:'HiKu6 CS6R',         tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1722, w:1134, h:30, peso:21.3, cells:108, coef:-0.34, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.14, cores:['Silver'],               pots:[405,410], ds:'https://www.csisolar.com/module/hiku6/' },
  { marca:'Risen',          serie:'Titan RSM40-8',      tec:'Mono PERC',     tier:'Económico',   seg:'Residencial', l:1722, w:1134, h:30, peso:21.5, cells:108, coef:-0.35, degr:0.55, gp:12, gpot:25, bif:false, eurWp:0.13, cores:['Silver'],               pots:[405,410], ds:'https://en.risenenergy.com/' },

  /* ============== EQUILIBRADO — N-Type TOPCon (residencial 54 cél.) ============== */
  { marca:'Jinko',          serie:'Tiger Neo 54HL4R',   tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1762, w:1134, h:30, peso:21.0, cells:108, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:false, eurWp:0.22, cores:['Silver','Full Black'], pots:[435,440,445], ds:'https://www.jinkosolar.com/en/site/tigerneo' },
  { marca:'LONGi',          serie:'Hi-MO X6 Guardian',  tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1722, w:1134, h:30, peso:21.0, cells:108, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:false, eurWp:0.23, cores:['Silver','Full Black'], pots:[425,430], ds:'https://www.longi.com/en/products/modules/hi-mo-x6/' },
  { marca:'JA Solar',       serie:'DeepBlue 4.0 Pro',   tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1722, w:1134, h:30, peso:21.5, cells:108, coef:-0.29, degr:0.40, gp:12, gpot:30, bif:false, eurWp:0.22, cores:['Silver'],               pots:[435,440,445], ds:'https://www.jasolar.eu/en/products/deep-blue-40' },
  { marca:'Trina',          serie:'Vertex S+ NEG9R.28', tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1762, w:1134, h:30, peso:21.0, cells:108, coef:-0.30, degr:0.40, gp:25, gpot:30, bif:false, eurWp:0.22, cores:['Silver','Full Black'], pots:[440,445,450], ds:'https://www.trinasolar.com/en-glb/product/VERTEX-S-NEG9R.28' },
  { marca:'Canadian Solar', serie:'TOPHiKu6 CS6.1-54TD',tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1800, w:1134, h:30, peso:22.7, cells:108, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:true,  eurWp:0.21, cores:['Silver'],               pots:[445,450,455], ds:'https://www.csisolar.com/module/tophiku6/' },
  { marca:'Q-Cells',        serie:'Q.TRON BLK M-G2+',   tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1722, w:1134, h:30, peso:21.2, cells:108, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:false, eurWp:0.26, cores:['Full Black'],           pots:[425,430], ds:'https://www.qcells.com/' },
  { marca:'Astronergy',     serie:'ASTRO N5 CHSM54M',   tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Residencial', l:1762, w:1134, h:30, peso:21.0, cells:108, coef:-0.30, degr:0.40, gp:15, gpot:30, bif:false, eurWp:0.20, cores:['Silver','Full Black'], pots:[435,440], ds:'https://www.astronergy.com/' },

  /* ============== EQUILIBRADO — N-Type TOPCon (comercial/utility 72 cél.) ============== */
  { marca:'Jinko',          serie:'Tiger Neo 72HL4-(V)',tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Comercial',   l:2278, w:1134, h:30, peso:28.0, cells:144, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:false, eurWp:0.17, cores:['Silver'],               pots:[590,600,605], ds:'https://www.jinkosolar.com/en/site/tigerneo' },
  { marca:'LONGi',          serie:'Hi-MO 7 LR5-72HGD',  tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Comercial',   l:2278, w:1134, h:30, peso:32.0, cells:144, coef:-0.28, degr:0.40, gp:25, gpot:30, bif:true,  eurWp:0.17, cores:['Silver'],               pots:[580,585], ds:'https://www.longi.com/en/products/modules/hi-mo-7/' },
  { marca:'JA Solar',       serie:'DeepBlue 4.0 Pro 72',tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Comercial',   l:2333, w:1134, h:30, peso:32.5, cells:144, coef:-0.29, degr:0.40, gp:12, gpot:30, bif:true,  eurWp:0.16, cores:['Silver'],               pots:[580,585], ds:'https://www.jasolar.eu/en/products/deep-blue-40' },
  { marca:'Canadian Solar', serie:'TOPBiHiKu6 CS6.1-72TB',tec:'N-Type TOPCon',tier:'Equilibrado',seg:'Comercial',   l:2382, w:1134, h:30, peso:33.6, cells:144, coef:-0.29, degr:0.40, gp:25, gpot:30, bif:true,  eurWp:0.16, cores:['Silver'],               pots:[610,620], ds:'https://www.csisolar.com/module/topbihiku6/' },
  { marca:'Trina',          serie:'Vertex N NEG21C.20', tec:'N-Type TOPCon', tier:'Equilibrado', seg:'Industrial',  l:2384, w:1303, h:33, peso:38.3, cells:132, coef:-0.29, degr:0.40, gp:12, gpot:30, bif:true,  eurWp:0.16, cores:['Silver'],               pots:[710,720], ds:'https://www.trinasolar.com/en-glb/product/VERTEX-N-NEG21C.20' },

  /* ===================== PREMIUM — HJT / IBC / ABC ===================== */
  { marca:'REC',            serie:'Alpha Pure-RX',      tec:'N-Type HJT',    tier:'Premium',     seg:'Residencial', l:1727, w:1204, h:30, peso:21.0, cells:88,  coef:-0.24, degr:0.25, gp:20, gpot:25, bif:false, eurWp:0.40, cores:['Full Black'],           pots:[450,460], ds:'https://www.recgroup.com/en/products/rec-alpha-pure-rx' },
  { marca:'SunPower',       serie:'Maxeon 6',           tec:'IBC',           tier:'Premium',     seg:'Residencial', l:1872, w:1032, h:40, peso:21.8, cells:66,  coef:-0.29, degr:0.25, gp:40, gpot:40, bif:false, eurWp:0.55, cores:['Full Black'],           pots:[435,440], ds:'https://www.maxeon.com/technical-documents/maxeon-6-dc-425-440-w' },
  { marca:'Meyer Burger',   serie:'White',              tec:'N-Type HJT',    tier:'Premium',     seg:'Residencial', l:1767, w:1041, h:35, peso:19.7, cells:120, coef:-0.23, degr:0.25, gp:25, gpot:30, bif:false, eurWp:0.50, cores:['Full Black'],           pots:[395,400], ds:'https://www.meyerburger.com/en/solar-module' },
  { marca:'Aiko',           serie:'Neostar 2S',         tec:'ABC (N-Type)',  tier:'Premium',     seg:'Residencial', l:1757, w:1134, h:30, peso:21.5, cells:108, coef:-0.26, degr:0.26, gp:15, gpot:30, bif:false, eurWp:0.32, cores:['Full Black','Silver'], pots:[460,465], ds:'https://aikosolar.com/en/' },
  { marca:'Huasun',         serie:'Himalaya G12 HJT',   tec:'N-Type HJT',    tier:'Premium',     seg:'Industrial',  l:2384, w:1303, h:33, peso:38.0, cells:132, coef:-0.24, degr:0.25, gp:15, gpot:30, bif:true,  eurWp:0.26, cores:['Silver'],               pots:[700], ds:'https://www.huasunsolar.com/' },
];

/* ---------- expandir cada série em registos ---------- */
function genSeries(s){
  const out = [];
  const areaM2 = (s.l * s.w) / 1e6;            // m² reais do módulo
  for (const p of s.pots){
    const eff = r2(p / (areaM2 * 1000) * 100); // η STC física (coincide com a ficha)
    for (const cor of s.cores){
      const preco = Math.round(p * s.eurWp);
      out.push({
        marca: s.marca,
        serie: s.serie,
        modelo: `${s.serie} ${p}W${cor === 'Full Black' ? ' Black' : ''}`,
        potencia: p,
        rendimento: eff,
        area: r2(areaM2),
        comprimento: s.l,
        largura: s.w,
        peso: s.peso,
        celulas: s.cells,
        tec: s.tec,
        bifacial: s.bif,
        cor,
        segmento: s.seg,
        tier: s.tier,
        garantiaProduto: s.gp,
        garantiaPotencia: s.gpot,
        degradacaoAno: s.degr,
        coefTemp: s.coef,
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

/* baralhar de forma determinística (seed fixa) para não agrupar por marca */
let _s = 20260624 >>> 0;
const rng = () => { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
for (let i = all.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }

/* ---------- escrever paineis.js ---------- */
const header =
`/* =========================================================================
   Sunny — BASE DE DADOS DE PAINÉIS SOLARES  (${all.length} registos, MODELOS REAIS)
   GERADO por scripts/gen-paineis.js — NÃO editar à mão.
   Marcas, séries, dimensões, peso, células e tecnologia das FICHAS TÉCNICAS
   oficiais dos fabricantes. Rendimento = Potência/(Área·1000) em STC. Preços
   ORIENTATIVOS (retalho PT/Ibérico). Fontes: ver secção "Fontes" no catálogo.
   ========================================================================= */
`;
const body = `const PAINEIS_DB = ${JSON.stringify(all, null, 0)};\n`;
const out = path.join(__dirname, '..', 'js', 'paineis.js');
fs.writeFileSync(out, header + body, 'utf8');

/* resumo */
const by = k => all.reduce((m, p) => (m[p[k]] = (m[p[k]] || 0) + 1, m), {});
console.log(`✓ ${all.length} painéis reais → ${out}`);
console.log('  por tier:', by('tier'));
console.log('  por segmento:', by('segmento'));
console.log('  marcas:', Object.keys(by('marca')).length, '| preço €', Math.min(...all.map(p=>p.preco)), '–', Math.max(...all.map(p=>p.preco)));
console.log('  rendimento %:', Math.min(...all.map(p=>p.rendimento)), '–', Math.max(...all.map(p=>p.rendimento)));
