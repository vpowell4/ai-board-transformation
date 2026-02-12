import { DECISION_LIBRARY, getDecisionById } from "./decisions.js";
import { BOARD_ROLES, getRole } from "./roles.js";
import { BOOK_PRINCIPLES, OBLONGIX_FRAMEWORK_STAGES } from "./books.js";
import { clamp, createRng } from "./random.js";
import { buildScorecard } from "./scoring.js";
import { resolvePromptProfile } from "./prompt-profile.js";
import {
  applyScenarioMetricShift,
  getScenarioForSector,
  getSectorById,
} from "./scenarios.js";

const MAX_TURNS = 10;
const OPTION_COUNT = 5;
const MAX_DECISIONS_PER_TURN = 2;
const SECONDARY_DECISION_DAMPENING = 0.72;

const BOARD_VOICE_ROLE_IDS = ["board-chair", "ceo", "cfo", "coo", "chief-risk-officer"];

const BOARD_QUESTIONS = [
  "Have we treated this as business redesign, or are we still running a technology project?",
  "Which decisions now become AI-assisted, AI-led, or strictly human-controlled?",
  "What evidence proves this has moved from pilot theater into a production workflow?",
  "What foundation debt in data or operating model could now cap value realization?",
  "What board-level intervention is required if control evidence weakens next quarter?",
  "Are we measuring decision quality and speed to impact, not just model activity?",
];

function baseMetrics() {
  return {
    revenueGrowth: 2.8,
    operatingMargin: 14.2,
    aiAdoption: 16,
    modelRisk: 46,
    workforceReadiness: 34,
    customerTrust: 62,
    cashFlow: 96,
    executionConfidence: 56,
  };
}

function clipMetrics(metrics) {
  return {
    revenueGrowth: clamp(metrics.revenueGrowth, -6, 18),
    operatingMargin: clamp(metrics.operatingMargin, 2, 32),
    aiAdoption: clamp(metrics.aiAdoption, 0, 100),
    modelRisk: clamp(metrics.modelRisk, 0, 100),
    workforceReadiness: clamp(metrics.workforceReadiness, 0, 100),
    customerTrust: clamp(metrics.customerTrust, 0, 100),
    cashFlow: clamp(metrics.cashFlow, 20, 170),
    executionConfidence: clamp(metrics.executionConfidence, 15, 100),
  };
}

function generateSessionId(rng) {
  return `sim-${Math.floor(rng.range(100000, 999999))}-${Date.now().toString(36)}`;
}

function getStageForTurn(turn) {
  const index = Math.min(
    OBLONGIX_FRAMEWORK_STAGES.length - 1,
    Math.floor((turn / MAX_TURNS) * OBLONGIX_FRAMEWORK_STAGES.length)
  );
  return OBLONGIX_FRAMEWORK_STAGES[index];
}

function getQuarterLabel(turn) {
  const quarter = (turn % 4) + 1;
  const year = Math.floor(turn / 4) + 1;
  return `Y${year} Q${quarter}`;
}

function scenarioVolatilityMultiplier(state) {
  const sectorId = state.sector?.id;
  if (sectorId === "financial-services" || sectorId === "healthcare") {
    return 1.08;
  }
  if (sectorId === "private-equity") {
    return 1.12;
  }
  if (sectorId === "public-sector") {
    return 1.05;
  }
  return 1;
}

function scenarioQuestion(state) {
  const scenario = state.scenario;
  const stage = getStageForTurn(state.turn);
  const scenarioSpecific = state.rng.pick(scenario.boardQuestions || []);
  if (scenarioSpecific) {
    return `Scenario focus (${scenario.name}, ${stage}): ${scenarioSpecific}`;
  }
  const chapterPrompt = state.rng.pick(scenario.chapterAnchors || []);
  return `Scenario focus (${scenario.name}, ${stage}): ${chapterPrompt}`;
}

function classifyDecisionType(decision) {
  const tags = decision.tags || [];
  if (
    tags.some((tag) =>
      ["risk", "governance", "legal", "ethics", "compliance", "board", "metrics", "reputation"].includes(tag)
    )
  ) {
    return "control";
  }
  if (tags.some((tag) => ["data", "platform", "technology"].includes(tag))) {
    return "foundation";
  }
  if (tags.some((tag) => ["people", "talent", "change", "service", "operations"].includes(tag))) {
    return "capability";
  }
  if (tags.some((tag) => ["growth", "customer", "product", "m&a", "ecosystem"].includes(tag))) {
    return "growth";
  }
  return "portfolio";
}

