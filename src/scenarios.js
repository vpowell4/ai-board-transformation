import { clamp } from "./random.js";

export const SECTORS = [
  {
    id: "financial-services",
    name: "Financial Services",
    summary:
      "Regulated environment with high conduct, fraud, and model risk sensitivity.",
  },
  {
    id: "private-equity",
    name: "Private Equity",
    summary:
      "Portfolio-level value creation pressure with compressed hold periods and exit scrutiny.",
  },
  {
    id: "public-sector",
    name: "Public Sector",
    summary:
      "Service delivery, trust, and accountability under public and regulatory oversight.",
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    summary:
      "Margin and resilience pressures across supply chain, planning, and plant operations.",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    summary:
      "Clinical/operational risk, compliance burden, and patient experience constraints.",
  },
  {
    id: "energy",
    name: "Energy",
    summary:
      "Asset-intensive operations balancing resilience, safety, and transition economics.",
  },
];

export const SCENARIOS = [
  {
    id: "bank-risk-and-growth-rebalance",
    sectorId: "financial-services",
    name: "Retail Bank Risk and Growth Rebalance",
    boardMandate:
      "Increase SME lending growth while reducing model risk and conduct incidents in credit decisioning.",
    tension:
      "Growth targets are rising while regulators question explainability and fairness of underwriting models.",
    chapterAnchors: [
      "Declare AI as business redesign tied to P&L and risk.",
      "Redesign decisions and preserve human override.",
      "Govern AI like material enterprise risk.",
    ],
    priorityDecisionIds: [
      "risk-and-model-governance",
      "responsible-ai-charter",
      "regulatory-prep-sprint",
      "board-dashboard-cadence",
      "workflow-redesign",
    ],
    boardQuestions: [
      "What fair lending control evidence can management show this quarter?",
      "Where is human override explicit in high-impact credit decisions?",
      "What remediation plan exists for regulator findings within one board cycle?",
    ],
    initialMetricShift: {
      revenueGrowth: -0.6,
      operatingMargin: 0.2,
      aiAdoption: 4,
      modelRisk: 8,
      workforceReadiness: -2,
      customerTrust: -5,
      cashFlow: 1,
      executionConfidence: -2,
    },
    preferredTags: {
      risk: 1.4,
      governance: 1.3,
      legal: 1.2,
      product: 1.1,
      customer: 1.1,
      data: 1.15,
    },
    discouragedDecisionIds: ["defer-governance-to-later", "cost-cut-through-automation"],
    events: [
      {
        quarter: 2,
        title: "Regulatory Thematic Review",
        summary:
          "Supervisor requests evidence of model governance and bias controls across lending workflows.",
        effects: { modelRisk: 4.5, customerTrust: -2, executionConfidence: -2.4 },
      },
      {
        quarter: 5,
        title: "Credit Default Spike",
        summary:
          "Default rates increase in one segment, raising board scrutiny on underwriting quality.",
        effects: { revenueGrowth: -0.8, modelRisk: 3.5, operatingMargin: -0.4 },
      },
      {
        quarter: 8,
        title: "Consumer Press Coverage",
        summary:
          "Media reports challenge customer fairness in lending outcomes, stressing trust and response speed.",
        effects: { customerTrust: -4, modelRisk: 2, executionConfidence: -2 },
      },
    ],
  },
  {
    id: "pe-portfolio-value-creation",
    sectorId: "private-equity",
    name: "PE Portfolio Value Creation Sprint",
    boardMandate:
      "Deliver measurable EBITDA improvement across a portfolio company within 12 months ahead of exit.",
    tension:
      "The investment committee expects hard value realization while technology debt slows deployment.",
    chapterAnchors: [
      "Embed AI into core workflows or stop funding it.",
      "Fix operating foundations while delivering quick wins.",
      "Measure outcomes and quarterly value realization.",
    ],
    priorityDecisionIds: [
      "ai-value-pool-map",
      "workflow-redesign",
      "data-foundation-program",
      "board-dashboard-cadence",
      "vendor-consolidation",
    ],
    boardQuestions: [
      "Which workflow now has auditable EBITDA impact and named owner?",
      "Which pilots are being defunded for not crossing production gates?",
      "How credible is this value story under buyer diligence conditions?",
    ],
    initialMetricShift: {
      revenueGrowth: 0.3,
      operatingMargin: -1.2,
      aiAdoption: 2,
      modelRisk: 3,
      workforceReadiness: -5,
      customerTrust: -1,
      cashFlow: -8,
      executionConfidence: -4,
    },
    preferredTags: {
      finance: 1.3,
      operations: 1.2,
      portfolio: 1.3,
      cost: 1.2,
      "m&a": 1.15,
      data: 1.1,
    },
    discouragedDecisionIds: ["defer-governance-to-later"],
    events: [
      {
        quarter: 3,
        title: "Investment Committee Gate",
        summary:
          "Sponsors demand proof of value attribution by workflow before releasing additional funding.",
        effects: { executionConfidence: -2.5, cashFlow: -2.8, revenueGrowth: -0.5 },
      },
      {
        quarter: 6,
        title: "Vendor Renewal Shock",
        summary:
          "Core AI vendor increases contract terms, forcing rapid portfolio standardization decisions.",
        effects: { cashFlow: -3.5, operatingMargin: -0.6, modelRisk: 1.2 },
      },
      {
        quarter: 9,
        title: "Exit Diligence Dry Run",
        summary:
          "Buyer advisers request evidence of controlled, transferable AI operating capability.",
        effects: { modelRisk: 2, executionConfidence: -2 },
      },
    ],
  },
  {
    id: "public-sector-service-recovery",
    sectorId: "public-sector",
    name: "Public Service Recovery and Trust",
    boardMandate:
      "Reduce citizen backlog and improve case handling speed while maintaining accountability and transparency.",
    tension:
      "Service demand has surged and political stakeholders challenge fairness and explainability of automation.",
    chapterAnchors: [
      "AI is leadership accountability, not delegated technology activity.",
      "Redesign decision architecture for high-impact public decisions.",
      "Maintain human agency and intervention capability.",
    ],
    priorityDecisionIds: [
      "risk-and-model-governance",
      "scenario-war-gaming",
      "skill-acceleration",
      "workflow-redesign",
      "board-dashboard-cadence",
    ],
    boardQuestions: [
      "Can citizens and auditors trace decisions end-to-end?",
      "Where do case workers retain authority to override automation?",
      "What service metric proves outcomes improved without fairness loss?",
    ],
    initialMetricShift: {
      revenueGrowth: -0.9,
      operatingMargin: -0.4,
      aiAdoption: 3,
      modelRisk: 6,
      workforceReadiness: -3,
      customerTrust: -8,
      cashFlow: -4,
      executionConfidence: -3.5,
    },
    preferredTags: {
      governance: 1.3,
      board: 1.2,
      ethics: 1.25,
      people: 1.15,
      service: 1.2,
      compliance: 1.2,
    },
    discouragedDecisionIds: [
      "defer-governance-to-later",
      "cost-cut-through-automation",
      "customer-facing-ai",
    ],
    events: [
      {
        quarter: 2,
        title: "Parliamentary Query",
        summary:
          "Oversight committee requests explainability and intervention evidence for case triage decisions.",
        effects: { customerTrust: -2.8, executionConfidence: -2, modelRisk: 2.2 },
      },
      {
        quarter: 5,
        title: "Case Backlog Surge",
        summary:
          "Unexpected demand spike strains teams and reveals workflow bottlenecks in assisted decisioning.",
        effects: { operatingMargin: -0.6, workforceReadiness: -2.4, revenueGrowth: -0.5 },
      },
      {
        quarter: 8,
        title: "Audit Finding",
        summary:
          "Internal audit identifies weak logging controls in one automated path.",
        effects: { modelRisk: 3.6, customerTrust: -2.1, cashFlow: -1.2 },
      },
    ],
  },
  {
    id: "manufacturing-network-resilience",
    sectorId: "manufacturing",
    name: "Manufacturing Network Resilience",
    boardMandate:
      "Improve forecast accuracy and plant throughput while reducing supply chain volatility.",
    tension:
      "Operational leaders want speed, but data quality and process fragmentation create hidden failure risk.",
    chapterAnchors: [
      "Fix data and operating foundations you have been avoiding.",
      "Embed AI into core workflows for measurable cycle-time reduction.",
      "Measure learning velocity and execution quality.",
    ],
    priorityDecisionIds: [
      "data-foundation-program",
      "legacy-modernization",
      "workflow-redesign",
      "skill-acceleration",
      "board-dashboard-cadence",
    ],
    boardQuestions: [
      "Which plant workflow has moved from pilot to controlled production?",
      "How are upstream forecast gains protected from downstream bottlenecks?",
      "Where is data ownership still blocking operational scale?",
    ],
    initialMetricShift: {
      revenueGrowth: -0.3,
      operatingMargin: -1,
      aiAdoption: 5,
      modelRisk: 2,
      workforceReadiness: -4,
      customerTrust: -2,
      cashFlow: -3,
      executionConfidence: -3,
    },
    preferredTags: {
      operations: 1.35,
      platform: 1.2,
      data: 1.25,
      people: 1.1,
      strategy: 1.1,
    },
    discouragedDecisionIds: ["defer-governance-to-later"],
    events: [
      {
        quarter: 3,
        title: "Supplier Disruption",
        summary:
          "A key supplier outage breaks demand planning assumptions and pressures AI forecasting models.",
        effects: { revenueGrowth: -0.7, operatingMargin: -0.6, modelRisk: 2.6 },
      },
      {
        quarter: 6,
        title: "Plant Quality Escalation",
        summary:
          "Defect rates rise after a process change, exposing weak human-in-the-loop controls.",
        effects: { customerTrust: -2.5, modelRisk: 2.2, executionConfidence: -2.2 },
      },
      {
        quarter: 9,
        title: "Working Capital Constraint",
        summary:
          "Inventory imbalance forces near-term cash controls and portfolio reprioritization.",
        effects: { cashFlow: -3.8, operatingMargin: -0.5, revenueGrowth: -0.4 },
      },
    ],
  },
  {
    id: "healthcare-clinical-ops-safety",
    sectorId: "healthcare",
    name: "Healthcare Clinical Ops and Safety",
    boardMandate:
      "Improve patient flow and coding accuracy while maintaining strict safety and compliance standards.",
    tension:
      "Leaders need efficiency gains but cannot tolerate opaque decisions in high-stakes pathways.",
    chapterAnchors: [
      "Redesign decision rights for critical workflows.",
      "Govern AI as enterprise risk with intervention mechanisms.",
      "Preserve human agency in high-impact decisions.",
    ],
    priorityDecisionIds: [
      "risk-and-model-governance",
      "responsible-ai-charter",
      "workflow-redesign",
      "skill-acceleration",
      "regulatory-prep-sprint",
    ],
    boardQuestions: [
      "What clinical pathway still lacks explicit override safeguards?",
      "How fast can an unsafe model be suspended in production?",
      "Which patient-flow workflow has shown measurable quality gains?",
    ],
    initialMetricShift: {
      revenueGrowth: 0.1,
      operatingMargin: -0.7,
      aiAdoption: 4,
      modelRisk: 7,
      workforceReadiness: -3,
      customerTrust: -4,
      cashFlow: -2,
      executionConfidence: -2,
    },
    preferredTags: {
      risk: 1.35,
      compliance: 1.25,
      people: 1.2,
      governance: 1.25,
      operations: 1.1,
      ethics: 1.3,
    },
    discouragedDecisionIds: ["defer-governance-to-later", "cost-cut-through-automation"],
    events: [
      {
        quarter: 2,
        title: "Clinical Safety Alert",
        summary:
          "A near-miss in triage prioritization triggers mandatory review of override protocols.",
        effects: { modelRisk: 3.8, customerTrust: -2.7, executionConfidence: -2.4 },
      },
      {
        quarter: 5,
        title: "Payer Audit Wave",
        summary:
          "External audit demands stronger traceability and accuracy evidence for coding support models.",
        effects: { modelRisk: 2.6, cashFlow: -1.8, operatingMargin: -0.4 },
      },
      {
        quarter: 8,
        title: "Staff Attrition Spike",
        summary:
          "Critical workforce attrition slows workflow redesign and supervision quality.",
        effects: { workforceReadiness: -3.5, aiAdoption: -1.2, executionConfidence: -2.1 },
      },
    ],
  },
  {
    id: "energy-grid-optimization-and-compliance",
    sectorId: "energy",
    name: "Energy Grid Optimization and Compliance",
    boardMandate:
      "Increase asset utilization and demand balancing while preserving safety and regulatory compliance.",
    tension:
      "Operational complexity is rising as market volatility stresses decision speed and governance controls.",
    chapterAnchors: [
      "Fix operating foundations and data control.",
      "Treat governance and failure readiness as strategic capability.",
      "Measure business impact and operational learning velocity.",
    ],
    priorityDecisionIds: [
      "data-foundation-program",
      "risk-and-model-governance",
      "scenario-war-gaming",
      "legacy-modernization",
      "board-dashboard-cadence",
    ],
    boardQuestions: [
      "Which safety-critical decisions require mandatory human hold points?",
      "How resilient is the model operating layer under demand volatility?",
      "Where are risk and value metrics jointly reviewed at board cadence?",
    ],
    initialMetricShift: {
      revenueGrowth: -0.2,
      operatingMargin: -0.8,
      aiAdoption: 5,
      modelRisk: 4,
      workforceReadiness: -2,
      customerTrust: -2,
      cashFlow: -2.5,
      executionConfidence: -2.5,
    },
    preferredTags: {
      platform: 1.2,
      governance: 1.2,
      risk: 1.25,
      operations: 1.25,
      ecosystem: 1.1,
    },
    discouragedDecisionIds: ["defer-governance-to-later"],
    events: [
      {
        quarter: 3,
        title: "Demand Volatility Shock",
        summary:
          "Unexpected consumption patterns reduce forecast reliability and increase dispatch pressure.",
        effects: { revenueGrowth: -0.5, modelRisk: 2.2, executionConfidence: -2 },
      },
      {
        quarter: 6,
        title: "Safety Incident Investigation",
        summary:
          "Regulator opens investigation into one operational optimization workflow.",
        effects: { customerTrust: -2.4, modelRisk: 3.2, operatingMargin: -0.5 },
      },
      {
        quarter: 9,
        title: "Trading Margin Compression",
        summary:
          "Market pricing shifts compress margins and force portfolio reprioritization.",
        effects: { operatingMargin: -0.7, cashFlow: -2.6, revenueGrowth: -0.4 },
      },
    ],
  },
];

const SCENARIO_INDEX = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));
const SECTOR_INDEX = new Map(SECTORS.map((sector) => [sector.id, sector]));

export function getSectorById(sectorId) {
  return SECTOR_INDEX.get(sectorId) || SECTORS[0];
}

export function getScenarioById(scenarioId) {
  if (scenarioId && SCENARIO_INDEX.has(scenarioId)) {
    return SCENARIO_INDEX.get(scenarioId);
  }
  return SCENARIOS[0];
}

export function getScenarioForSector(sectorId, scenarioId) {
  const sector = getSectorById(sectorId);
  const requested = getScenarioById(scenarioId);
  if (requested && requested.sectorId === sector.id) {
    return requested;
  }
  const firstSectorScenario = SCENARIOS.find((scenario) => scenario.sectorId === sector.id);
  return firstSectorScenario || SCENARIOS[0];
}

export function applyScenarioMetricShift(baseMetrics, scenario) {
  const shifted = { ...baseMetrics };
  const shift = scenario?.initialMetricShift || {};
  for (const [key, value] of Object.entries(shift)) {
    shifted[key] = clamp((shifted[key] || 0) + value, -1000, 1000);
  }
  return shifted;
}
