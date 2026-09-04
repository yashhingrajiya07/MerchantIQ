# MerchantIQ — System Architecture & Technical Blueprint

## 1. Executive Overview

**MerchantIQ** is an AI-powered merchant decision simulator designed for the **Razorpay AI Buildathon 2026 (Open Track)**. It shifts the paradigm from traditional retrospective dashboards to predictive, forward-looking scenario simulations. 

The core architectural promise is:
> **"Before you make a business decision, simulate its consequences — without letting the AI directly control money."**

---

## 2. The Golden Rule of Financial Safety

$$\mathbf{AI\ Failure \neq Financial\ Failure}$$

In MerchantIQ, responsibilities are strictly separated between **non-authoritative AI** and **authoritative deterministic software**:

| AI Layer (Non-Authoritative) | Deterministic Financial Engine (Authoritative) |
| :--- | :--- |
| Natural language intent parsing | Integer paise currency arithmetic |
| Business problem classification | Gross & net revenue calculation |
| Formulating candidate scenario ideas | COGS, shipping, & gateway fee formulas |
| Generating natural language explanations | Hard constraint evaluation (`min_cash`, `min_margin`) |
| Synthesizing "Why Not The Others?" trade-offs | Multi-objective ranking & winner selection |
| Assisting merchant question clarification | Razorpay webhook HMAC verification & reconciliation |

---

## 3. End-to-End Data Flow

```
Merchant Question (Natural Language / Hinglish)
                     │
                     ▼
           AI Decision Parser
       (Gemini / Local NLP Fallback)
                     │
                     ▼
         Structured Decision Object
                     │
                     ▼
          Zod Schema Validation
           (Rejects Malformed AI)
                     │
                     ▼
            Scenario Generator
         (3 to 8 Viable Alternatives)
                     │
                     ▼
   Deterministic Financial Simulation Engine
      (Integer Paise, Revenue, Costs, Cash)
                     │
                     ▼
         Constraint & Risk Engine
     (Evaluates Hard Rules: Min Cash, Margin)
                     │
                     ▼
              Scenario Ranking
      (Multi-Objective Optimization Score)
                     │
                     ▼
          AI Explanation Generator
      ("Why This?" & "Why Not The Others?")
                     │
                     ▼
          Merchant Decision Workspace
      (Merchant Remains Final Decision Maker)
```

---

## 4. Razorpay Integration Architecture

MerchantIQ integrates with **Razorpay Test Mode** as its single source of authoritative transaction truth:

1. **REST APIs**:
   - **Orders API**: Retrieves order records and binds transaction context.
   - **Payments API**: Authoritative state verification (Captured, Authorized, Failed).
   - **Refunds API**: Controlled sandbox refund records.
   - **Settlements API**: T+2 deposit timelines providing cash inflow evidence.

2. **Webhook Safety Pipeline**:
   - **Signature Verification**: Validates `X-Razorpay-Signature` using `HMAC-SHA256` with timing-safe comparison to prevent timing attacks.
   - **Deduplication**: Inspects `x-razorpay-event-id` against an in-memory & persistent cache; duplicate retries are acknowledged with `200 OK` promptly to halt gateway retries without duplicate ledger actions.
   - **Reconciliation Engine**: Resolves ambiguous or out-of-order webhook events by querying authoritative Razorpay APIs. If unreachable, the payment is safely marked `UNKNOWN / RECONCILIATION REQUIRED` rather than guessing.

---

## 5. Storage & Versioning

- **Integer Minor Units**: All monetary amounts are handled as integer paise (1 INR = 100 paise) to eliminate IEEE 754 floating-point drift.
- **Reproducibility**: Every simulation run calculates a SHA-256 hash of its canonical input configuration. Identical inputs will deterministically yield the identical hash and output.
- **Simulation Engine Version**: Versioned (`v1.0.0`) so historical simulations remain verifiable against the exact model used at generation time.