function decisionRiskProfile(decision) {
  const riskShift = Number(decision.effects.modelRisk || 0);
  const confidenceShift = Number(decision.effects.executionConfidence || 0);
  if (riskShift >= 4 || confidenceShift <= -4) {
    return "high-risk";
  }
  if (riskShift <= -5 && confidenceShift >= 3) {
    return "stabilizing";
  }
  return "balanced";
}

function getPriorityNeed(state) {
  const metric = state.metrics;
  return {
    risk: metric.modelRisk > 45 ? 1 : 0.4,
    data: metric.aiAdoption < 45 ? 1 : 0.5,
    people: metric.workforceReadiness < 55 ? 1 : 0.45,
    growth: metric.revenueGrowth < 6 ? 1 : 0.55,
    trust: metric.customerTrust < 70 ? 1 : 0.6,
    cash: metric.cashFlow < 80 ? 1.1 : 0.6,
  };
}

function decisionUtility(decision, state) {
  const needs = getPriorityNeed(state);
  const role = state.role;
  const profile = state.promptProfile;
  const scenario = state.scenario;

  let principleScore = 0;
  for (const principle of decision.principles) {
    const profileWeight = profile[principle] || 1;
    const roleWeight = role.priorities[principle] || 1;
    const coveredPenalty = state.principlesCovered.has(principle) ? 0.95 : 1.08;
    principleScore += profileWeight * roleWeight * coveredPenalty;
  }

  let tagScore = 0;
  if (decision.tags.includes("risk") || decision.tags.includes("governance")) {
    tagScore += 1.6 * needs.risk;
  }
  if (decision.tags.includes("data") || decision.tags.includes("platform")) {
    tagScore += 1.5 * needs.data;
  }
  if (decision.tags.includes("people") || decision.tags.includes("talent")) {
    tagScore += 1.4 * needs.people;
  }
  if (decision.tags.includes("growth") || decision.tags.includes("product")) {
    tagScore += 1.3 * needs.growth;
  }
  if (decision.tags.includes("customer")) {
    tagScore += 1.2 * needs.trust;
  }
  if (decision.tags.includes("finance") || decision.tags.includes("cost")) {
    tagScore += 1.1 * needs.cash;
  }

  const preferredTags = scenario?.preferredTags || {};
  for (const tag of decision.tags) {
    if (preferredTags[tag]) {
      tagScore += preferredTags[tag];
    }
  }

  if ((scenario?.discouragedDecisionIds || []).includes(decision.id)) {
    tagScore -= 6.4;
  }

  const priorityDecisionIds = scenario?.priorityDecisionIds || [];
  if (priorityDecisionIds.includes(decision.id) && !state.capabilities.has(decision.id)) {
    tagScore += 2.2;
  }

  const repetitionPenalty = state.history.some((item) => item.decisionIds.includes(decision.id)) ? -3.4 : 0;
  const confidencePenalty = decision.effects.executionConfidence < 0 ? -1.2 : 0;
  return principleScore + tagScore + repetitionPenalty + confidencePenalty;
}

function pickBestByType(scored, type, pickedIds) {
  return scored.find((entry) => classifyDecisionType(entry.decision) === type && !pickedIds.has(entry.decision.id));
}

function chooseOptions(state) {
  const scored = DECISION_LIBRARY.map((decision) => ({
    decision,
    utility: decisionUtility(decision, state),
  }))
    .sort((a, b) => b.utility - a.utility)
    .filter((entry) => !state.recentDecisionIds.has(entry.decision.id));

  const picks = [];
  const pickedIds = new Set();

  const targetTypes = ["control", "foundation", "growth", "capability"];
  for (const type of targetTypes) {
    const match = pickBestByType(scored, type, pickedIds);
    if (!match) continue;
    picks.push(match.decision);
    pickedIds.add(match.decision.id);
    if (picks.length >= OPTION_COUNT - 1) {
      break;
    }
  }

  for (const entry of scored) {
    if (picks.length >= OPTION_COUNT - 1) {
      break;
    }
    if (pickedIds.has(entry.decision.id)) {
      continue;
    }
    picks.push(entry.decision);
    pickedIds.add(entry.decision.id);
  }

  const riskyAlternatives = scored
    .slice(-8)
    .filter((entry) => entry.decision.effects.modelRisk > 2 || entry.decision.effects.executionConfidence < 0)
    .map((entry) => entry.decision)
    .filter((decision) => !pickedIds.has(decision.id));

  const trapOption = state.rng.pick(
    riskyAlternatives.length > 0
      ? riskyAlternatives
      : scored
          .slice(-5)
          .map((x) => x.decision)
          .filter((decision) => !pickedIds.has(decision.id))
  );
  if (trapOption && !pickedIds.has(trapOption.id)) {
    picks.push(trapOption);
  }

  return picks.slice(0, OPTION_COUNT);
}

