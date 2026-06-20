-- =========================================================================
--  Solário — BATERIAS: tabela + seed (53 modelos reais)
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
insert into public.baterias (id, marca, serie, modelo, capacidade, capacidade_util, potencia, quimica, tensao, modular, ciclos, dod, eficiencia, garantia, peso, preco, preco_kwh, tier) values
  ('pylontech-us2000c', 'Pylontech', 'US', 'US2000C', 2.4, 2.28, 1, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 24, 640, 281, 'Económica'),
  ('pylontech-us3000c', 'Pylontech', 'US', 'US3000C', 3.55, 3.37, 1.8, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 32, 830, 246, 'Económica'),
  ('pylontech-us5000', 'Pylontech', 'US', 'US5000', 4.8, 4.56, 2.4, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 39, 1120, 246, 'Económica'),
  ('pylontech-force-h2', 'Pylontech', 'Force', 'Force H2 7.1', 7.1, 6.74, 3.6, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 74, 2450, 364, 'Equilibrada'),
  ('pylontech-pelio-l', 'Pylontech', 'Pelio', 'Pelio L 5.12', 5.12, 4.86, 2.5, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 46, 1390, 286, 'Económica'),
  ('dyness-b4850', 'Dyness', 'B', 'B4850', 2.4, 2.28, 1.2, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 23, 590, 259, 'Económica'),
  ('dyness-a48100', 'Dyness', 'A', 'A48100', 4.8, 4.56, 2.4, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 42, 1040, 228, 'Económica'),
  ('dyness-powerbox-pro', 'Dyness', 'Powerbox', 'Powerbox Pro', 10.24, 9.73, 5.1, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 93, 2280, 234, 'Económica'),
  ('deye-se-g51-pro', 'Deye', 'SE', 'SE-G5.1 Pro', 5.12, 4.86, 2.6, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 48, 1230, 253, 'Económica'),
  ('deye-bos-g10', 'Deye', 'BOS', 'BOS-G 10.24', 10.24, 9.73, 5.1, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 98, 3150, 324, 'Equilibrada'),
  ('fox-ess-ep5', 'Fox ESS', 'EP', 'EP5', 5.18, 4.92, 2.6, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 51, 1540, 313, 'Equilibrada'),
  ('fox-ess-ecs2900', 'Fox ESS', 'ECS', 'ECS2900', 2.88, 2.74, 1.4, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 30, 930, 339, 'Equilibrada'),
  ('saj-b2-51', 'SAJ', 'B2', 'B2-5.1', 5.12, 4.86, 2.5, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 47, 1380, 284, 'Económica'),
  ('growatt-axe-50l', 'Growatt', 'AXE', 'AXE 5.0L', 5.12, 4.86, 2.5, 'LFP', 'Baixa (48 V)', true, 6000, 95, 95, 10, 46, 1450, 298, 'Equilibrada'),
  ('growatt-ark-76h', 'Growatt', 'ARK', 'ARK 7.6H', 7.68, 7.3, 3.8, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 84, 2680, 367, 'Equilibrada'),
  ('growatt-ark-102h', 'Growatt', 'ARK', 'ARK 10.2H', 10.24, 9.73, 5.1, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 110, 3480, 358, 'Equilibrada'),
  ('growatt-ark-128h', 'Growatt', 'ARK', 'ARK 12.8H', 12.8, 12.16, 6.4, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 136, 4280, 352, 'Equilibrada'),
  ('byd-lvs-40', 'BYD', 'Battery-Box Premium LVS', 'LVS 4.0', 4, 4, 4, 'LFP', 'Baixa (48 V)', true, 6000, 100, 96, 10, 58, 1890, 473, 'Premium'),
  ('byd-lvs-80', 'BYD', 'Battery-Box Premium LVS', 'LVS 8.0', 8, 8, 6, 'LFP', 'Baixa (48 V)', true, 6000, 100, 96, 10, 110, 3590, 449, 'Premium'),
  ('byd-lvs-120', 'BYD', 'Battery-Box Premium LVS', 'LVS 12.0', 12, 12, 8, 'LFP', 'Baixa (48 V)', true, 6000, 100, 96, 10, 162, 5180, 432, 'Premium'),
  ('byd-lvs-160', 'BYD', 'Battery-Box Premium LVS', 'LVS 16.0', 16, 16, 10, 'LFP', 'Baixa (48 V)', true, 6000, 100, 96, 10, 214, 6750, 422, 'Premium'),
  ('byd-hvs-51', 'BYD', 'Battery-Box Premium HVS', 'HVS 5.1', 5.12, 5.12, 5.1, 'LFP', 'Alta (HV)', true, 6000, 100, 96, 10, 91, 2560, 500, 'Premium'),
  ('byd-hvs-77', 'BYD', 'Battery-Box Premium HVS', 'HVS 7.7', 7.68, 7.68, 5.1, 'LFP', 'Alta (HV)', true, 6000, 100, 96, 10, 124, 3690, 480, 'Premium'),
  ('byd-hvs-102', 'BYD', 'Battery-Box Premium HVS', 'HVS 10.2', 10.24, 10.24, 5.1, 'LFP', 'Alta (HV)', true, 6000, 100, 96, 10, 157, 4790, 468, 'Premium'),
  ('byd-hvm-138', 'BYD', 'Battery-Box Premium HVM', 'HVM 13.8', 13.8, 13.8, 6.9, 'LFP', 'Alta (HV)', true, 6000, 100, 96, 10, 165, 5980, 433, 'Premium'),
  ('byd-hvm-221', 'BYD', 'Battery-Box Premium HVM', 'HVM 22.1', 22.1, 22.1, 7.5, 'LFP', 'Alta (HV)', true, 6000, 100, 96, 10, 250, 9200, 416, 'Premium'),
  ('huawei-luna2000-5', 'Huawei', 'LUNA2000', 'LUNA2000-5', 5, 5, 2.5, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 63, 2480, 496, 'Premium'),
  ('huawei-luna2000-10', 'Huawei', 'LUNA2000', 'LUNA2000-10', 10, 10, 5, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 113, 4650, 465, 'Premium'),
  ('huawei-luna2000-15', 'Huawei', 'LUNA2000', 'LUNA2000-15', 15, 15, 5, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 163, 6750, 450, 'Premium'),
  ('lg-resu10', 'LG', 'RESU', 'RESU10', 9.8, 8.8, 5, 'NMC', 'Baixa (48 V)', false, 4000, 90, 95, 10, 75, 4150, 472, 'Premium'),
  ('lg-resu12', 'LG', 'RESU', 'RESU12', 11.7, 10.5, 5, 'NMC', 'Baixa (48 V)', false, 4000, 90, 95, 10, 82, 4880, 465, 'Premium'),
  ('lg-resu10h-prime', 'LG', 'RESU Prime', 'RESU10H Prime', 9.6, 9.6, 5, 'NMC', 'Alta (HV)', false, 4000, 100, 95, 10, 97, 4990, 520, 'Premium'),
  ('lg-resu16h-prime', 'LG', 'RESU Prime', 'RESU16H Prime', 16, 16, 7, 'NMC', 'Alta (HV)', false, 4000, 100, 95, 10, 159, 7450, 466, 'Premium'),
  ('tesla-powerwall-2', 'Tesla', 'Powerwall', 'Powerwall 2', 13.5, 13.5, 5, 'NMC', 'AC acoplada', false, 5000, 100, 90, 10, 114, 7400, 548, 'Premium'),
  ('tesla-powerwall-3', 'Tesla', 'Powerwall', 'Powerwall 3', 13.5, 13.5, 11.5, 'LFP', 'AC acoplada', false, 6000, 100, 89, 10, 130, 8100, 600, 'Premium'),
  ('sungrow-sbr064', 'Sungrow', 'SBR', 'SBR064', 6.4, 6.4, 3.8, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 87, 2680, 419, 'Equilibrada'),
  ('sungrow-sbr096', 'Sungrow', 'SBR', 'SBR096', 9.6, 9.6, 5.7, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 121, 3850, 401, 'Equilibrada'),
  ('sungrow-sbr128', 'Sungrow', 'SBR', 'SBR128', 12.8, 12.8, 7.6, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 155, 4990, 390, 'Equilibrada'),
  ('sungrow-sbr160', 'Sungrow', 'SBR', 'SBR160', 16, 16, 9.6, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 189, 6190, 387, 'Equilibrada'),
  ('sungrow-sbr192', 'Sungrow', 'SBR', 'SBR192', 19.2, 19.2, 11.5, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 223, 7390, 385, 'Equilibrada'),
  ('sungrow-sbr256', 'Sungrow', 'SBR', 'SBR256', 25.6, 25.6, 15.3, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 291, 9690, 379, 'Equilibrada'),
  ('goodwe-lynx-u-54', 'GoodWe', 'Lynx Home U', 'Lynx Home U 5.4', 5.4, 5.4, 2.9, 'LFP', 'Baixa (48 V)', true, 6000, 100, 95, 10, 53, 2090, 387, 'Equilibrada'),
  ('goodwe-lynx-f-66', 'GoodWe', 'Lynx Home F G2', 'Lynx Home F G2 6.6', 6.55, 6.55, 3.6, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 66, 2590, 395, 'Equilibrada'),
  ('goodwe-lynx-f-98', 'GoodWe', 'Lynx Home F G2', 'Lynx Home F G2 9.8', 9.83, 9.83, 5.4, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 93, 3690, 375, 'Equilibrada'),
  ('goodwe-lynx-f-131', 'GoodWe', 'Lynx Home F G2', 'Lynx Home F G2 13.1', 13.1, 13.1, 7.2, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 120, 4880, 373, 'Equilibrada'),
  ('goodwe-lynx-f-164', 'GoodWe', 'Lynx Home F G2', 'Lynx Home F G2 16.4', 16.38, 16.38, 9, 'LFP', 'Alta (HV)', true, 6000, 100, 95, 10, 147, 5990, 366, 'Equilibrada'),
  ('solaredge-home-48v', 'SolarEdge', 'Home Battery', 'Home Battery 48V', 4.6, 4.6, 2.3, 'LFP', 'Baixa (48 V)', false, 6000, 100, 95, 10, 50, 2190, 476, 'Premium'),
  ('solaredge-home-hv10', 'SolarEdge', 'Home Battery', 'Home Battery HV', 9.7, 9.7, 5, 'NMC', 'Alta (HV)', false, 4000, 94, 94, 10, 121, 5150, 531, 'Premium'),
  ('enphase-iq-5p', 'Enphase', 'IQ Battery', 'IQ Battery 5P', 5, 5, 3.8, 'LFP', 'AC acoplada', false, 6000, 98, 90, 15, 35, 3190, 638, 'Premium'),
  ('enphase-iq-10t', 'Enphase', 'IQ Battery', 'IQ Battery 10T', 10.08, 10.08, 3.8, 'LFP', 'AC acoplada', false, 6000, 98, 89, 15, 70, 5750, 570, 'Premium'),
  ('solax-t58', 'Solax', 'Triple Power', 'Triple Power T58', 5.8, 5.5, 2.9, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 60, 2290, 416, 'Equilibrada'),
  ('solax-tbat-h115', 'Solax', 'T-BAT', 'T-BAT H 11.5', 11.5, 10.9, 5.8, 'LFP', 'Alta (HV)', true, 6000, 95, 95, 10, 110, 4490, 412, 'Equilibrada'),
  ('alphaess-smile-b3', 'AlphaESS', 'SMILE', 'SMILE-B3', 2.9, 2.76, 1.5, 'LFP', 'Baixa (48 V)', false, 6000, 95, 95, 10, 33, 1090, 395, 'Equilibrada');
