import { createSession, applyUserTurn, buildClientState } from "./engine.js";
import { SIM_PERSONAS, chooseOptionForPersona } from "./personas.js";
import { DEFAULT_PROMPT_PROFILE, resolvePromptProfile } from "./prompt-profile.js";
import { createRng } from "./random.js";
import { SCENARIOS } from "./scenarios.js";

const KEYS = Object.keys(DEFAULT_PROMPT_PROFILE);
const DEFAULT_SEEDS = [11, 29, 47, 67];

export const CORE_SCENARIO_IDS = [
  "bank-risk-and-growth-rebalance",
  "pe-portfolio-value-creation",
  "public-sector-service-recovery",
  "manufacturing-network-resilience",
  "healthcare-clinical-ops-safety",
];

function cloneProfile(profile) {
  return { ...profile };
}

function profileObjective(summary) {
  return (
    summary.avgScore * 1.0 +
    summary.excellentRate * 14 +
    summary.strongRate * 4 -
    summary.avgIncidents * 2.2 +
    summary.avgBusinessValue * 0.06 +
    summary.avgDecisionQuality * 0.09 +
    summary.avgLeadershipCapability * 0.04 +
    summary.avgSpeedToImpact * 0.05 +
    summary.avgRiskControl * 0.08
  );
}

function summarizeEpisodes(episodes) {
  const count = Math.max(episodes.length, 1);
  const avgScore = episodes.reduce((sum, item) => sum + item.finalScore, 0) / count;
  const excellentRate = episodes.filter((item) => item.finalScore >= 85).length / count;
  const strongRate = episodes.filter((item) => item.finalScore >= 70).length / count;
  const avgIncidents = episodes.reduce((sum, item) => sum + item.incidents, 0) / count;
  const avgBusinessValue =
    episodes.reduce((sum, item) => sum + item.outcomeDimensions.businessValue, 0) / count;
  const avgDecisionQuality =
    episodes.reduce((sum, item) => sum + item.outcomeDimensions.decisionQuality, 0) / count;
  const avgLeadershipCapability =
    episodes.reduce((sum, item) => sum + item.outcomeDimensions.leadershipCapability, 0) / count;
  const avgSpeedToImpact =
    episodes.reduce((sum, item) => sum + item.outcomeDimensions.speedToImpact, 0) / count;
  const avgRiskControl =
    episodes.reduce((sum, item) => sum + item.outcomeDimensions.riskControl, 0) / count;
  return {
    avgScore,
    excellentRate,
    strongRate,
    avgIncidents,
    avgBusinessValue,
    avgDecisionQuality,
    avgLeadershipCapability,
    avgSpeedToImpact,
    avgRiskControl,
    objective: 0,
  };
}

function getScenarioById(scenarioId) {
  return SCENARIOS.find((scenario) => scenario.id === scenarioId) || SCENARIOS[0];
}

export function runEpisode(persona, promptProfile, seed, scenarioId) {
  const scenario = getScenarioById(scenarioId);
  const state = createSession({
    roleId: persona.roleId,
    sectorId: scenario.sectorId,
    scenarioId: scenario.id,
    seed,
    promptProfile,
    companyName: "Aquila Industries",
  });
  const rng = createRng(seed * 100 + 17);
  const transcript = [];

  while (!state.completed) {
    const option = chooseOptionForPersona(state.options, persona, rng, state.scenario);
    if (!option) {
      break;
    }
    const result = applyUserTurn(state, { optionId: option.id, message: option.title });
    const snapshot = buildClientState(state);
    transcript.push({
      quarter: state.turn,
      decisionId: option.id,
      decisionTitle: option.title,
      scenarioEvent: result.scenarioEvent ? result.scenarioEvent.title : null,
      incident: result.incident ? result.incident.title : null,
      score: Number(result.scorecard.overall.toFixed(2)),
      incidents: snapshot.scorecard.incidents,
    });
  }

  const finalView = buildClientState(state);
  return {
    persona: persona.id,
    roleId: persona.roleId,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    sectorId: scenario.sectorId,
    seed,
    finalScore: finalView.scorecard.overall,
    rating: finalView.scorecard.rating,
    incidents: finalView.scorecard.incidents,
    principlesCovered: finalView.scorecard.principlesCovered,
    outcomeDimensions: finalView.scorecard.outcomeDimensions,
    transcript,
  };
}

function evaluateProfile(
  profile,
  profileName = "candidate",
  scenarioIds = CORE_SCENARIO_IDS,
  seeds = DEFAULT_SEEDS
) {
  const cleanProfile = resolvePromptProfile(profile);
  const episodes = [];
  for (const persona of SIM_PERSONAS) {
    for (const scenarioId of scenarioIds) {
      for (const seed of seeds) {
        episodes.push(runEpisode(persona, cleanProfile, seed, scenarioId));
      }
    }
  }
  const summary = summarizeEpisodes(episodes);
  summary.objective = profileObjective(summary);
  return {
    profileName,
    profile: cleanProfile,
    summary,
    episodes,
  };
}

