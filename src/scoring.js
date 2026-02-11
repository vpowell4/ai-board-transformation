import { clamp } from "./random.js";

function normalized(value, min, max) {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function inverseNormalized(value, min, max) {
  return 1 - normalized(value, min, max);
}

export function buildOutcomeDimensions(state) {
  const metric = state.metrics;
  const businessValue =
    normalized(metric.revenueGrowth, -3, 12) * 0.46 +
    normalized(metric.operatingMargin, 4, 28) * 0.32 +
    normalized(metric.cashFlow, 40, 140) * 0.22;

  const decisionQuality =
    normalized(metric.executionConfidence, 20, 95) * 0.44 +
    inverseNormalized(metric.modelRisk, 0, 100) * 0.36 +
    normalized(metric.customerTrust, 25, 95) * 0.2;

  const leadershipCapability =
    normalized(state.principlesCovered.size, 0, 7) * 0.35 +
    normalized(metric.workforceReadiness, 0, 100) * 0.35 +
    normalized(metric.executionConfidence, 20, 95) * 0.3;

  const speedToImpact =
    normalized(metric.aiAdoption, 0, 100) * 0.4 +
    normalized(metric.revenueGrowth, -3, 12) * 0.25 +
    normalized(metric.executionConfidence, 20, 95) * 0.35;

  const riskControl =
    inverseNormalized(metric.modelRisk, 0, 100) * 0.5 +
    normalized(metric.customerTrust, 25, 95) * 0.2 +
    inverseNormalized(state.incidents, 0, 4) * 0.3;

  return {
    businessValue: clamp(businessValue * 100, 0, 100),
    decisionQuality: clamp(decisionQuality * 100, 0, 100),
    leadershipCapability: clamp(leadershipCapability * 100, 0, 100),
    speedToImpact: clamp(speedToImpact * 100, 0, 100),
    riskControl: clamp(riskControl * 100, 0, 100),
  };
}

export function calculateOutcomeScore(state) {
  const metric = state.metrics;
  const dimensions = buildOutcomeDimensions(state);
  const metricScore =
    normalized(metric.revenueGrowth, -3, 12) * 18 +
    normalized(metric.operatingMargin, 4, 28) * 16 +
    normalized(metric.aiAdoption, 0, 100) * 16 +
    inverseNormalized(metric.modelRisk, 0, 100) * 17 +
    normalized(metric.workforceReadiness, 0, 100) * 13 +
    normalized(metric.customerTrust, 0, 100) * 10 +
    normalized(metric.cashFlow, 40, 140) * 10;

  const principlesCompleted = state.principlesCovered.size;
  const principleScore = normalized(principlesCompleted, 0, 7) * 100;
  const dimensionComposite =
    dimensions.businessValue * 0.26 +
    dimensions.decisionQuality * 0.24 +
    dimensions.leadershipCapability * 0.16 +
    dimensions.speedToImpact * 0.16 +
    dimensions.riskControl * 0.18;
  const resilienceScore =
    inverseNormalized(state.incidents, 0, 4) * 60 +
    normalized(metric.executionConfidence, 20, 95) * 40;
  const incidentPenalty = state.incidents * 2.8;
  const executionPenalty = Math.max(0, 55 - metric.executionConfidence) * 0.18;

  const blended =
    metricScore * 0.44 +
    dimensionComposite * 0.32 +
    principleScore * 0.16 +
    resilienceScore * 0.08;

  return clamp(blended - incidentPenalty - executionPenalty, 0, 100);
}

export function buildScorecard(state) {
  const overall = calculateOutcomeScore(state);
  const dimensions = buildOutcomeDimensions(state);
  let rating = "Watchlist";
  if (overall >= 85) {
    rating = "Excellent";
  } else if (overall >= 70) {
    rating = "Strong";
  } else if (overall >= 55) {
    rating = "Mixed";
  }

  return {
    overall,
    rating,
    incidents: state.incidents,
    principlesCovered: state.principlesCovered.size,
    outcomeDimensions: dimensions,
  };
}
