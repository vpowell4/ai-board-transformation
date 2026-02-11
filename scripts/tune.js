import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTuning } from "../src/harness.js";

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function toMarkdown(result) {
  const best = result.bestResult;
  const lines = [];
  lines.push("# AI Transformation Simulation Tuning Report");
  lines.push("");
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push("");
  lines.push("Coverage:");
  lines.push(
    `- Roles: ${result.coverage.roles}, scenarios: ${result.coverage.scenarios}, seeds/scenario: ${result.coverage.seedsPerScenario}, episodes per candidate: ${result.coverage.episodes}`
  );
  lines.push("");
  lines.push("## Best Profile");
  lines.push("");
  lines.push(`Name: ${best.profileName}`);
  lines.push(`Average score: ${best.summary.avgScore.toFixed(2)}`);
  lines.push(`Excellent outcome rate: ${formatPercent(best.summary.excellentRate)}`);
  lines.push(`Strong-or-better rate: ${formatPercent(best.summary.strongRate)}`);
  lines.push(`Average incidents: ${best.summary.avgIncidents.toFixed(2)}`);
  lines.push(`Business value: ${best.summary.avgBusinessValue.toFixed(2)}`);
  lines.push(`Decision quality: ${best.summary.avgDecisionQuality.toFixed(2)}`);
  lines.push(`Leadership capability: ${best.summary.avgLeadershipCapability.toFixed(2)}`);
  lines.push(`Speed to impact: ${best.summary.avgSpeedToImpact.toFixed(2)}`);
  lines.push(`Risk control: ${best.summary.avgRiskControl.toFixed(2)}`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(best.profile, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Leaderboard");
  lines.push("");
  for (const row of result.leaderboard) {
    lines.push(
      `- ${row.profileName}: score ${row.summary.avgScore.toFixed(2)}, excellent ${formatPercent(
        row.summary.excellentRate
      )}, incidents ${row.summary.avgIncidents.toFixed(2)}, decision quality ${row.summary.avgDecisionQuality.toFixed(2)}`
    );
  }
  return lines.join("\n");
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const reportsDir = path.join(projectRoot, "harness-output");
  ensureDir(reportsDir);

  const result = runTuning({ hillClimbRounds: 4 });

  const tunedPath = path.join(projectRoot, "config", "tuned-prompt-profile.json");
  const jsonReportPath = path.join(reportsDir, "latest-results.json");
  const markdownReportPath = path.join(reportsDir, "latest-report.md");

  writeJson(tunedPath, result.tunedProfile);
  writeJson(jsonReportPath, result);
  fs.writeFileSync(markdownReportPath, `${toMarkdown(result)}\n`, "utf8");

  const best = result.bestResult.summary;
  console.log("Tuning complete.");
  console.log(`Best avg score: ${best.avgScore.toFixed(2)}`);
  console.log(`Excellent rate: ${formatPercent(best.excellentRate)}`);
  console.log(`Strong rate: ${formatPercent(best.strongRate)}`);
  console.log(`Avg incidents: ${best.avgIncidents.toFixed(2)}`);
  console.log(`Decision quality: ${best.avgDecisionQuality.toFixed(2)}`);
  console.log(`Risk control: ${best.avgRiskControl.toFixed(2)}`);
  console.log(
    `Coverage: ${result.coverage.roles} roles x ${result.coverage.scenarios} scenarios x ${result.coverage.seedsPerScenario} seeds`
  );
  console.log(`Updated config: ${tunedPath}`);
  console.log(`Report: ${markdownReportPath}`);
}

main();
