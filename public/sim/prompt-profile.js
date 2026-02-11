export const DEFAULT_PROMPT_PROFILE = {
  "value-pools": 1.1,
  "governance-control": 1.15,
  "data-platform": 1.05,
  "portfolio-discipline": 1.1,
  "people-change": 1.0,
  "human-agency": 1.1,
  "measurement-cadence": 1.15,
};

const KEYS = Object.keys(DEFAULT_PROMPT_PROFILE);

export function resolvePromptProfile(profile) {
  const output = { ...DEFAULT_PROMPT_PROFILE };
  if (!profile || typeof profile !== "object") {
    return output;
  }
  for (const key of KEYS) {
    const value = Number(profile[key]);
    if (Number.isFinite(value)) {
      output[key] = Math.min(1.5, Math.max(0.6, value));
    }
  }
  return output;
}

