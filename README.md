# ☀ Solário — Sistema de Dimensionamento Fotovoltaico

Projeto de **Gestão e Programação de Sistemas Informáticos**.

Aplicação web que permite a qualquer cidadão simular uma instalação fotovoltaica
para a sua habitação ou empresa e obter: potência recomendada, área necessária,
número de painéis, produção anual estimada, custo do sistema com IVA, três propostas
alternativas (Económica / Equilibrada / Premium) e tempo de retorno do investimento.

---

## ▶ Como executar

A aplicação é **estática** (HTML/CSS/JavaScript, sem passo de *build*). Basta servi-la
por HTTP a partir da raiz do projeto:

```bash
# opção 1 — Node
npx serve -l 4321 .

# opção 2 — Python
python -m http.server 4321
```

Depois abrir **http://localhost:4321**.

> A base de dados (Supabase) já está configurada em `js/config.js` com chaves públicas.
> Para criar a tua própria base de raiz, segue o guia `SUPABASE_SETUP.md` (executa
> os ficheiros da pasta `database/`).

---

## 📁 Estrutura do projeto

```
.
├── index.html              → página única da aplicação (markup das 3 vistas)
├── css/
│   └── style.css           → todo o estilo (dark glassmorphism)
├── js/
│   ├── config.js           → URL + chave pública do Supabase
│   ├── auth.js             → autenticação (login/registo via Supabase Auth)
│   ├── db.js               → acesso a dados (regioes, paineis, baterias, favoritos, calculos)
│   ├── app.js              → LÓGICA PRINCIPAL: quiz, motor de cálculo, gráficos, relatório
│   ├── paineis.js          → catálogo de 66 painéis reais (dados — fallback local)
│   └── baterias.js         → catálogo de 53 baterias (dados — fallback local)
├── database/
│   ├── schema.sql          → tabelas + RLS (profiles, regioes, paineis, favoritos, calculos)
│   ├── seed.sql            → INSERT dos 66 painéis reais
│   └── baterias.sql        → tabela + INSERT das 53 baterias
├── scripts/                → geradores Node dos dados/seed (uso de desenvolvimento)
│   ├── gen-paineis.js
│   ├── gen-seed.js
│   └── gen-baterias-seed.js
├── js/intro3d.js           → intro 3D (Three.js): painel a montar-se a partir de peças voadoras
├── README.md
└── SUPABASE_SETUP.md       → guia passo-a-passo para configurar o Supabase
```

> **Onde está o código a avaliar:** a lógica toda está em **`js/app.js`**.
> As fórmulas e o algoritmo estão também explicados na aba **«Fórmulas»** da própria app.

---

## 🧮 Algoritmo (conforme o enunciado)

Dados pedidos ao utilizador: **consumo** (anual ou mensal, em kWh), **região**,
**tipo de utilização** (Habitação/Empresa), **área disponível** e **% de autossuficiência**
(25 / 50 / 75 / 100 %). O orçamento é opcional.

```
ConsumoObjetivo   = ConsumoAnual × Cobertura
PotenciaNecessaria = ConsumoObjetivo / ProducaoRegional      (kWp)
NumeroPaineis     = PotenciaNecessaria(W) / PotenciaPainel(W)
Producao anual    = PotenciaInstalada(kWp) × ProducaoRegional (kWh)
Custo             = (Nº painéis × preço + instalação) × (1 + IVA)
Poupanca/ano      = energia aproveitada × preço da eletricidade
Retorno (anos)    = Custo / Poupanca por ano
CO2 evitado       = Producao × 0,20 kg/kWh
```

**Produção solar por região (kWh/kWp/ano):** Norte 1300 · Centro 1450 · Sul 1600–1680 ·
Açores 1400 · Madeira 1700.
**IVA por região:** Continente 23 % · Madeira 22 % · Açores 16 %.

### Três soluções apresentadas
| Solução | Critério |
|---|---|
| **Económica** | menor custo |
| **Equilibrada** *(recomendada)* | melhor relação preço/produção |
| **Premium** | maior eficiência e menor área ocupada |

---

## 🗄️ Base de dados (Supabase / PostgreSQL)

| Tabela | Conteúdo |
|---|---|
| `regioes` | id, nome, **producao_kwh_kwp**, iva |
| `paineis` | catálogo (fabricante, modelo, potência Wp, eficiência, dimensões, preço, garantia…) |
| `baterias` | catálogo de armazenamento |
| `profiles` | perfil do utilizador (ligado a Auth) |
| `favoritos` | painéis favoritos por utilizador (RLS) |
| `calculos` | histórico de cálculos guardados por utilizador (RLS) |

---

## ✨ Funcionalidades extra

- **Exportação** do relatório final em **PDF** e **Excel/CSV**.
- **Gráficos** de produção mensal (sazonalidade).
- **Simulação mensal** e cálculo de **ROI**.
- **Catálogo/marketplace** com filtros, pesquisa e favoritos.
- **Geolocalização** para detetar a região automaticamente.
- Oferta opcional de **baterias** e notas de licenciamento (DGEG / potência contratada).