function applyQuarterDrift(state) {
  const volatility = scenarioVolatilityMultiplier(state);
  const drift = {
    revenueGrowth: state.rng.range(-0.7, 0.9) * volatility,
    operatingMargin: state.rng.range(-0.35, 0.5) * volatility,
    aiAdoption: state.rng.range(0.1, 1.1),
    modelRisk: state.rng.range(-0.8, 1.8) * volatility,
    workforceReadiness: state.rng.range(-0.3, 0.8) * volatility,
    customerTrust: state.rng.range(-1.0, 1.1) * volatility,
    cashFlow: state.rng.range(-1.5, 1.3) * volatility,
    executionConfidence: state.rng.range(-1.1, 1.2) * volatility,
  };

  if (state.turn % 3 === 2) {
    drift.revenueGrowth += state.rng.range(-0.7, 0.5);
    drift.cashFlow += state.rng.range(-1.9, 0.6);
  }

  for (const key of Object.keys(drift)) {
    state.metrics[key] += drift[key];
  }
}

function decisionExecutionMultiplier(state, decision) {
  const profile = state.promptProfile;
  const role = state.role;
  let alignment = 0;
  for (const principle of decision.principles) {
    alignment += (profile[principle] || 1) * (role.priorities[principle] || 1);
  }
  alignment /= Math.max(decision.principles.length, 1);

  let capabilityBoost = 1;
  const hasDataBase = state.capabilities.has("data-foundation-program");
  const hasGovernance = state.capabilities.has("risk-and-model-governance");
  const hasDashboard = state.capabilities.has("board-dashboard-cadence");
  if ((decision.tags.includes("growth") || decision.tags.includes("product")) && hasDataBase && hasGovernance) {
    capabilityBoost += 0.08;
  }
  if (decision.tags.includes("risk") && hasDashboard) {
    capabilityBoost += 0.05;
  }
  if (decision.tags.includes("people") && state.capabilities.has("skill-acceleration")) {
    capabilityBoost += 0.05;
  }

  const confidenceFactor = clamp(state.metrics.executionConfidence / 75, 0.72, 1.25);
  const multiplier = clamp((alignment / 1.05) * capabilityBoost * confidenceFactor, 0.68, 1.42);
  return multiplier;
}

function applyDecision(state, decision, intensity = 1) {
  const multiplier = decisionExecutionMultiplier(state, decision) * intensity;
  for (const [key, value] of Object.entries(decision.effects)) {
    state.metrics[key] += value * multiplier;
  }

  for (const principle of decision.principles) {
    state.principlesCovered.add(principle);
  }
  state.capabilities.add(decision.id);

  if (decision.id === "defer-governance-to-later") {
    state.governanceDebt += 1;
  } else if (decision.principles.includes("governance-control")) {
    state.governanceDebt = Math.max(0, state.governanceDebt - 1);
  }

  return { multiplier };
}

function applyPackageSynergy(state, decisions) {
  const types = decisions.map((decision) => classifyDecisionType(decision));
  const includesControl = types.includes("control");
  const includesGrowth = types.includes("growth");
  const includesFoundation = types.includes("foundation");
  const includesCapability = types.includes("capability");

  const notes = [];
  if (decisions.length > 1) {
    state.metrics.executionConfidence -= 1.3;
    state.metrics.cashFlow -= 1.4;
    notes.push("Execution bandwidth reduced by running two major motions in one quarter.");
  }

  if (includesGrowth && includesControl) {
    state.metrics.customerTrust += 1.2;
    state.metrics.executionConfidence += 1.4;
    notes.push("Balanced growth and control package improved board confidence.");
  }

  if (includesFoundation && includesCapability) {
    state.metrics.aiAdoption += 1.3;
    state.metrics.workforceReadiness += 1.7;
    notes.push("Foundation plus capability sequencing accelerated practical adoption.");
  }

  if (includesGrowth && !includesControl && state.metrics.modelRisk > 44) {
    state.metrics.modelRisk += 2.4;
    notes.push("Growth-heavy package without control reinforcement increased model risk pressure.");
  }

  return notes;
}

