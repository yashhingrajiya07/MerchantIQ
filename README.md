## 🚀 Live Demo

[Open MerchantIQ Live Demo](https://merchantiq.onrender.com)
# MerchantIQ — AI-Powered Merchant Decision Simulator

> **“Before you make a business decision, simulate its consequences.”**  
> Built for the **Razorpay AI Buildathon 2026 (Open Track)**

MerchantIQ is a merchant-side decision-support system. A business operator asks a natural-language business question (in English or Hinglish) about promotions, refunds, inventory orders, ad budgets, or pricing. MerchantIQ converts the question into a structured decision problem, generates multiple realistic candidate scenarios, runs every scenario through a **100% deterministic financial simulation engine**, evaluates hard merchant guardrails (e.g. minimum cash buffers, margin floors), rejects unsafe strategies, and recommends the optimal decision with an evidence-backed **“Why this?”** and **“Why not the others?”** explanation.

---

## 1. Core Differentiation

MerchantIQ is **not** a generic LLM chatbot, a customer-facing product recommender, or a static BI dashboard.

- **AI is the Translator & Explainer**: Natural language intent parsing, candidate scenario formulation, and comparative explanation synthesis.
- **Deterministic Code is the Authoritative Truth**: Integer paise arithmetic, gross/net revenue, COGS, shipping, Razorpay fees (2.36%), day-by-day working capital trajectory, constraint enforcement, and scenario ranking.
- **$\mathbf{AI\ Failure \neq Financial\ Failure}$**: The LLM is never permitted to calculate monetary arithmetic, invent numbers, or directly execute payment actions.

---

## 2. Monorepo Repository Structure

```
merchantiq/
├── apps/
│   ├── web/                    # React + Vite + Tailwind CSS + Lucide fintech dashboard
│   └── api/                    # Express + TypeScript API server with SQLite/in-memory store
├── packages/
│   ├── data-model/             # Zod schemas, TypeScript types, integer paise money utilities
│   ├── simulator/              # Deterministic financial simulation engine (unit-tested formulas)
│   ├── constraints/            # Hard constraint evaluator, risk scoring, ranking algorithm
│   ├── ai/                     # Structured decision parser, scenario generator, explanation layer
│   └── razorpay/               # Razorpay Test Mode client, HMAC SHA256 verification, deduplication
├── tests/
│   ├── simulator/              # Financial calculation unit tests
│   ├── constraints/            # Constraint rejection & ranking tests
│   ├── razorpay/               # Webhook signatures, idempotency, reconciliation tests
│   ├── ai-contracts/           # Zod schema validation & fallback tests
│   └── e2e.test.ts             # Complete 5 worked demo scenarios end-to-end tests
├── scripts/
│   └── seed_demo_data.ts       # Synthetic merchant dataset ("StyleCraft Apparel India")
├── docs/
│   ├── architecture.md         # Full system architecture blueprint
│   ├── assumptions.md          # Financial formulas & modeling assumptions
│   └── demo.md                 # 5-minute buildathon demo script
├── .env.example                # Environment configuration template
└── package.json                # Monorepo workspaces & root scripts
```

---

## 3. Quick Start & Setup

### Prerequisites
- **Node.js**: `v20+` or `v24+`
- **npm**: `v10+` or `v11+`

### 1. Clone & Install Dependencies
```bash
cd merchantiq
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(MerchantIQ is pre-configured with sandbox test keys and an offline local NLP parser fallback, so it runs immediately out-of-the-box even without an external AI API key.)*

### 3. Run Automated Tests
```bash
npm test
```
Runs all 22 unit, integration, and end-to-end tests across all packages.

### 4. Start the Application
Run both the Backend API (`:3001`) and Frontend Dashboard (`:3000`):
```bash
# Terminal 1: Backend API
npm run dev:api

# Terminal 2: Frontend Web
npm run dev:web

# Or concurrently:
npm run dev
```

Open your browser at: **`http://localhost:3000`**

---

## 4. The 6 Worked Demo Scenarios

MerchantIQ includes 6 pre-calibrated demo scenarios ready for 1-click execution:

1. **Demo 1 — Festive Discount Dilemma**:
   *“Diwali ke liye 5%, 10% ya 15% discount? Mere ko minimum 7 lakh cash rakhna hai aur margin 18% se niche nahi jana.”*  
   Simulates 5 scenarios: Baseline, 5%, 10%, 15% (**REJECTED** — cash dips to ₹6.73L, breaching ₹7.0L reserve), and 10% on high-margin products (**RECOMMENDED** — ₹1.45L profit, 55.6% margin).
2. **Demo 2 — Escalating Refund Rate**:
   *“Refunds increased from 8% to 14%. What should I do?”*  
   Compares 7-day return window, sizing fit improvements, and delisting the worst-performing SKU.
3. **Demo 3 — Supplier Bulk Purchase Offer**:
   *“Supplier is offering a 15% discount for 1,000 units. Should I buy now?”*  
   Simulates cash drain vs profit across 400, 600, 800, and 1,000 unit tranches.
4. **Demo 4 — Sales Rising, Profits Falling**:
   *“Why are sales up but profit down?”*  
   Identifies margin erosion driven by unabsorbed shipping fees and high return rates.
5. **Demo 5 — Ad Spend Scaling Test**:
   *“Should I spend ₹50,000 more on ads?”*  
   Evaluates customer acquisition returns across ₹0, ₹25k, ₹50k, and ₹75k spend tiers with diminishing returns.
6. **Demo 6 — Unproductive Ad Spend Loss Fix**:
   *“There is ₹12,000 unproductive ad spend. Simulate fixes.”*  
   Simulates halting underperforming campaigns, reallocating budget to retargeting, and shifting spend strictly to high-margin catalog SKUs.

---

## 5. Storage, AI Architecture & Razorpay Security

- **Native SQLite Persistence**: Persistent storage for decisions, scenarios, assumptions, constraints, and audit logs using Node 24 native `node:sqlite` (`merchantiq.db`).
- **Dual AI Processing**: Calls primary external LLM (Gemini or OpenAI) when API key is provided, with graceful fallback to an offline deterministic semantic parser.
- **Centralized Model Assumptions**: All financial parameters (COGS, shipping freight, return rate) are centralized in `@merchantiq/data-model/assumptions` with explicit sources (`SYNTHETIC_DEMO`, `RAZORPAY_TEST_MODE`, `MERCHANT_HISTORICAL`).
- **Razorpay Integration & Webhook Security**: Timing-safe HMAC SHA256 signature verification, strict event deduplication via `x-razorpay-event-id`, and authoritative payment state reconciliation (`UNKNOWN / RECONCILIATION REQUIRED`).

---

## 6. Verification & Test Coverage

- **Intent Parsing Validity**: Extracts Indian currency amounts, Hinglish keywords, constraints, and detects ambiguity.
- **Financial Arithmetic Correctness**: Zero floating-point drift, integer paise calculations.
- **Hard Constraint Enforcement**: Automatic rejection with exact shortfall calculations.
- **Webhook Idempotency & Security**: Deduplication and forged signature blocking.
- **Reproducibility**: Deterministic SHA-256 inputs hashing (`engine_version: "1.0.0"`).
- **All 22 automated test suites passing**: `npm test`

---

## 7. License

MIT License. Designed and engineered for the Razorpay AI Buildathon 2026.
