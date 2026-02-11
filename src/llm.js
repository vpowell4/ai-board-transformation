import { OBLONGIX_FRAMEWORK_STAGES, principlesAsPromptText } from "./books.js";

function env(name, fallback = "") {
  const value = process.env[name];
  return value === undefined ? fallback : value;
}

function llmEnabled() {
  const key = env("OPENAI_API_KEY");
  const mode = env("USE_REAL_LLM", "false").toLowerCase();
  return Boolean(key) && (mode === "true" || mode === "1");
}

function buildSystemPrompt() {
  return [
    "You are a board simulation facilitator for AI transformation.",
    "Respond with precise board-level language grounded in the listed principles and transformation stages.",
    "Keep response <= 190 words.",
    "Write as a realistic board update with concrete trade-offs and accountability.",
    "Always include these titled sections exactly:",
    "1) Board View",
    "2) Value and Execution",
    "3) Risk and Control",
    "4) Board Question",
    "Treat AI as business redesign, not a technology side project.",
    "If scenario pressure is growth or EBITDA-heavy, call out pilot-to-production discipline and data-foundation sequencing explicitly.",
    "",
    `Delivery stages: ${OBLONGIX_FRAMEWORK_STAGES.join(" -> ")}`,
    "",
    "Principles:",
    principlesAsPromptText(),
  ].join("\n");
}

function parseTextFromResponse(json) {
  if (json && typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }
  if (Array.isArray(json?.output)) {
    for (const item of json.output) {
      if (!Array.isArray(item?.content)) {
        continue;
      }
      for (const content of item.content) {
        const text = content?.text?.trim?.();
        if (text) {
          return text;
        }
      }
    }
  }
  return null;
}

export async function maybeRewriteBoardMessage({ state, boardMessage, userMessage, decision }) {
  if (!llmEnabled()) {
    return boardMessage;
  }

  const model = env("LLM_MODEL", "gpt-4.1-mini");
  const baseUrl = env("OPENAI_BASE_URL", "https://api.openai.com/v1");
  const apiKey = env("OPENAI_API_KEY");
  const roleName = state.role.name;
  const decisionTitle = decision?.title || "No decision selected";

  const input = [
    `Company: ${state.companyName || "Unknown company"}`,
    `Role selected: ${roleName}`,
    `Sector: ${state.sector?.name || "Unknown"}`,
    `Scenario: ${state.scenario?.name || "General"}`,
    `Scenario mandate: ${state.scenario?.boardMandate || "n/a"}`,
    `Scenario tension: ${state.scenario?.tension || "n/a"}`,
    `Primary book anchor: ${(state.scenario?.chapterAnchors || [])[0] || "n/a"}`,
    `Recent scenario events: ${JSON.stringify(state.scenarioEventHistory || [])}`,
    `Current stage: ${state.stage || "Align"}`,
    `Quarter: ${state.turn}/${state.maxTurns || 10}`,
    `User message: ${userMessage || "(none)"}`,
    `Decision: ${decisionTitle}`,
    `Current board summary:\n${boardMessage}`,
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        instructions: buildSystemPrompt(),
        temperature: 0.35,
      }),
    });
    if (!response.ok) {
      return boardMessage;
    }
    const json = await response.json();
    return parseTextFromResponse(json) || boardMessage;
  } catch {
    return boardMessage;
  }
}