function maybeIncident(state) {
  const governanceCoverage = Array.from(state.principlesCovered).filter((id) => id === "governance-control" || id === "measurement-cadence")
    .length;
  const modelRiskPressure = Math.max(0, state.metrics.modelRisk - 48) / 100;
  const debtPressure = state.governanceDebt * 0.08;
  const adoptionPressure =
    state.metrics.aiAdoption > 62 && state.metrics.workforceReadiness < 52 ? 0.09 : 0.02;
  const coverageOffset = governanceCoverage >= 2 ? -0.04 : 0.03;
  const priorityDone = (state.scenario.priorityDecisionIds || []).filter((id) =>
    state.capabilities.has(id)
  ).length;
  const priorityOffset = -0.015 * priorityDone;
  const chance = clamp(
    0.03 + modelRiskPressure + debtPressure + adoptionPressure + coverageOffset + priorityOffset,
    0.015,
    0.4
  );

  if (state.rng.unit() >= chance) {
    return null;
  }

  state.incidents += 1;
  state.metrics.modelRisk += 8;
  state.metrics.customerTrust -= 6;
  state.metrics.operatingMargin -= 0.9;
  state.metrics.executionConfidence -= 9;
  state.metrics.cashFlow -= 2.2;

  return {
    title: "AI Control Incident",
    summary:
      "A high-impact AI workflow breached expected control thresholds, triggering remediation costs and board scrutiny.",
  };
}

function maybeApplyScenarioEvent(state) {
  const quarter = state.turn + 1;
  const event = (state.scenario.events || []).find((item) => item.quarter === quarter);
  if (!event) {
    return null;
  }
  if (state.appliedScenarioEventQuarters.has(quarter)) {
    return null;
  }

  state.appliedScenarioEventQuarters.add(quarter);
  for (const [metric, delta] of Object.entries(event.effects || {})) {
    state.metrics[metric] += delta;
  }
  state.scenarioEventHistory.push({
    quarter,
    title: event.title,
    summary: event.summary,
  });
  return event;
}

function interpretMessageAsDecisionIds(message, options) {
  if (!message || !options || options.length === 0) {
    return [];
  }
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const ids = [];
  const optionMatches = normalized.match(/option\s*(\d)/g) || [];
  for (const match of optionMatches) {
    const index = Number(match.replace(/[^0-9]/g, "")) - 1;
    if (options[index]) {
      ids.push(options[index].id);
    }
  }

  for (const option of options) {
    const idCheck = option.id.replaceAll("-", " ");
    const shortName = option.title.toLowerCase();
    if (normalized.includes(idCheck) || normalized.includes(shortName.slice(0, 18))) {
      ids.push(option.id);
    }
  }

  return Array.from(new Set(ids)).slice(0, MAX_DECISIONS_PER_TURN);
}

