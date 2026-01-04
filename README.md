# AION Journal OS

**Institutional-Grade Trading Journal System**

A static, GitHub-hosted trading journal that replaces Excel with a connected, audit-safe web application.

## Features

- 📊 **Trade Logging** - DRAFT → PLANNED → OPEN → CLOSED state machine
- 🔒 **Audit Mode** - Mode 100 with locked tables and full logging
- 📈 **Analytics** - Equity curves, win rates, RR distribution
- ⚙️ **Rule Engine** - Automatic violation detection
- 🧠 **AI-Ready** - Documented prompts for AI assistance

## Quick Start

1. **Deploy to GitHub Pages** - Upload files to a GitHub repository
2. **Create Data Repo** - Private repository for your trades
3. **Get PAT** - GitHub token with `repo` scope
4. **Login** - Enter PAT + repository in auth modal

## Tech Stack

- HTML5 + Tailwind CSS (CDN)
- Vanilla JavaScript (no frameworks)
- GitHub REST API (data storage)
- Chart.js (visualizations)

## File Structure

```
index.html          # Main entry point
styles.css          # Dark theme styles
state.js            # Global state management
api.js              # GitHub API operations
validators.js       # Trade validation
analytics.js        # Performance calculations
market_engine.js    # Pip/tick/position sizing
app.js              # Application orchestrator
ui/                 # Page modules
prompts/            # AI documentation
templates/          # Sample JSON files
```

## Documentation

See `/prompts/` for:
- [README_OVERVIEW.md](prompts/README_OVERVIEW.md) - System overview
- [README_DAILY_WORKFLOW.md](prompts/README_DAILY_WORKFLOW.md) - How to use daily
- [README_DESIGN_DECISIONS.md](prompts/README_DESIGN_DECISIONS.md) - Why decisions were made
- [README_AI_BEHAVIOR.md](prompts/README_AI_BEHAVIOR.md) - AI usage guide

## Data Repository Setup

Copy files from `/templates/` to your private data repo:
```
data/
  accounts.json
  rules.json
  playbook_setups.json
  trades.json
  trade_history.json
control/
  CONTROL_PANEL.json
  user_preferences.json
locked_100/
  audit_log.json
```

## License

MIT
