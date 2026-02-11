export const SIM_PERSONAS = [
  {
    id: "disciplined-ceo",
    name: "Disciplined Growth CEO",
    roleId: "ceo",
    metricWeights: {
      revenueGrowth: 1.3,
      operatingMargin: 1.0,
      aiAdoption: 1.0,
      modelRisk: -1.0,
      workforceReadiness: 0.9,
      customerTrust: 0.8,
      cashFlow: 0.7,
      executionConfidence: 1.0,
    },
    principleBias: {
      "value-pools": 1.2,
      "portfolio-discipline": 1.2,
      "governance-control": 1.0,
      "people-change": 1.0,
      "data-platform": 1.0,
      "human-agency": 0.95,
      "measurement-cadence": 1.05,
    },
  },
  {
    id: "risk-tight-cfo",
    name: "Risk-Tight CFO",
    roleId: "cfo",
    metricWeights: {
      revenueGrowth: 0.9,
      operatingMargin: 1.2,
      aiAdoption: 0.7,
      modelRisk: -1.45,
      workforceReadiness: 0.7,
      customerTrust: 1.0,
      cashFlow: 1.2,
      executionConfidence: 0.9,
    },
    principleBias: {
      "value-pools": 1.1,
      "portfolio-discipline": 1.0,
      "governance-control": 1.25,
      "people-change": 0.9,
      "data-platform": 1.0,
      "human-agency": 1.1,
      "measurement-cadence": 1.2,
    },
  },
  {
    id: "ops-focused-coo",
    name: "Operations-Focused COO",
    roleId: "coo",
    metricWeights: {
      revenueGrowth: 0.95,
      operatingMargin: 1.05,
      aiAdoption: 1.0,
      modelRisk: -1.0,
      workforceReadiness: 1.3,
      customerTrust: 0.95,
      cashFlow: 0.8,
      executionConfidence: 1.2,
    },
    principleBias: {
      "value-pools": 1.0,
      "portfolio-discipline": 1.1,
      "governance-control": 1.0,
      "people-change": 1.25,
      "data-platform": 1.15,
      "human-agency": 1.05,
      "measurement-cadence": 1.0,
    },
  },
  {
    id: "governance-chair",
    name: "Governance-Driven Board Chair",
    roleId: "board-chair",
    metricWeights: {
      revenueGrowth: 1.0,
      operatingMargin: 1.0,
      aiAdoption: 0.9,
      modelRisk: -1.3,
      workforceReadiness: 0.85,
      customerTrust: 1.1,
      cashFlow: 0.85,
      executionConfidence: 1.1,
    },
    principleBias: {
      "value-pools": 1.05,
      "portfolio-discipline": 1.0,
      "governance-control": 1.3,
      "people-change": 0.95,
      "data-platform": 1.0,
      "human-agency": 1.2,
      "measurement-cadence": 1.2,
    },
  },
  {
    id: "control-first-cro",
    name: "Control-First Chief Risk Officer",
    roleId: "chief-risk-officer",
    metricWeights: {
      revenueGrowth: 0.75,
      operatingMargin: 0.9,
      aiAdoption: 0.65,
      modelRisk: -1.65,
      workforceReadiness: 0.95,
      customerTrust: 1.25,
      cashFlow: 0.8,
      executionConfidence: 1.2,
    },
    principleBias: {
      "value-pools": 0.95,
      "portfolio-discipline": 0.95,
      "governance-control": 1.35,
      "people-change": 1.0,
      "data-platform": 1.1,
      "human-agency": 1.25,
      "measurement-cadence": 1.3,
    },
  },
];

function scoreOptionForPersona(option, persona, scenario) {
  const weight = persona.metricWeights;
  const effect = option.effects;
  let score = 0;
  score += (effect.revenueGrowth || 0) * weight.revenueGrowth;
  score += (effect.operatingMargin || 0) * weight.operatingMargin;
  score += (effect.aiAdoption || 0) * weight.aiAdoption * 0.4;
  score += (effect.modelRisk || 0) * weight.modelRisk * 0.6;
  score += (effect.workforceReadiness || 0) * weight.workforceReadiness * 0.3;
  score += (effect.customerTrust || 0) * weight.customerTrust * 0.4;
  score += (effect.cashFlow || 0) * weight.cashFlow * 0.25;
  score += (effect.executionConfidence || 0) * weight.executionConfidence * 0.35;

  for (const principle of option.principles) {
    score += (persona.principleBias[principle] || 1) * 0.8;
  }

  const preferredTags = scenario?.preferredTags || {};
  for (const tag of option.tags || []) {
    if (preferredTags[tag]) {
      score += preferredTags[tag] * 0.7;
    }
  }
  if ((scenario?.discouragedDecisionIds || []).includes(option.id)) {
    score -= 5.5;
  }

  return score;
}

export function chooseOptionForPersona(options, persona, rng, scenario) {
  if (!options || options.length === 0) {
    return null;
  }

  const scored = options
    .map((option) => ({
      option,
      score: scoreOptionForPersona(option, persona, scenario),
    }))
    .sort((a, b) => b.score - a.score);

  const noise = rng.unit();
  const chosen = noise > 0.84 && scored[1] ? scored[1] : scored[0];
  return chosen.option;
}
