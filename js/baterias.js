/* =========================================================================
   Solário — CATÁLOGO DE BATERIAS (armazenamento de energia)
   53 modelos REAIS do mercado europeu (Tesla, BYD, Huawei, Pylontech, LG,
   Sungrow, GoodWe, Growatt, Enphase, …). Preços indicativos s/ IVA.
   Serve de fallback local — a app tenta primeiro a tabela `baterias` do
   Supabase (ver supabase/baterias.sql) e usa este ficheiro se não existir.
   Campos: capacidade/capacidadeUtil em kWh · potencia em kW (contínua) ·
   dod/eficiencia em % · ciclos · garantia em anos · peso em kg ·
   preco em € · precoKwh = € por kWh útil · tier = gama.
   ========================================================================= */
const BATERIAS_DB = [
  /* ---- Pylontech (LFP) ---- */
  { id:'pylontech-us2000c',  marca:'Pylontech', serie:'US',     modelo:'US2000C',          capacidade:2.40,  capacidadeUtil:2.28,  potencia:1.0,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:24,  preco:640,  precoKwh:281, tier:'Económica' },
  { id:'pylontech-us3000c',  marca:'Pylontech', serie:'US',     modelo:'US3000C',          capacidade:3.55,  capacidadeUtil:3.37,  potencia:1.8,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:32,  preco:830,  precoKwh:246, tier:'Económica' },
  { id:'pylontech-us5000',   marca:'Pylontech', serie:'US',     modelo:'US5000',           capacidade:4.80,  capacidadeUtil:4.56,  potencia:2.4,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:39,  preco:1120, precoKwh:246, tier:'Económica' },
  { id:'pylontech-force-h2', marca:'Pylontech', serie:'Force',  modelo:'Force H2 7.1',     capacidade:7.10,  capacidadeUtil:6.74,  potencia:3.6,  quimica:'LFP', tensao:'Alta (HV)',    modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:74,  preco:2450, precoKwh:364, tier:'Equilibrada' },
  { id:'pylontech-pelio-l',  marca:'Pylontech', serie:'Pelio',  modelo:'Pelio L 5.12',     capacidade:5.12,  capacidadeUtil:4.86,  potencia:2.5,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:46,  preco:1390, precoKwh:286, tier:'Económica' },

  /* ---- Dyness (LFP) ---- */
  { id:'dyness-b4850',        marca:'Dyness', serie:'B',        modelo:'B4850',            capacidade:2.40,  capacidadeUtil:2.28,  potencia:1.2,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:23,  preco:590,  precoKwh:259, tier:'Económica' },
  { id:'dyness-a48100',       marca:'Dyness', serie:'A',        modelo:'A48100',           capacidade:4.80,  capacidadeUtil:4.56,  potencia:2.4,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:42,  preco:1040, precoKwh:228, tier:'Económica' },
  { id:'dyness-powerbox-pro', marca:'Dyness', serie:'Powerbox', modelo:'Powerbox Pro',     capacidade:10.24, capacidadeUtil:9.73,  potencia:5.1,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true,  ciclos:6000, dod:95,  eficiencia:95, garantia:10, peso:93,  preco:2280, precoKwh:234, tier:'Económica' },

  /* ---- Deye (LFP) ---- */
  { id:'deye-se-g51-pro', marca:'Deye', serie:'SE', modelo:'SE-G5.1 Pro',  capacidade:5.12,  capacidadeUtil:4.86, potencia:2.6, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:48, preco:1230, precoKwh:253, tier:'Económica' },
  { id:'deye-bos-g10',    marca:'Deye', serie:'BOS', modelo:'BOS-G 10.24', capacidade:10.24, capacidadeUtil:9.73, potencia:5.1, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:98, preco:3150, precoKwh:324, tier:'Equilibrada' },

  /* ---- Fox ESS (LFP) ---- */
  { id:'fox-ess-ep5',     marca:'Fox ESS', serie:'EP',  modelo:'EP5',     capacidade:5.18, capacidadeUtil:4.92, potencia:2.6, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:51, preco:1540, precoKwh:313, tier:'Equilibrada' },
  { id:'fox-ess-ecs2900', marca:'Fox ESS', serie:'ECS', modelo:'ECS2900', capacidade:2.88, capacidadeUtil:2.74, potencia:1.4, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:30, preco:930,  precoKwh:339, tier:'Equilibrada' },

  /* ---- SAJ (LFP) ---- */
  { id:'saj-b2-51', marca:'SAJ', serie:'B2', modelo:'B2-5.1', capacidade:5.12, capacidadeUtil:4.86, potencia:2.5, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:47, preco:1380, precoKwh:284, tier:'Económica' },

  /* ---- Growatt (LFP) ---- */
  { id:'growatt-axe-50l',  marca:'Growatt', serie:'AXE', modelo:'AXE 5.0L',   capacidade:5.12,  capacidadeUtil:4.86,  potencia:2.5, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:46,  preco:1450, precoKwh:298, tier:'Equilibrada' },
  { id:'growatt-ark-76h',  marca:'Growatt', serie:'ARK', modelo:'ARK 7.6H',   capacidade:7.68,  capacidadeUtil:7.30,  potencia:3.8, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:84,  preco:2680, precoKwh:367, tier:'Equilibrada' },
  { id:'growatt-ark-102h', marca:'Growatt', serie:'ARK', modelo:'ARK 10.2H',  capacidade:10.24, capacidadeUtil:9.73,  potencia:5.1, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:110, preco:3480, precoKwh:358, tier:'Equilibrada' },
  { id:'growatt-ark-128h', marca:'Growatt', serie:'ARK', modelo:'ARK 12.8H',  capacidade:12.80, capacidadeUtil:12.16, potencia:6.4, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:136, preco:4280, precoKwh:352, tier:'Equilibrada' },

  /* ---- BYD Battery-Box Premium (LFP) ---- */
  { id:'byd-lvs-40',  marca:'BYD', serie:'Battery-Box Premium LVS', modelo:'LVS 4.0',  capacidade:4.0,  capacidadeUtil:4.0,  potencia:4.0,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:58,  preco:1890, precoKwh:473, tier:'Premium' },
  { id:'byd-lvs-80',  marca:'BYD', serie:'Battery-Box Premium LVS', modelo:'LVS 8.0',  capacidade:8.0,  capacidadeUtil:8.0,  potencia:6.0,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:110, preco:3590, precoKwh:449, tier:'Premium' },
  { id:'byd-lvs-120', marca:'BYD', serie:'Battery-Box Premium LVS', modelo:'LVS 12.0', capacidade:12.0, capacidadeUtil:12.0, potencia:8.0,  quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:162, preco:5180, precoKwh:432, tier:'Premium' },
  { id:'byd-lvs-160', marca:'BYD', serie:'Battery-Box Premium LVS', modelo:'LVS 16.0', capacidade:16.0, capacidadeUtil:16.0, potencia:10.0, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:214, preco:6750, precoKwh:422, tier:'Premium' },
  { id:'byd-hvs-51',  marca:'BYD', serie:'Battery-Box Premium HVS', modelo:'HVS 5.1',  capacidade:5.12, capacidadeUtil:5.12, potencia:5.1,  quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:91,  preco:2560, precoKwh:500, tier:'Premium' },
  { id:'byd-hvs-77',  marca:'BYD', serie:'Battery-Box Premium HVS', modelo:'HVS 7.7',  capacidade:7.68, capacidadeUtil:7.68, potencia:5.1,  quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:124, preco:3690, precoKwh:480, tier:'Premium' },
  { id:'byd-hvs-102', marca:'BYD', serie:'Battery-Box Premium HVS', modelo:'HVS 10.2', capacidade:10.24,capacidadeUtil:10.24,potencia:5.1,  quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:157, preco:4790, precoKwh:468, tier:'Premium' },
  { id:'byd-hvm-138', marca:'BYD', serie:'Battery-Box Premium HVM', modelo:'HVM 13.8', capacidade:13.8, capacidadeUtil:13.8, potencia:6.9,  quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:165, preco:5980, precoKwh:433, tier:'Premium' },
  { id:'byd-hvm-221', marca:'BYD', serie:'Battery-Box Premium HVM', modelo:'HVM 22.1', capacidade:22.1, capacidadeUtil:22.1, potencia:7.5,  quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:96, garantia:10, peso:250, preco:9200, precoKwh:416, tier:'Premium' },

  /* ---- Huawei LUNA2000 (LFP) ---- */
  { id:'huawei-luna2000-5',  marca:'Huawei', serie:'LUNA2000', modelo:'LUNA2000-5',  capacidade:5.0,  capacidadeUtil:5.0,  potencia:2.5, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:63,  preco:2480, precoKwh:496, tier:'Premium' },
  { id:'huawei-luna2000-10', marca:'Huawei', serie:'LUNA2000', modelo:'LUNA2000-10', capacidade:10.0, capacidadeUtil:10.0, potencia:5.0, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:113, preco:4650, precoKwh:465, tier:'Premium' },
  { id:'huawei-luna2000-15', marca:'Huawei', serie:'LUNA2000', modelo:'LUNA2000-15', capacidade:15.0, capacidadeUtil:15.0, potencia:5.0, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:163, preco:6750, precoKwh:450, tier:'Premium' },

  /* ---- LG Energy Solution RESU (NMC) ---- */
  { id:'lg-resu10',        marca:'LG', serie:'RESU',       modelo:'RESU10',        capacidade:9.8,  capacidadeUtil:8.8,  potencia:5.0, quimica:'NMC', tensao:'Baixa (48 V)', modular:false, ciclos:4000, dod:90, eficiencia:95, garantia:10, peso:75,  preco:4150, precoKwh:472, tier:'Premium' },
  { id:'lg-resu12',        marca:'LG', serie:'RESU',       modelo:'RESU12',        capacidade:11.7, capacidadeUtil:10.5, potencia:5.0, quimica:'NMC', tensao:'Baixa (48 V)', modular:false, ciclos:4000, dod:90, eficiencia:95, garantia:10, peso:82,  preco:4880, precoKwh:465, tier:'Premium' },
  { id:'lg-resu10h-prime', marca:'LG', serie:'RESU Prime', modelo:'RESU10H Prime', capacidade:9.6,  capacidadeUtil:9.6,  potencia:5.0, quimica:'NMC', tensao:'Alta (HV)',    modular:false, ciclos:4000, dod:100,eficiencia:95, garantia:10, peso:97,  preco:4990, precoKwh:520, tier:'Premium' },
  { id:'lg-resu16h-prime', marca:'LG', serie:'RESU Prime', modelo:'RESU16H Prime', capacidade:16.0, capacidadeUtil:16.0, potencia:7.0, quimica:'NMC', tensao:'Alta (HV)',    modular:false, ciclos:4000, dod:100,eficiencia:95, garantia:10, peso:159, preco:7450, precoKwh:466, tier:'Premium' },

  /* ---- Tesla Powerwall ---- */
  { id:'tesla-powerwall-2', marca:'Tesla', serie:'Powerwall', modelo:'Powerwall 2', capacidade:13.5, capacidadeUtil:13.5, potencia:5.0,  quimica:'NMC', tensao:'AC acoplada', modular:false, ciclos:5000, dod:100, eficiencia:90, garantia:10, peso:114, preco:7400, precoKwh:548, tier:'Premium' },
  { id:'tesla-powerwall-3', marca:'Tesla', serie:'Powerwall', modelo:'Powerwall 3', capacidade:13.5, capacidadeUtil:13.5, potencia:11.5, quimica:'LFP', tensao:'AC acoplada', modular:false, ciclos:6000, dod:100, eficiencia:89, garantia:10, peso:130, preco:8100, precoKwh:600, tier:'Premium' },

  /* ---- Sungrow SBR (LFP) ---- */
  { id:'sungrow-sbr064', marca:'Sungrow', serie:'SBR', modelo:'SBR064', capacidade:6.4,  capacidadeUtil:6.4,  potencia:3.8,  quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:87,  preco:2680, precoKwh:419, tier:'Equilibrada' },
  { id:'sungrow-sbr096', marca:'Sungrow', serie:'SBR', modelo:'SBR096', capacidade:9.6,  capacidadeUtil:9.6,  potencia:5.7,  quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:121, preco:3850, precoKwh:401, tier:'Equilibrada' },
  { id:'sungrow-sbr128', marca:'Sungrow', serie:'SBR', modelo:'SBR128', capacidade:12.8, capacidadeUtil:12.8, potencia:7.6,  quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:155, preco:4990, precoKwh:390, tier:'Equilibrada' },
  { id:'sungrow-sbr160', marca:'Sungrow', serie:'SBR', modelo:'SBR160', capacidade:16.0, capacidadeUtil:16.0, potencia:9.6,  quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:189, preco:6190, precoKwh:387, tier:'Equilibrada' },
  { id:'sungrow-sbr192', marca:'Sungrow', serie:'SBR', modelo:'SBR192', capacidade:19.2, capacidadeUtil:19.2, potencia:11.5, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:223, preco:7390, precoKwh:385, tier:'Equilibrada' },
  { id:'sungrow-sbr256', marca:'Sungrow', serie:'SBR', modelo:'SBR256', capacidade:25.6, capacidadeUtil:25.6, potencia:15.3, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:291, preco:9690, precoKwh:379, tier:'Equilibrada' },

  /* ---- GoodWe Lynx Home (LFP) ---- */
  { id:'goodwe-lynx-u-54',  marca:'GoodWe', serie:'Lynx Home U',    modelo:'Lynx Home U 5.4',     capacidade:5.4,   capacidadeUtil:5.4,   potencia:2.9, quimica:'LFP', tensao:'Baixa (48 V)', modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:53,  preco:2090, precoKwh:387, tier:'Equilibrada' },
  { id:'goodwe-lynx-f-66',  marca:'GoodWe', serie:'Lynx Home F G2', modelo:'Lynx Home F G2 6.6',  capacidade:6.55,  capacidadeUtil:6.55,  potencia:3.6, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:66,  preco:2590, precoKwh:395, tier:'Equilibrada' },
  { id:'goodwe-lynx-f-98',  marca:'GoodWe', serie:'Lynx Home F G2', modelo:'Lynx Home F G2 9.8',  capacidade:9.83,  capacidadeUtil:9.83,  potencia:5.4, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:93,  preco:3690, precoKwh:375, tier:'Equilibrada' },
  { id:'goodwe-lynx-f-131', marca:'GoodWe', serie:'Lynx Home F G2', modelo:'Lynx Home F G2 13.1', capacidade:13.1,  capacidadeUtil:13.1,  potencia:7.2, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:120, preco:4880, precoKwh:373, tier:'Equilibrada' },
  { id:'goodwe-lynx-f-164', marca:'GoodWe', serie:'Lynx Home F G2', modelo:'Lynx Home F G2 16.4', capacidade:16.38, capacidadeUtil:16.38, potencia:9.0, quimica:'LFP', tensao:'Alta (HV)',    modular:true, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:147, preco:5990, precoKwh:366, tier:'Equilibrada' },

  /* ---- SolarEdge Home Battery ---- */
  { id:'solaredge-home-48v',  marca:'SolarEdge', serie:'Home Battery', modelo:'Home Battery 48V', capacidade:4.6, capacidadeUtil:4.6, potencia:2.3, quimica:'LFP', tensao:'Baixa (48 V)', modular:false, ciclos:6000, dod:100, eficiencia:95, garantia:10, peso:50,  preco:2190, precoKwh:476, tier:'Premium' },
  { id:'solaredge-home-hv10', marca:'SolarEdge', serie:'Home Battery', modelo:'Home Battery HV',  capacidade:9.7, capacidadeUtil:9.7, potencia:5.0, quimica:'NMC', tensao:'Alta (HV)',    modular:false, ciclos:4000, dod:94,  eficiencia:94, garantia:10, peso:121, preco:5150, precoKwh:531, tier:'Premium' },

  /* ---- Enphase IQ Battery (AC) ---- */
  { id:'enphase-iq-5p',  marca:'Enphase', serie:'IQ Battery', modelo:'IQ Battery 5P',  capacidade:5.0,   capacidadeUtil:5.0,   potencia:3.8, quimica:'LFP', tensao:'AC acoplada', modular:false, ciclos:6000, dod:98, eficiencia:90, garantia:15, peso:35, preco:3190, precoKwh:638, tier:'Premium' },
  { id:'enphase-iq-10t', marca:'Enphase', serie:'IQ Battery', modelo:'IQ Battery 10T', capacidade:10.08, capacidadeUtil:10.08, potencia:3.8, quimica:'LFP', tensao:'AC acoplada', modular:false, ciclos:6000, dod:98, eficiencia:89, garantia:15, peso:70, preco:5750, precoKwh:570, tier:'Premium' },

  /* ---- Solax (LFP) ---- */
  { id:'solax-t58',       marca:'Solax', serie:'Triple Power', modelo:'Triple Power T58', capacidade:5.8,  capacidadeUtil:5.5,  potencia:2.9, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:60,  preco:2290, precoKwh:416, tier:'Equilibrada' },
  { id:'solax-tbat-h115', marca:'Solax', serie:'T-BAT',        modelo:'T-BAT H 11.5',     capacidade:11.5, capacidadeUtil:10.9, potencia:5.8, quimica:'LFP', tensao:'Alta (HV)', modular:true, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:110, preco:4490, precoKwh:412, tier:'Equilibrada' },

  /* ---- AlphaESS (LFP) ---- */
  { id:'alphaess-smile-b3', marca:'AlphaESS', serie:'SMILE', modelo:'SMILE-B3', capacidade:2.9, capacidadeUtil:2.76, potencia:1.5, quimica:'LFP', tensao:'Baixa (48 V)', modular:false, ciclos:6000, dod:95, eficiencia:95, garantia:10, peso:33, preco:1090, precoKwh:395, tier:'Equilibrada' },
];
