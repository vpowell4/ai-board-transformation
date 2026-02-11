import test from "node:test";
import assert from "node:assert/strict";
import { createSession, applyUserTurn, buildClientState } from "../src/engine.js";
import { SIM_PERSONAS, chooseOptionForPersona } from "../src/personas.js";
import { createRng } from "../src/random.js";
import { CORE_SCENARIO_IDS, runScenarioMatrix, runTuning } from "../src/harness.js";
import { BOARD_ROLES } from "../src/roles.js";

test("simulation session progresses and completes in fixed turns", () => {
  const persona = SIM_PERSONAS[0];
  const state = createSession({
    roleId: persona.roleId,
    sectorId: "financial-services",
    scenarioId: "bank-risk-and-growth-rebalance",
    seed: 42,
  });
  const rng = createRng(4201);
  assert.equal(state.turn, 0);

  while (!state.completed) {
    const selected = chooseOptionForPersona(state.options, persona, rng);
    assert.ok(selected, "expected at least one option");
    applyUserTurn(state, { optionId: selected.id, message: selected.title });
  }

  const view = buildClientState(state);
  assert.equal(view.completed, true);
  assert.equal(view.turn, view.maxTurns);
  assert.equal(view.scenario.id, "bank-risk-and-growth-rebalance");
  assert.ok(view.scorecard.overall >= 0 && view.scorecard.overall <= 100);
});

test("harness returns a tuned profile and leaderboard", () => {
  const result = runTuning({ hillClimbRounds: 1 });
  assert.ok(result.tunedProfile);
  assert.ok(Array.isArray(result.leaderboard));
  assert.ok(result.leaderboard.length > 0);
  assert.ok(result.bestResult.summary.avgScore > 0);
});

test("scenario matrix covers at least five scenarios per board role", () => {
  const matrix = runScenarioMatrix({ scenarioIds: CORE_SCENARIO_IDS, seeds: [11] });
  assert.equal(matrix.scenarioIds.length, 5);

  const roleScenarioMap = new Map();
  for (const episode of matrix.episodes) {
    if (!roleScenarioMap.has(episode.roleId)) {
      roleScenarioMap.set(episode.roleId, new Set());
    }
    roleScenarioMap.get(episode.roleId).add(episode.scenarioId);
  }

  for (const role of BOARD_ROLES) {
    assert.ok(roleScenarioMap.has(role.id), `missing role coverage for ${role.id}`);
    assert.ok(
      roleScenarioMap.get(role.id).size >= 5,
      `expected >=5 scenarios for ${role.id}`
    );
  }
});
