export const BOARD_ROLES = [
  {
    id: "board-chair",
    name: "Board Chair",
    focus: "Portfolio balance, governance quality, and long-term value creation.",
    priorities: {
      "value-pools": 1.1,
      "governance-control": 1.2,
      "data-platform": 1.0,
      "portfolio-discipline": 1.1,
      "people-change": 0.95,
      "human-agency": 1.15,
      "measurement-cadence": 1.2,
    },
  },
  {
    id: "ceo",
    name: "CEO",
    focus: "Strategic direction, growth, and execution pace across the enterprise.",
    priorities: {
      "value-pools": 1.2,
      "governance-control": 0.95,
      "data-platform": 1.0,
      "portfolio-discipline": 1.15,
      "people-change": 1.05,
      "human-agency": 1.05,
      "measurement-cadence": 1.0,
    },
  },
  {
    id: "cfo",
    name: "CFO",
    focus: "Capital discipline, margin impact, risk-adjusted return, and control.",
    priorities: {
      "value-pools": 1.15,
      "governance-control": 1.15,
      "data-platform": 0.95,
      "portfolio-discipline": 1.1,
      "people-change": 0.85,
      "human-agency": 1.0,
      "measurement-cadence": 1.2,
    },
  },
  {
    id: "coo",
    name: "COO",
    focus: "Workflow redesign, service quality, and operating resilience.",
    priorities: {
      "value-pools": 1.0,
      "governance-control": 1.0,
      "data-platform": 1.1,
      "portfolio-discipline": 1.1,
      "people-change": 1.15,
      "human-agency": 1.0,
      "measurement-cadence": 1.0,
    },
  },
  {
    id: "chief-risk-officer",
    name: "Chief Risk Officer",
    focus: "AI risk, regulatory readiness, controls, and incident prevention.",
    priorities: {
      "value-pools": 0.9,
      "governance-control": 1.25,
      "data-platform": 1.05,
      "portfolio-discipline": 0.95,
      "people-change": 0.95,
      "human-agency": 1.15,
      "measurement-cadence": 1.15,
    },
  },
];

export function getRole(roleId) {
  return BOARD_ROLES.find((role) => role.id === roleId) || BOARD_ROLES[0];
}

