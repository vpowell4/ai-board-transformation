import { DECISION_LIBRARY, getDecisionById } from "./decisions.js";
import { getRole } from "./roles.js";
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
const OPTION_COUNT = 4;

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

  const repetitionPenalty = state.history.some((item) => item.decisionId === decision.id) ? -3.4 : 0;
  const confidencePenalty = decision.effects.executionConfidence < 0 ? -1.2 : 0;
  return principleScore + tagScore + repetitionPenalty + confidencePenalty;
}

function chooseOptions(state) {
  const scored = DECISION_LIBRARY.map((decision) => ({
    decision,
    utility: decisionUtility(decision, state),
  }))
    .sort((a, b) => b.utility - a.utility)
    .filter((entry) => !state.recentDecisionIds.has(entry.decision.id));

  const top = scored.slice(0, OPTION_COUNT - 1).map((entry) => entry.decision);
  const needsRiskControl = state.metrics.modelRisk > 52 || state.governanceDebt > 0;
  if (needsRiskControl) {
    const governanceChoice = scored.find(
      (entry) =>
        entry.decision.principles.includes("governance-control") &&
        !top.some((choice) => choice.id === entry.decision.id)
    );
    if (governanceChoice) {
      top.push(governanceChoice.decision);
    }
  }

  const riskyAlternatives = scored
    .slice(-6)
    .filter((entry) => entry.decision.effects.modelRisk > 2 || entry.decision.effects.executionConfidence < 0)
    .map((entry) => entry.decision);

  const trapOption = state.rng.pick(riskyAlternatives.length > 0 ? riskyAlternatives : scored.slice(-4).map((x) => x.decision));
  if (trapOption && !top.find((choice) => choice.id === trapOption.id)) {
    top.push(trapOption);
  }

  return top.slice(0, OPTION_COUNT);
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

function applyDecision(state, decision) {
  const multiplier = decisionExecutionMultiplier(state, decision);
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

function interpretMessageAsDecisionId(message, options) {
  if (!message || !options || options.length === 0) {
    return null;
  }
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const optionIndexMatch = normalized.match(/option\s*(\d)/);
  if (optionIndexMatch) {
    const index = Number(optionIndexMatch[1]) - 1;
    if (options[index]) {
      return options[index].id;
    }
  }

  for (const option of options) {
    const idCheck = option.id.replaceAll("-", " ");
    const shortName = option.title.toLowerCase();
    if (normalized.includes(idCheck) || normalized.includes(shortName.slice(0, 18))) {
      return option.id;
    }
  }

  return null;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function buildNextMeetingBrief(state, decision, incident, multiplier, scenarioEvent) {
  const score = buildScorecard(state);
  const dims = score.outcomeDimensions;
  const stage = getStageForTurn(state.turn);
  const scenario = state.scenario;
  const headline = decision
    ? `Quarter ${state.turn + 1} (${stage}) review: ${decision.title} executed at ${(multiplier * 100).toFixed(
        0
      )}% effectiveness.`
    : `Quarter ${state.turn + 1} board meeting opened (${stage} stage).`;
  const riskLine = incident
    ? `Incident reported: ${incident.summary}`
    : "No major AI control incidents this quarter.";
  const scenarioLine = `Scenario: ${scenario.name} (${state.sector.name}). Mandate: ${scenario.boardMandate}`;
  const tensionLine = `Board tension: ${scenario.tension}`;
  const scenarioEventLine = scenarioEvent
    ? `External development: ${scenarioEvent.title}. ${scenarioEvent.summary}`
    : "External environment: no major new scenario shock this quarter.";

  const boardQuestion = state.rng.pick([...BOARD_QUESTIONS, scenarioQuestion(state)]);
  return [
    headline,
    scenarioLine,
    tensionLine,
    `Business view: revenue ${formatPercent(state.metrics.revenueGrowth)}, margin ${state.metrics.operatingMargin.toFixed(
      1
    )}%, AI adoption ${state.metrics.aiAdoption.toFixed(1)}%, model risk ${state.metrics.modelRisk.toFixed(1)}.`,
    `Outcome dimensions: value ${dims.businessValue.toFixed(1)}, decision quality ${dims.decisionQuality.toFixed(
      1
    )}, leadership capability ${dims.leadershipCapability.toFixed(1)}, speed ${dims.speedToImpact.toFixed(
      1
    )}, risk control ${dims.riskControl.toFixed(1)}.`,
    scenarioEventLine,
    riskLine,
    `Outcome score: ${score.overall.toFixed(1)} (${score.rating}).`,
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
    completed: false,
  };

  state.options = chooseOptions(state);
  state.lastBoardMessage = buildNextMeetingBrief(state, null, null, 1, null);
  state.metrics = clipMetrics(state.metrics);
  return state;
}

function updateRecentDecisions(state, decisionId) {
  const windowSize = 3;
  const last = state.history.slice(-windowSize + 1).map((item) => item.decisionId);
  state.recentDecisionIds = new Set([...last, decisionId]);
}

function answerAdHocQuestion(state, message) {
  const m = (message || "").toLowerCase();
  if (m.includes("principle") || m.includes("book")) {
    const outstanding = BOOK_PRINCIPLES.filter((principle) => !state.principlesCovered.has(principle.id))
      .slice(0, 3)
      .map((item) => item.title);
    if (outstanding.length === 0) {
      return "You have covered all transformation principles. Focus now on preserving execution cadence and risk controls.";
    }
    return `Not yet fully covered: ${outstanding.join(", ")}. Prioritize options that close these gaps.`;
  }

  if (m.includes("oblongix") || m.includes("stage")) {
    return `Current delivery stage is ${getStageForTurn(state.turn)}. Next decisions should reinforce stage progression while preserving risk control and decision quality.`;
  }

  if (m.includes("scenario") || m.includes("sector")) {
    return `Scenario is ${state.scenario.name} in ${state.sector.name}. Mandate: ${state.scenario.boardMandate}`;
  }

  if (m.includes("risk")) {
    return `Current model risk is ${state.metrics.modelRisk.toFixed(
      1
    )}. Lower this below 35 while scaling adoption to avoid control incidents.`;
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
  return "Board response: choose one of the listed options or provide a clear action decision so we can progress the quarter.";
}

export function applyUserTurn(state, { optionId, message }) {
  if (state.completed) {
    return {
      acceptedDecision: null,
      boardMessage: "Simulation already completed. Start a new session to run another transformation cycle.",
      incident: null,
      scenarioEvent: null,
      scorecard: buildScorecard(state),
    };
  }

  const inferredId = optionId || interpretMessageAsDecisionId(message, state.options);
  const decision = inferredId ? getDecisionById(inferredId) : null;

  if (!decision) {
    const boardMessage = answerAdHocQuestion(state, message);
    return {
      acceptedDecision: null,
      boardMessage,
      incident: null,
      scenarioEvent: null,
      scorecard: buildScorecard(state),
    };
  }

  applyQuarterDrift(state);
  const scenarioEvent = maybeApplyScenarioEvent(state);
  const impact = applyDecision(state, decision);
  const incident = maybeIncident(state);
  state.metrics = clipMetrics(state.metrics);

  const historyItem = {
    quarter: state.turn + 1,
    decisionId: decision.id,
    decisionTitle: decision.title,
    timestamp: new Date().toISOString(),
    multiplier: impact.multiplier,
    incident: incident ? incident.title : null,
    scenarioEvent: scenarioEvent ? scenarioEvent.title : null,
    scoreAfter: buildScorecard(state).overall,
  };
  state.history.push(historyItem);
  updateRecentDecisions(state, decision.id);

  state.turn += 1;
  state.completed = state.turn >= MAX_TURNS;
  if (!state.completed) {
    state.options = chooseOptions(state);
  } else {
    state.options = [];
  }

  const boardMessage = state.completed
    ? `Simulation complete after ${MAX_TURNS} board meetings.\nFinal score: ${buildScorecard(state).overall.toFixed(
        1
      )}. Review decision history for replication.`
    : buildNextMeetingBrief(state, decision, incident, impact.multiplier, scenarioEvent);
  state.lastBoardMessage = boardMessage;

  return {
    acceptedDecision: decision,
    boardMessage,
    incident,
    scenarioEvent,
    scorecard: buildScorecard(state),
  };
}

function describeOption(option, index, scenario) {
  const recommendedIds = scenario?.priorityDecisionIds || [];
  return {
    id: option.id,
    index: index + 1,
    title: option.title,
    description: option.description,
    principles: option.principles,
    recommended: recommendedIds.includes(option.id),
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
    },
    turn: state.turn,
    maxTurns: MAX_TURNS,
    completed: state.completed,
    metrics: { ...state.metrics },
    scorecard: buildScorecard(state),
    stage: getStageForTurn(state.turn),
    principlesCovered: Array.from(state.principlesCovered),
    scenarioEventHistory: state.scenarioEventHistory.slice(-5),
    history: state.history.slice(-6),
    lastBoardMessage: state.lastBoardMessage,
    options: state.options.map((option, index) => describeOption(option, index, state.scenario)),
  };
}
