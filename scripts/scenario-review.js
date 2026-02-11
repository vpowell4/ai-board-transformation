import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScenarioMatrix } from "../src/harness.js";
import { loadProfileFromDisk } from "../src/prompt-profile.js";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function md(result) {
  const lines = [];
  lines.push("# Scenario Matrix Review");
  lines.push("");
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push("");
  lines.push("Coverage:");
  lines.push(
    `- Episodes: ${result.episodes.length} (${result.scenarioIds.length} scenarios x 5 board roles x ${result.seeds.length} seeds)`
  );
  lines.push(`- Average score: ${result.summary.avgScore.toFixed(2)}`);
  lines.push(`- Excellent rate: ${(result.summary.excellentRate * 100).toFixed(1)}%`);
  lines.push(`- Average incidents: ${result.summary.avgIncidents.toFixed(2)}`);
  lines.push("");
  lines.push("## Role x Scenario Outcomes");
  lines.push("");
  lines.push("| Role | Scenario | Avg Score | Incidents | Decision Quality | Risk Control |");
  lines.push("|---|---|---:|---:|---:|---:|");
  for (const row of result.roleScenarioRows) {
    lines.push(
      `| ${row.roleId} | ${row.scenarioName} | ${row.avgScore.toFixed(2)} | ${row.avgIncidents.toFixed(
        2
      )} | ${row.decisionQuality.toFixed(2)} | ${row.riskControl.toFixed(2)} |`
    );
  }

  lines.push("");
  lines.push("## Improvement Focus");
  lines.push("");
  if (result.weakRows.length === 0) {
    lines.push("- No role-scenario pair fell below thresholds; keep monitoring incident reduction.");
  } else {
    for (const row of result.weakRows) {
      lines.push(`- ${row.roleId} / ${row.scenarioName}: ${row.recommendation}`);
    }
  }

  return lines.join("\n");
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const reportsDir = path.join(root, "harness-output");
  ensureDir(reportsDir);
  const profile = loadProfileFromDisk(root);
  const matrix = runScenarioMatrix({ profile });

  const jsonPath = path.join(reportsDir, "scenario-matrix.json");
  const mdPath = path.join(reportsDir, "scenario-matrix.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, `${md(matrix)}\n`, "utf8");

  console.log("Scenario matrix review complete.");
  console.log(`Episodes: ${matrix.episodes.length}`);
  console.log(`Average score: ${matrix.summary.avgScore.toFixed(2)}`);
  console.log(`Excellent rate: ${(matrix.summary.excellentRate * 100).toFixed(1)}%`);
  console.log(`Average incidents: ${matrix.summary.avgIncidents.toFixed(2)}`);
  console.log(`Report: ${mdPath}`);
}

main();

