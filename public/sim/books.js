export const BOOK_SOURCES = [
  {
    title: "The CEO's AI Transformation Framework and Implementation",
    path: "C:/Users/vince/OneDrive/Documents/The_CEOs_AI_Transformation_Framework_And_Implementation_UPDATED_WORD_FINAL.docx",
  },
  {
    title: "The CEO's Guide to AI Transformation",
    path: "C:/Users/vince/OneDrive/Documents/The_CEOs_Guide_to_AI_Transformation_V0.1.docx",
  },
  {
    title: "Oblongix AI Transformation Advisory (Website)",
    path: "https://www.oblongix.com",
  },
];

export const BOOK_PRINCIPLES = [
  {
    id: "value-pools",
    title: "AI Is Business Redesign",
    guidance:
      "Treat AI as a CEO-owned enterprise redesign tied to P&L value, risk, and accountable ownership.",
  },
  {
    id: "human-agency",
    title: "Redesign Decision Rights",
    guidance:
      "Define where AI advises, where it decides, and where humans retain override and accountability.",
  },
  {
    id: "people-change",
    title: "Embed AI in Core Workflows",
    guidance:
      "Fund AI only when it is embedded into live revenue or cost workflows with named process ownership.",
  },
  {
    id: "data-platform",
    title: "Fix Data and Operating Foundations",
    guidance:
      "Treat data ownership, platform reliability, and operating model speed as hard constraints to scale.",
  },
  {
    id: "governance-control",
    title: "Govern AI as Material Enterprise Risk",
    guidance:
      "Set board oversight, risk controls, incident escalation, and regulatory readiness as standing capability.",
  },
  {
    id: "measurement-cadence",
    title: "Measure Outcomes, Not Activity",
    guidance:
      "Track value, decision quality, speed, learning velocity, and risk controls rather than pilot counts.",
  },
  {
    id: "portfolio-discipline",
    title: "Scale Through Stage-Gated Execution",
    guidance:
      "Push from pilot to production using gated milestones, retire weak use cases, and reinvest in winners.",
  },
];

export const OBLONGIX_FRAMEWORK_STAGES = [
  "Align",
  "Diagnose",
  "Design",
  "Build",
  "Embed",
  "Govern and Operate",
];

export const OBLONGIX_OUTCOME_DIMENSIONS = [
  "Business Value",
  "Decision Quality",
  "Leadership Capability",
  "Speed to Impact",
  "Risk Control",
];

export function principlesAsPromptText() {
  return BOOK_PRINCIPLES.map((principle, index) => {
    const number = index + 1;
    return `${number}. ${principle.title}: ${principle.guidance}`;
  }).join("\n");
}