function buildPackageFromPayload(payload, options) {
  const rawIds = [];
  if (Array.isArray(payload.optionIds)) {
    rawIds.push(...payload.optionIds);
  }
  if (payload.optionId) {
    rawIds.push(payload.optionId);
  }

  const inferred = interpretMessageAsDecisionIds(payload.message, options);
  rawIds.push(...inferred);

  const deduped = Array.from(new Set(rawIds.filter(Boolean)));
  const validOptionIds = new Set(options.map((option) => option.id));
  return deduped.filter((id) => validOptionIds.has(id)).slice(0, MAX_DECISIONS_PER_TURN);
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDelta(metricKey, value) {
  const sign = value >= 0 ? "+" : "";
  if (["revenueGrowth", "operatingMargin"].includes(metricKey)) {
    return `${sign}${value.toFixed(1)}pp`;
  }
  return `${sign}${value.toFixed(1)}`;
}

function deltaMetrics(before, after) {
  const deltas = {};
  for (const key of Object.keys(after)) {
    deltas[key] = Number((after[key] - (before[key] || 0)).toFixed(2));
  }
  return deltas;
}

function topDeltaNarrative(deltas) {
  const impactful = Object.entries(deltas)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatDelta(key, value)}`);
  return impactful.join(" | ");
}

function buildQuarterAgenda(state) {
  const boardQuestions = Array.isArray(state.scenario.boardQuestions) ? state.scenario.boardQuestions : [];
  const scenarioPriorities = state.scenario.priorityDecisionIds || [];
  const outstandingPriorities = scenarioPriorities.filter((id) => !state.capabilities.has(id)).slice(0, 2);
  const nextEvent = (state.scenario.events || []).find((event) => event.quarter === state.turn + 2);

  const agenda = [
    `Primary board ask: ${boardQuestions[state.turn % Math.max(boardQuestions.length, 1)] || "Reinforce measurable business outcomes."}`,
    outstandingPriorities.length
      ? `Unaddressed priority moves: ${outstandingPriorities.join(", ")}.`
      : "Most scenario priority moves covered; focus on execution quality and risk discipline.",
    nextEvent
      ? `Foresight: ${nextEvent.title} expected in next quarter.`
      : "Foresight: no scheduled scenario shock next quarter.",
  ];

  return agenda;
}

function roleSupportScore(role, state, decision) {
  let principleAlignment = 0;
  for (const principle of decision.principles) {
    principleAlignment += role.priorities[principle] || 1;
  }
  principleAlignment /= Math.max(decision.principles.length, 1);

  const effect = decision.effects;
  const growthPressure = state.metrics.revenueGrowth < 5 ? 1.1 : 0.85;
  const riskPressure = state.metrics.modelRisk > 45 ? 1.15 : 0.9;
  const peoplePressure = state.metrics.workforceReadiness < 50 ? 1.1 : 0.88;

  const weightedImpact =
    (effect.revenueGrowth || 0) * 0.35 * growthPressure +
    (effect.operatingMargin || 0) * 0.2 +
    (effect.aiAdoption || 0) * 0.08 +
    (effect.workforceReadiness || 0) * 0.08 * peoplePressure +
    (effect.customerTrust || 0) * 0.12 -
    (effect.modelRisk || 0) * 0.18 * riskPressure +
    (effect.cashFlow || 0) * 0.05 +
    (effect.executionConfidence || 0) * 0.11;

  return principleAlignment * 1.9 + weightedImpact;
}

function buildVoiceReason(decision, stance) {
  const type = classifyDecisionType(decision);
  if (stance === "support") {
    if (type === "control") return "control posture strengthened";
    if (type === "growth") return "clear growth upside with manageable constraints";
    if (type === "foundation") return "improves execution reliability";
    if (type === "capability") return "raises adoption capacity in core workflows";
    return "aligned to board transformation priorities";
  }
  if (stance === "oppose") {
    if (decision.effects.modelRisk > 2) return "risk increase is above comfort threshold";
    if (decision.effects.cashFlow < -4) return "cash and funding burden is high";
    return "timing and sequencing concerns";
  }
  return "supports direction with gating and controls";
}

function buildBoardPulse(state, decision) {
  const voices = BOARD_VOICE_ROLE_IDS.map((roleId) => getRole(roleId)).map((role) => {
    const score = roleSupportScore(role, state, decision);
    let stance = "caution";
    if (score >= 4.8) {
      stance = "support";
    } else if (score <= 2.8) {
      stance = "oppose";
    }
    return {
      roleId: role.id,
      roleName: role.name,
      stance,
      reason: buildVoiceReason(decision, stance),
    };
  });

  const supports = voices.filter((voice) => voice.stance === "support").length;
  const opposes = voices.filter((voice) => voice.stance === "oppose").length;

  const cautionFlags = [];
  if (decision.effects.modelRisk > 2) cautionFlags.push("Model risk uplift");
  if (decision.effects.cashFlow < -4) cautionFlags.push("High cash draw");
  if (decision.effects.workforceReadiness < 0) cautionFlags.push("Workforce resistance");

  return {
    supportShare: Number((supports / voices.length).toFixed(2)),
    supportCount: supports,
    opposeCount: opposes,
    voices,
    cautionFlags,
  };
}

function buildPackageHeadline(decisions) {
  if (!decisions.length) {
    return "No formal motion approved.";
  }
  if (decisions.length === 1) {
    return `Primary motion approved: ${decisions[0].title}.`;
  }
  return `Package approved: ${decisions[0].title} + ${decisions[1].title}.`;
}

function buildNextMeetingBrief(state, decisions, incident, impacts, scenarioEvent, packageNotes, deltas) {
  const score = buildScorecard(state);
  const dims = score.outcomeDimensions;
  const stage = getStageForTurn(state.turn);
  const scenario = state.scenario;
  const headline = decisions.length
    ? `Quarter ${state.turn + 1} (${stage}) closed. ${buildPackageHeadline(decisions)}`
    : `Quarter ${state.turn + 1} board meeting opened (${stage} stage).`;

  const executionLine = decisions.length
    ? `Execution effectiveness: ${impacts
        .map((impact, index) => `${index === 0 ? "Primary" : "Secondary"} ${(impact.multiplier * 100).toFixed(0)}%`)
        .join(", ")}.`
    : "No decision package executed yet.";

  const riskLine = incident
    ? `Incident reported: ${incident.summary}`
    : "No major AI control incidents this quarter.";
  const scenarioLine = `Scenario: ${scenario.name} (${state.sector.name}). Mandate: ${scenario.boardMandate}`;
  const tensionLine = `Board tension: ${scenario.tension}`;
  const scenarioEventLine = scenarioEvent
    ? `External development: ${scenarioEvent.title}. ${scenarioEvent.summary}`
    : "External environment: no major new scenario shock this quarter.";

  const packageNotesLine = packageNotes.length
    ? `Package dynamics: ${packageNotes.join(" ")}`
    : "Package dynamics: portfolio effects remained neutral this quarter.";

  const boardQuestion = state.rng.pick([...BOARD_QUESTIONS, scenarioQuestion(state)]);
  const agenda = buildQuarterAgenda(state)
    .map((item, index) => `${index + 1}. ${item}`)
    .join(" ");

  return [
    headline,
    scenarioLine,
    tensionLine,
    executionLine,
    `Business view: revenue ${formatPercent(state.metrics.revenueGrowth)}, margin ${state.metrics.operatingMargin.toFixed(
      1
    )}%, AI adoption ${state.metrics.aiAdoption.toFixed(1)}%, model risk ${state.metrics.modelRisk.toFixed(1)}.`,
    `Quarter delta: ${topDeltaNarrative(deltas)}.`,
    `Outcome dimensions: value ${dims.businessValue.toFixed(1)}, decision quality ${dims.decisionQuality.toFixed(
      1
    )}, leadership capability ${dims.leadershipCapability.toFixed(1)}, speed ${dims.speedToImpact.toFixed(
      1
    )}, risk control ${dims.riskControl.toFixed(1)}.`,
    scenarioEventLine,
    packageNotesLine,
    riskLine,
    `Outcome score: ${score.overall.toFixed(1)} (${score.rating}).`,
    `Next agenda: ${agenda}`,
    `Board asks: ${boardQuestion}`,
  ].join("\n");
}

export function createSession({
  roleId = "board-chair",
  companyName = "Northstar Holdings",
  sectorId = "financial-services",
  scenarioId,
  seed = Date.now(),
  promptProfile,
} = {}) {
  const rng = createRng(seed);
  const role = getRole(roleId);
  const sector = getSectorById(sectorId);
  const scenario = getScenarioForSector(sector.id, scenarioId);
  const profile = resolvePromptProfile(promptProfile);
  const state = {
    id: generateSessionId(rng),
    companyName,
    createdAt: new Date().toISOString(),
    seed,
    role,
    sector,
    scenario,
    promptProfile: profile,
    metrics: applyScenarioMetricShift(baseMetrics(), scenario),
    turn: 0,
    incidents: 0,
    governanceDebt: 0,
    capabilities: new Set(),
    principlesCovered: new Set(),
    history: [],
    recentDecisionIds: new Set(),
    appliedScenarioEventQuarters: new Set(),
    scenarioEventHistory: [],
    rng,
    options: [],
    lastBoardMessage: "",
    lastTurnSummary: null,
    completed: false,
  };

  state.options = chooseOptions(state);
  state.lastBoardMessage = buildNextMeetingBrief(state, [], null, [], null, [], deltaMetrics(state.metrics, state.metrics));
  state.metrics = clipMetrics(state.metrics);
  return state;
}

function updateRecentDecisions(state, decisionIds) {
  const windowSize = 4;
  const recentFromHistory = state.history
    .slice(-windowSize + 1)
    .flatMap((item) => item.decisionIds)
    .slice(-(windowSize - 1));
  state.recentDecisionIds = new Set([...recentFromHistory, ...decisionIds]);
}

function answerAdHocQuestion(state, message) {
  const m = (message || "").toLowerCase();
  if (m.includes("principle") || m.includes("book")) {
    const outstanding = BOOK_PRINCIPLES.filter((principle) => !state.principlesCovered.has(principle.id))
      .slice(0, 3)
      .map((item) => item.title);
    if (outstanding.length === 0) {
      return "All transformation principles are covered. Keep execution cadence and risk controls stable while scaling value.";
    }
    return `Not yet fully covered: ${outstanding.join(", ")}. Build the next board package to close these gaps.`;
  }

  if (m.includes("oblongix") || m.includes("stage")) {
    return `Current delivery stage is ${getStageForTurn(state.turn)} (${getQuarterLabel(state.turn)}). Next package should reinforce stage progression while preserving risk control and decision quality.`;
  }

  if (m.includes("scenario") || m.includes("sector")) {
    return `Scenario is ${state.scenario.name} in ${state.sector.name}. Mandate: ${state.scenario.boardMandate}`;
  }

  if (m.includes("risk")) {
    return `Current model risk is ${state.metrics.modelRisk.toFixed(
      1
    )}. Keep it below 35 while scaling adoption and safeguarding trust.`;
  }

  if (m.includes("recommend") || m.includes("package")) {
    const options = chooseOptions(state).slice(0, 2);
    if (options.length === 0) {
      return "No package recommendation available. The simulation may already be complete.";
    }
    return `Recommended package: ${options.map((option) => option.title).join(" + ")}.`;
  }

  if (m.includes("metric") || m.includes("score")) {
    const score = buildScorecard(state);
    const d = score.outcomeDimensions;
    return `Current score is ${score.overall.toFixed(1)} (${score.rating}). Dimensions: value ${d.businessValue.toFixed(
      1
    )}, decision quality ${d.decisionQuality.toFixed(1)}, leadership ${d.leadershipCapability.toFixed(
      1
    )}, speed ${d.speedToImpact.toFixed(1)}, risk control ${d.riskControl.toFixed(1)}.`;
  }

  return "Board response: choose a primary motion (and optional secondary motion) from the listed options, then submit the quarter.";
}

export function applyUserTurn(state, { optionId, optionIds, message }) {
  if (state.completed) {
    return {
      acceptedDecision: null,
      acceptedDecisions: [],
      boardMessage: "Simulation already completed. Start a new session to run another transformation cycle.",
      incident: null,
      scenarioEvent: null,
      scorecard: buildScorecard(state),
    };
  }

  const selectedIds = buildPackageFromPayload({ optionId, optionIds, message }, state.options);
  const decisions = selectedIds.map((id) => getDecisionById(id)).filter(Boolean);

  if (decisions.length === 0) {
    const boardMessage = answerAdHocQuestion(state, message);
    return {
      acceptedDecision: null,
      acceptedDecisions: [],
      boardMessage,
      incident: null,
      scenarioEvent: null,
      scorecard: buildScorecard(state),
    };
  }

  const beforeMetrics = { ...state.metrics };
  applyQuarterDrift(state);
  const scenarioEvent = maybeApplyScenarioEvent(state);

  const impacts = [];
  decisions.forEach((decision, index) => {
    const intensity = index === 0 ? 1 : SECONDARY_DECISION_DAMPENING;
    impacts.push(applyDecision(state, decision, intensity));
  });

  const packageNotes = applyPackageSynergy(state, decisions);
  const incident = maybeIncident(state);
  state.metrics = clipMetrics(state.metrics);

  const deltas = deltaMetrics(beforeMetrics, state.metrics);
  const boardPulse = decisions.map((decision) => ({
    decisionId: decision.id,
    decisionTitle: decision.title,
    pulse: buildBoardPulse(state, decision),
  }));

  const historyItem = {
    quarter: state.turn + 1,
    quarterLabel: getQuarterLabel(state.turn),
    decisionIds: decisions.map((decision) => decision.id),
    decisionTitles: decisions.map((decision) => decision.title),
    timestamp: new Date().toISOString(),
    multipliers: impacts.map((impact) => Number(impact.multiplier.toFixed(3))),
    incident: incident ? incident.title : null,
    scenarioEvent: scenarioEvent ? scenarioEvent.title : null,
    packageNotes,
    metricDelta: deltas,
    boardPulse,
    scoreAfter: Number(buildScorecard(state).overall.toFixed(2)),
  };
  state.history.push(historyItem);
  updateRecentDecisions(state, decisions.map((decision) => decision.id));

  state.turn += 1;
  state.completed = state.turn >= MAX_TURNS;
  if (!state.completed) {
    state.options = chooseOptions(state);
  } else {
    state.options = [];
  }

  const boardMessage = state.completed
    ? `Simulation complete after ${MAX_TURNS} board meetings. Final score: ${buildScorecard(state).overall.toFixed(
        1
      )}. Review your package sequence for replication.`
    : buildNextMeetingBrief(state, decisions, incident, impacts, scenarioEvent, packageNotes, deltas);

  state.lastBoardMessage = boardMessage;
  state.lastTurnSummary = {
    ...historyItem,
    stageAfter: getStageForTurn(state.turn),
    scorecard: buildScorecard(state),
  };

  return {
    acceptedDecision: decisions[0] || null,
    acceptedDecisions: decisions,
    boardMessage,
    incident,
    scenarioEvent,
    packageNotes,
    metricDelta: deltas,
    scorecard: buildScorecard(state),
  };
}

function buildTradeoffSummary(option) {
  const gains = [];
  const costs = [];
  if ((option.effects.revenueGrowth || 0) > 0.9) gains.push("growth");
  if ((option.effects.aiAdoption || 0) > 4) gains.push("adoption");
  if ((option.effects.modelRisk || 0) < -2) gains.push("risk control");
  if ((option.effects.workforceReadiness || 0) > 3) gains.push("readiness");

  if ((option.effects.cashFlow || 0) < -3.5) costs.push("cash draw");
  if ((option.effects.modelRisk || 0) > 2) costs.push("risk pressure");
  if ((option.effects.executionConfidence || 0) < -1) costs.push("execution strain");

  const gainText = gains.length ? gains.join(", ") : "limited near-term upside";
  const costText = costs.length ? costs.join(", ") : "low downside";
  return `Upside: ${gainText}. Tradeoff: ${costText}.`;
}

function describeOption(option, index, scenario, state) {
  const recommendedIds = scenario?.priorityDecisionIds || [];
  return {
    id: option.id,
    index: index + 1,
    title: option.title,
    description: option.description,
    principles: option.principles,
    recommended: recommendedIds.includes(option.id),
    optionType: classifyDecisionType(option),
    riskProfile: decisionRiskProfile(option),
    tradeoff: buildTradeoffSummary(option),
    boardPulse: buildBoardPulse(state, option),
  };
}

export function buildClientState(state) {
  return {
    sessionId: state.id,
    companyName: state.companyName,
    role: state.role,
    sector: state.sector,
    scenario: {
      id: state.scenario.id,
      name: state.scenario.name,
      boardMandate: state.scenario.boardMandate,
      tension: state.scenario.tension,
      chapterAnchors: state.scenario.chapterAnchors,
      events: (state.scenario.events || []).map((event) => ({
        quarter: event.quarter,
        title: event.title,
        summary: event.summary,
      })),
    },
    meeting: {
      currentQuarter: state.turn + 1,
      currentQuarterLabel: getQuarterLabel(state.turn),
      stage: getStageForTurn(state.turn),
      agenda: buildQuarterAgenda(state),
      maxDecisionsPerQuarter: MAX_DECISIONS_PER_TURN,
    },
    turn: state.turn,
    maxTurns: MAX_TURNS,
    completed: state.completed,
    progressPct: Number(((state.turn / MAX_TURNS) * 100).toFixed(1)),
    metrics: { ...state.metrics },
    scorecard: buildScorecard(state),
    stage: getStageForTurn(state.turn),
    principlesCovered: Array.from(state.principlesCovered),
    scenarioEventHistory: state.scenarioEventHistory.slice(-5),
    history: state.history.slice(-8),
    lastTurn: state.lastTurnSummary,
    lastBoardMessage: state.lastBoardMessage,
    options: state.options.map((option, index) => describeOption(option, index, state.scenario, state)),
  };
}
