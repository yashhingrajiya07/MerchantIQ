# MerchantIQ — 5-Minute Buildathon Demo Script

Follow this step-by-step walkthrough during the live presentation or evaluation.

---

### **Minute 0:00 - 0:30: The Core Problem**
- **Speaker:** "Merchants don't lack dashboards. They lack foresight. Today, before launching a festive discount or ordering inventory, business owners are forced to guess or build clunky spreadsheets."
- **Action:** Open MerchantIQ Dashboard. Point to the live KPIs, the active ₹7.0L cash reserve guardrail, and Razorpay Test Mode status.

---

### **Minute 0:30 - 1:00: Asking the Natural Language Business Question**
- **Speaker:** "Instead of asking a chatbot for generic advice, a merchant asks a direct business question in English or Hinglish."
- **Action:** Click the **Demo 1 preset chip** or enter:
  > *"Diwali ke liye 5%, 10% ya 15% discount? Mere ko minimum 7 lakh cash rakhna hai aur margin 18% se niche nahi jana."*
- Click **"Simulate Scenarios"**.

---

### **Minute 1:00 - 2:00: Inspecting Deterministic Simulation Results**
- **Speaker:** "MerchantIQ parses the question into a strict decision schema and generates 5 distinct alternatives, including a baseline and a targeted high-margin promotion. Notice: every calculation is 100% deterministic code using integer paise arithmetic."
- **Action:** Point to the **Scenario Matrix**:
  - Baseline (No discount): ₹5.0L revenue, ₹1.20L profit, ₹7.68L min cash.
  - 5% Discount: ₹5.6L revenue, ₹1.31L profit.
  - 10% Discount: ₹6.4L revenue, ₹1.39L profit.
  - 15% Storewide: ₹7.1L revenue.

---

### **Minute 2:00 - 2:45: Demonstrating Hard Constraint Enforcement**
- **Speaker:** "Look at the 15% discount scenario. It generates the highest top-line revenue (₹7.1L). A naive AI might recommend it. But MerchantIQ automatically marks it **REJECTED**."
- **Action:** Highlight the red **REJECTED** badge and violation text:
  > *"Projected minimum cash of ₹6.73L is ₹26.5k below your required safety reserve of ₹7,00,000."*
- Click on the scenario card to show the **30-Day Working Capital Cash Trajectory line chart** and formula audit.

---

### **Minute 2:45 - 3:30: Recommendation & "Why Not The Others?"**
- **Speaker:** "The system recommends **10% Discount on High-Margin Products Only** (₹6.1L revenue, ₹1.45L profit, 55.6% margin). Now look at our signature feature: **Why Not The Others?**"
- **Action:** Review the itemized comparative card:
  - Explains why 15% was rejected (cash drain).
  - Explains why baseline lost (left ₹25k profit on the table).
  - Explains why 5% and 10% storewide lost (margin dilution on low-margin SKUs).

---

### **Minute 3:30 - 4:15: Interactive Sensitivity Analysis**
- **Speaker:** "What if the merchant has an extra line of credit? Let's test the sensitivity."
- **Action:** In the left column, drag the **Min Cash Reserve** slider down from ₹7.0L to **₹6.5L** and click **"Re-run Constraint Filter"**.
- **Result:** The 15% discount immediately flips from REJECTED to ELIGIBLE!

---

### **Minute 4:15 - 4:45: Razorpay Security & AI Failure Resilience**
- **Speaker:** "MerchantIQ protects money logic. Let's see Razorpay live integration and AI failure protection."
- **Action:**
  1. Open **"Razorpay Monitor"** tab. Click **"Trigger Duplicate Event"** to demonstrate instant idempotent deduplication. Click **"Trigger Forged Signature"** to demonstrate HMAC rejection.
  2. Open **"Data & Safety Lab"** tab. Click **"Simulate LLM Outage"** and show that the deterministic engine and local semantic parser continue operating with zero corruption.

---

### **Minute 4:45 - 5:00: Closing Statement**
- **Speaker:**
  > *"We don't just tell merchants what happened yesterday. MerchantIQ lets them simulate what could happen tomorrow before they make their next business decision. Thank you."*