function generateSeedProfiles() {
  return [
    {
      name: "default",
      profile: cloneProfile(DEFAULT_PROMPT_PROFILE),
    },
    {
      name: "governance-heavy",
      profile: {
        ...DEFAULT_PROMPT_PROFILE,
        "governance-control": 1.33,
        "measurement-cadence": 1.3,
        "human-agency": 1.22,
        "value-pools": 1.05,
      },
    },
    {
      name: "value-speed-balanced",
      profile: {
        ...DEFAULT_PROMPT_PROFILE,
        "value-pools": 1.28,
        "portfolio-discipline": 1.24,
        "data-platform": 1.08,
        "governance-control": 1.12,
      },
    },
    {
      name: "people-platform",
      profile: {
        ...DEFAULT_PROMPT_PROFILE,
        "people-change": 1.26,
        "data-platform": 1.2,
        "governance-control": 1.18,
      },
    },
  ];
}

function mutateProfile(profile) {
  const mutations = [];
  for (const key of KEYS) {
    for (const delta of [-0.1, 0.1]) {
      const candidate = cloneProfile(profile);
      candidate[key] = Number((candidate[key] + delta).toFixed(2));
      mutations.push({
        name: `mutate-${key}-${delta > 0 ? "up" : "down"}`,
        profile: candidate,
      });
    }
  }
  return mutations;
}

export function runTuning({
  hillClimbRounds = 3,
  scenarioIds = CORE_SCENARIO_IDS,
  seeds = DEFAULT_SEEDS,
} = {}) {
  const candidates = [];
  for (const seedProfile of generateSeedProfiles()) {
    candidates.push(evaluateProfile(seedProfile.profile, seedProfile.name, scenarioIds, seeds));
  }

  candidates.sort((a, b) => b.summary.objective - a.summary.objective);
  let best = candidates[0];
  const explored = [...candidates];

  for (let round = 1; round <= hillClimbRounds; round += 1) {
    const mutations = mutateProfile(best.profile);
    const evaluated = mutations.map((item) =>
      evaluateProfile(item.profile, `${item.name}-r${round}`, scenarioIds, seeds)
    );
    evaluated.sort((a, b) => b.summary.objective - a.summary.objective);
    explored.push(...evaluated);
    if (evaluated[0].summary.objective > best.summary.objective + 0.08) {
      best = evaluated[0];
    } else {
      break;
    }
  }

  explored.sort((a, b) => b.summary.objective - a.summary.objective);
  return {
    tunedProfile: best.profile,
    bestResult: best,
    leaderboard: explored.slice(0, 10).map((item) => ({
      profileName: item.profileName,
      profile: item.profile,
      summary: item.summary,
    })),
    coverage: {
      roles: SIM_PERSONAS.length,
      scenarios: scenarioIds.length,
      seedsPerScenario: seeds.length,
      episodes: best.episodes.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

function groupedRoleScenarioSummary(episodes) {
  const map = new Map();
  for (const episode of episodes) {
    const key = `${episode.roleId}::${episode.scenarioId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(episode);
  }
  const rows = [];
  for (const [key, items] of map.entries()) {
    const [roleId, scenarioId] = key.split("::");
    const avgScore = items.reduce((sum, item) => sum + item.finalScore, 0) / items.length;
    const avgIncidents = items.reduce((sum, item) => sum + item.incidents, 0) / items.length;
    const decisionQuality =
      items.reduce((sum, item) => sum + item.outcomeDimensions.decisionQuality, 0) / items.length;
    const riskControl =
      items.reduce((sum, item) => sum + item.outcomeDimensions.riskControl, 0) / items.length;
    rows.push({
      roleId,
      scenarioId,
      scenarioName: items[0].scenarioName,
      avgScore,
      avgIncidents,
      decisionQuality,
      riskControl,
    });
  }
  rows.sort((a, b) => a.roleId.localeCompare(b.roleId) || a.scenarioId.localeCompare(b.scenarioId));
  return rows;
}

export function runScenarioMatrix({
  profile = DEFAULT_PROMPT_PROFILE,
  scenarioIds = CORE_SCENARIO_IDS,
  seeds = DEFAULT_SEEDS,
} = {}) {
  const cleanProfile = resolvePromptProfile(profile);
  const episodes = [];
  for (const persona of SIM_PERSONAS) {
    for (const scenarioId of scenarioIds) {
      for (const seed of seeds) {
        episodes.push(runEpisode(persona, cleanProfile, seed, scenarioId));
      }
    }
  }
  const summary = summarizeEpisodes(episodes);
  const roleScenarioRows = groupedRoleScenarioSummary(episodes);

  const weakRows = roleScenarioRows
    .filter((row) => row.avgScore < 80.5 || row.avgIncidents > 0.75)
    .slice(0, 8)
    .map((row) => ({
      roleId: row.roleId,
      scenarioId: row.scenarioId,
      scenarioName: row.scenarioName,
      recommendation:
        row.avgIncidents > 0.75
          ? "Increase governance and cadence weighting; push earlier control actions."
          : "Strengthen workflow redesign and data foundation sequencing, with explicit board intervention checkpoints.",
    }));

  return {
    profile: cleanProfile,
    scenarioIds,
    seeds,
    episodes,
    summary,
    roleScenarioRows,
    weakRows,
    generatedAt: new Date().toISOString(),
  };
}
