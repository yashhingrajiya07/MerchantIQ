import {
  ScenarioSimulationOutput,
  ScenarioStatus,
  Objective
} from '@merchantiq/data-model';

export interface RankingWeights {
  w_profit: number;
  w_cash: number;
  w_growth: number;
  w_risk: number;
}

export function getObjectiveWeights(objective: Objective): RankingWeights {
  switch (objective) {
    case Objective.INCREASE_REVENUE:
    case Objective.ACCELERATE_GROWTH:
      return { w_profit: 0.25, w_cash: 0.20, w_growth: 0.50, w_risk: 0.05 };
    case Objective.PROTECT_LIQUIDITY:
      return { w_profit: 0.15, w_cash: 0.60, w_growth: 0.05, w_risk: 0.20 };
    case Objective.REDUCE_LOSS:
    case Objective.REDUCE_REFUND_RISK:
      return { w_profit: 0.30, w_cash: 0.25, w_growth: 0.10, w_risk: 0.35 };
    case Objective.CLEAR_INVENTORY:
      return { w_profit: 0.20, w_cash: 0.35, w_growth: 0.35, w_risk: 0.10 };
    case Objective.IMPROVE_ROI:
      return { w_profit: 0.50, w_cash: 0.25, w_growth: 0.15, w_risk: 0.10 };
    case Objective.BALANCED:
      return { w_profit: 0.35, w_cash: 0.30, w_growth: 0.20, w_risk: 0.15 };
    case Objective.MAXIMIZE_PROFIT:
    default:
      return { w_profit: 0.55, w_cash: 0.25, w_growth: 0.10, w_risk: 0.10 };
  }
}

/**
 * Normalizes values to 0-100 scale across all scenarios to compute balanced multi-objective score.
 */
export function rankScenarios(
  scenarios: ScenarioSimulationOutput[],
  objective: Objective = Objective.MAXIMIZE_PROFIT
): {
  rankedScenarios: ScenarioSimulationOutput[];
  recommendedScenario: ScenarioSimulationOutput | null;
} {
  if (scenarios.length === 0) {
    return { rankedScenarios: [], recommendedScenario: null };
  }

  const weights = getObjectiveWeights(objective);

  // Compute min/max bounds across scenarios for normalization
  const profits = scenarios.map((s) => s.contribution_profit_paise);
  const cashes = scenarios.map((s) => s.projected_minimum_cash_paise);
  const revenues = scenarios.map((s) => s.net_revenue_paise);

  const minProfit = Math.min(...profits);
  const maxProfit = Math.max(...profits);
  const minCash = Math.min(...cashes);
  const maxCash = Math.max(...cashes);
  const minRev = Math.min(...revenues);
  const maxRev = Math.max(...revenues);

  // Calculate score for each scenario
  const scored = scenarios.map((scenario) => {
    // 0 to 100 normalized scores
    const profit_score = maxProfit === minProfit ? 50 : ((scenario.contribution_profit_paise - minProfit) / Math.max(maxProfit - minProfit, 1)) * 100;
    const cash_safety_score = maxCash === minCash ? 50 : ((scenario.projected_minimum_cash_paise - minCash) / Math.max(maxCash - minCash, 1)) * 100;
    const growth_score = maxRev === minRev ? 50 : ((scenario.net_revenue_paise - minRev) / Math.max(maxRev - minRev, 1)) * 100;
    const risk_score = scenario.risk_score; // already 0 - 100

    const rawScore =
      weights.w_profit * profit_score +
      weights.w_cash * cash_safety_score +
      weights.w_growth * growth_score -
      weights.w_risk * risk_score;

    const finalScore = Number(rawScore.toFixed(1));

    // Transparent Decision Score Breakdown
    const profit_pts = Math.round((profit_score / 100) * 40);
    const cash_safety_pts = Math.round((cash_safety_score / 100) * 25);
    const growth_pts = Math.round((growth_score / 100) * 25);
    const risk_penalty = Math.round((risk_score / 100) * 10);
    const total_score = Math.max(0, Math.min(100, profit_pts + cash_safety_pts + growth_pts - risk_penalty));

    const score_breakdown = {
      profit_pts,
      cash_safety_pts,
      growth_pts,
      risk_penalty,
      total_score,
      explanation: `Profit: ${profit_pts}/40 | Cash: ${cash_safety_pts}/25 | Growth: ${growth_pts}/25 | Risk Penalty: -${risk_penalty}/10`
    };

    return {
      ...scenario,
      score: finalScore,
      score_breakdown
    };
  });

  // Filter eligible scenarios: all hard constraints must pass
  const eligibleScenarios = scored.filter((s) => s.all_constraints_passed);

  // Pick winner with highest score among eligible
  let recommendedScenario: ScenarioSimulationOutput | null = null;
  if (eligibleScenarios.length > 0) {
    eligibleScenarios.sort((a, b) => b.score - a.score);
    const winnerId = eligibleScenarios[0].scenario_id;

    const finalScenarios = scored.map((s) => {
      if (s.scenario_id === winnerId) {
        const rec = { ...s, status: ScenarioStatus.RECOMMENDED };
        recommendedScenario = rec;
        return rec;
      }
      if (s.status === ScenarioStatus.RECOMMENDED) {
        return { ...s, status: ScenarioStatus.ELIGIBLE };
      }
      return s;
    });

    return {
      rankedScenarios: finalScenarios,
      recommendedScenario
    };
  }

  return {
    rankedScenarios: scored,
    recommendedScenario: null
  };
}
