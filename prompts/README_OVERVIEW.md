# AION Journal OS - Overview

## What is AION?

AION Journal OS is a lifelong, audit-safe, AI-assisted trading journal operating system. It replaces institutional Excel-based trading systems with a connected, deterministic, web-based system hosted entirely on GitHub Pages.

## System Philosophy

| Principle | Meaning |
|-----------|---------|
| **Truth over comfort** | Never fabricate or hide data |
| **Discipline over convenience** | Enforce rules strictly |
| **History over cleanliness** | Never delete, always preserve |
| **Audit over aesthetics** | Data accuracy first |

## Architecture

```
┌─────────────────────────────────────────────────┐
│           PUBLIC UI (GitHub Pages)              │
│  ┌─────────────────────────────────────────┐   │
│  │  index.html + Tailwind + Vanilla JS     │   │
│  │  ├── state.js (Global State)            │   │
│  │  ├── api.js (GitHub API Layer)          │   │
│  │  ├── validators.js (Trade Validation)   │   │
│  │  ├── analytics.js (Calculations)        │   │
│  │  └── ui/*.js (Page Modules)             │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      │
                      │ GitHub REST API
                      ▼
┌─────────────────────────────────────────────────┐
│         PRIVATE DATA (GitHub Repository)        │
│  /users/{github_user_id}/                       │
│  ├── data/        (trades, accounts, rules)     │
│  ├── locked_100/  (audit logs, snapshots)       │
│  ├── control/     (mode settings, prefs)        │
│  └── ai_docs/     (AI behavior rules)           │
└─────────────────────────────────────────────────┘
```

## Key Features

1. **Trade State Machine**: DRAFT → PLANNED → OPEN → CLOSED
2. **Mode 98/100**: Standard vs strict audit mode
3. **Rule Enforcement**: Automatic violation detection
4. **Analytics**: Equity curves, win rates, RR distribution
5. **AI Documentation**: Guides AI behavior for summaries

## Getting Started

1. Deploy UI to GitHub Pages
2. Create private repository for data
3. Generate PAT with `repo` scope
4. Enter credentials in auth modal
5. Start logging trades

## Files Structure

```
/index.html          Main entry point
/styles.css          Dark theme styles
/state.js            Global state management
/api.js              GitHub API operations
/validators.js       Trade validation
/analytics.js        Performance calculations
/app.js              Application orchestrator
/ui/*.js             Page-specific modules
/prompts/*.md        AI behavior documentation
/templates/*.json    Sample data templates
```
