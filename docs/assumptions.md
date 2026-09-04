# MerchantIQ — Financial Formulas & Assumptions Reference

This document formalizes the mathematical formulas, working capital models, and evidentiary standards used throughout MerchantIQ.

---

## 1. Core Financial Formulas

All currency arithmetic is computed strictly in integer paise ($1\text{ INR} = 100\text{ paise}$).

### 1.1 Gross Merchandise Value (GMV) & Net Revenue
$$\text{Projected Orders} = \text{Baseline Orders} \times \left(1 + \text{Discount Rate} \times \text{Demand Elasticity}\right)$$
$$\text{GMV} = \text{Projected Orders} \times \text{Average Order Value (AOV)}$$
$$\text{Discount Cost} = \text{GMV}_{\text{eligible}} \times \text{Discount Rate}$$
$$\text{Net Revenue} = \text{GMV} - \text{Discount Cost}$$

### 1.2 Cost of Goods Sold (COGS)
$$\text{Effective COGS \%} = \begin{cases} 35\% & \text{for High-Margin targeted catalogs} \\ 48\% & \text{for Storewide baseline} \end{cases}$$
$$\text{COGS Paise} = \frac{\text{GMV} \times \text{Effective COGS \%}}{100}$$

### 1.3 Variable Shipping & Fulfillment
$$\text{Shipping Cost} = \text{Projected Orders} \times \text{Shipping Cost Per Order}$$

### 1.4 Payment Gateway Processing Fees
Modeled after Razorpay Test Mode standard Indian domestic pricing:
$$\text{Gateway Fee} = \text{Net Revenue} \times 2.36\% \quad (2.00\% \text{ MDR} + 18\% \text{ GST})$$

### 1.5 Profitability Metrics
$$\text{Gross Profit} = \text{Net Revenue} - \text{COGS} - \text{Shipping Cost}$$
$$\text{Contribution Profit} = \text{Gross Profit} - \text{Payment Fee} - \text{Ad/Campaign Cost}$$
$$\text{Profit Margin \%} = \frac{\text{Contribution Profit}}{\text{Net Revenue}} \times 100$$

### 1.6 Refund Exposure & Expected Loss
$$\text{Refund Exposure} = \text{Projected Orders} \times \text{Refund Rate} \times \text{AOV}$$
$$\text{Expected Refund Loss} = \text{Refund Exposure} \times 35\% \quad (\text{Reverse logistics + gateway chargeback})$$

---

## 2. Working Capital & Cash Trajectory

$$\text{Daily Inflow} = \text{Settled Revenue (with T+2 Banking Day Delay)}$$
$$\text{Daily Outflow} = \text{Daily Shipping} + \text{Gateway Fees} + \text{Ad Spend} + \text{Refund Reserves} + \text{COGS replenishment}$$
$$\text{Working Capital Inventory Float} = \text{COGS} \times \text{Drain Factor}$$

$$\text{Projected Minimum Cash} = \min_{t \in [1, 30]} \left(\text{Opening Cash} + \sum_{\tau=1}^t \text{Inflow}_\tau - \sum_{\tau=1}^t \text{Outflow}_\tau \right)$$

---

## 3. Multi-Objective Scenario Ranking Formula

For all scenarios that pass 100% of hard merchant constraints:
$$\text{Score} = w_{\text{profit}} \cdot S_{\text{profit}} + w_{\text{cash}} \cdot S_{\text{cash}} + w_{\text{growth}} \cdot S_{\text{growth}} - w_{\text{risk}} \cdot S_{\text{risk}}$$

Where:
- $S_{\text{profit}}$: Normalized contribution profit (0 to 100)
- $S_{\text{cash}}$: Normalized minimum cash cushion (0 to 100)
- $S_{\text{growth}}$: Normalized revenue growth (0 to 100)
- $S_{\text{risk}}$: Composite risk score (0 to 100)
- The highest-scoring eligible scenario is marked `RECOMMENDED`.
