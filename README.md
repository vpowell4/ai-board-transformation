# AI Board Transformation Simulator

Firebase-hosted board simulation app for AI transformation practice, aligned to:

- `The_CEOs_AI_Transformation_Framework_And_Implementation_UPDATED_WORD_FINAL.docx`
- `The_CEOs_Guide_to_AI_Transformation_V0.1.docx`
- `https://www.oblongix.com`

## Features

- Single-screen simulation UI with chat + option decisions.
- Selectable board role, sector, and scenario.
- Firebase Authentication (email/password).
- Firestore persistence for saved simulation snapshots and transcript history.
- Localhost mock mode for Auth + Firestore when Firebase config is not set.
- Harness tooling for scenario matrix runs and prompt-profile tuning.

## Local Run

```bash
npm install
npm start
```

Open:

```text
http://127.0.0.1:8080
```

By default on localhost, the app runs in mock Firebase mode.

## Configure Real Firebase

1. Update `public/firebase-config.js` with your own Firebase app config.
2. Update `.firebaserc` default project id to your separate project.
3. Optional on localhost: set `window.FORCE_REAL_FIREBASE = true` in DevTools before reload.

## Deploy

```bash
npm run deploy -- --project YOUR_FIREBASE_PROJECT_ID
```

## Firestore Data Model

- `users/{uid}`
  - `uid`, `email`, `name`, timestamps
- `simulationSessions/{sessionId}`
  - `ownerUid`, `roleId`, `sectorId`, `scenarioId`
  - live snapshot (`snapshot`) and `transcript`
  - score/turn/stage metadata

Security rules are in `firestore.rules`.

## Testing and Analysis

```bash
npm test
npm run harness
npm run scenario-review
```

Outputs:

- `harness-output/latest-report.md`
- `harness-output/scenario-matrix.md`
