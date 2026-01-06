# AION Journal OS

**Institutional-Grade Trading Journal & Life Operating System**

AION Journal OS is a high-performance, single-page application (SPA) designed for serious traders to track their performance, manage risk, and optimize their strategies. It is built with a serverless architecture using **Cloudflare Workers** and **D1 Database**, ensuring speed, security, and scalability.

---

## 🚀 Features

### 📊 Dashboard & Analytics
- **Real-time Performance Metrics:** Track your PnL, Win Rate, and Account Growth instantly.
- **Visual Charts:** Interactively view your equity curve and monthly performance.
- **Deep Analytics:** dedicated tab for analyzing performance by Day, Session, and Strategy.

### 📝 Trade Management
- **Comprehensive Logging:** Record every detail of your trades including entry/exit prices, fees, and notes.
- **Strategy Tracking:** Tag trades with specific strategies to see what works best.
- **Playbook & Rules:** Define your edge with a digital playbook and strict trading rules.

### 🔒 Security & Archiving
- **Secure Authentication:** User accounts are protected with PBKDF2 hashing and JWT sessions.
- **Audit Logging (Mode 100):** A strict "Audit Mode" that logs every action for accountability.
- **Dual-Sync Backup:** Data is instantly saved to the high-speed D1 Database AND automatically backed up researchers to your private **GitHub Repository** as JSON files.

### ⚙️ Control Panel
- **User Management:** Admins can manage users directly from the UI.
- **Configurations:** Customize your timezone, file naming conventions, and other preferences.
- **Data Export:** Download a complete JSON backup of your entire journal at any time.

---

## 🏗️ Architecture

The application consists of two main parts:

### 1. Frontend (The UI)
- **Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3, TailwindCSS (CDN).
- **Hosting:** Cloudflare Pages (`pages.dev`).
- **Structure:**
  - `index.html`: The single entry point for the application.
  - `app.js`: Main router and orchestrator.
  - `ui/`: Contains logic for specific pages (Dashboard, Trades, Control Panel, etc.).
  - `api.js`: Handles communication with the Backend Worker.
  - `state.js`: Manages global application state (Auth, User Data).

### 2. Backend (The API)
- **Tech Stack:** Cloudflare Workers (Node.js/V8 Runtime).
- **Database:** Cloudflare D1 (Serverless SQL).
- **Hosting:** Cloudflare Workers (`workers.dev`).
- **Structure:**
  - `worker/index.js`: Main entry point and CORS handler.
  - `worker/router.js`: Routes API requests to specific handlers.
  - `worker/auth.js`: Handles Login, Logout, and Token Validation.
  - `worker/data.js`: CRUD operations for Trades and User Configs.
  - `worker/github_sync.js`: Background logic to sync data to GitHub.

---

## 🛠️ Setup & Deployment

### Prerequisities
- Node.js & npm installed.
- A Cloudflare Account.
- Wrangler CLI installed (`npm install -g wrangler`).

### 1. Backend Deployment (Worker)

1.  **Navigate to project root:**
    ```bash
    cd c:\Users\AlM1GhTy\Desktop\Development\Trading_Journal
    ```

2.  **Login to Cloudflare:**
    ```bash
    wrangler login
    ```

3.  **Config Secrets (One-time):**
    Allows the app to write to your GitHub repo.
    ```bash
    wrangler secret put GITHUB_PAT  # Paste your GitHub Personal Access Token
    wrangler secret put GITHUB_REPO # Paste "YourUsername/YourRepo"
    ```

4.  **Deploy:**
    ```bash
    wrangler deploy
    ```
    *Note the URL it outputs (e.g., `https://aion-journal-os.yourname.workers.dev`).*

### 2. Database Setup

1.  **Create Database:**
    ```bash
    wrangler d1 create aion-db
    ```
    *Update `wrangler.toml` with the `database_id` it gives you.*

2.  **Initialize Schema:**
    ```bash
    wrangler d1 execute aion-db --file=schema.sql --remote
    ```

### 3. Frontend Deployment (Pages)

1.  **Update API URL:**
    Edit `api.js` and set `const API_BASE` to your Worker URL from Step 1.

2.  **Deploy to Pages:**
    ```bash
    wrangler pages deploy . --project-name aion-journal-ui --branch main
    ```

---

## 📖 Usage Guide

### Logging In
- Default Admin User: `admin`
- Default Admin Password: `admin123`
- *Security Tip: Create your own Admin user immediately and delete the default one.*

### Syncing to GitHub
1.  Go to **Control Panel**.
2.  Scroll to **GitHub Backup Settings**.
3.  Choose your preferred **File Naming Convention** (e.g., `EURUSD_LONG_ID.json`).
4.  Any trade you save will now automatically appear in your GitHub repository.

### "Mode 100" (Audit Mode)
- **Mode 98 (Standard):** Normal operation.
- **Mode 100 (Locked):** Enables strict auditing. Critical sheets are read-only. Every action is logged to the Audit Log. Use this only when you want to enforce discipline.

---

## 🤝 Troubleshooting

- **"Session Expired":** Refresh the page. If it persists, clear your browser cookies.
- **"Ctx is not defined":** This was a bug in older versions. Ensure your Worker is deployed with the latest code.
- **Blank Control Panel:** Ensure you have deployed the latest frontend code which handles empty database states.

---

## 📜 License
Private & Confidential.

## 📚 Page & Field Reference

### 1. Dashboard
Your daily command center for quick insights.

*   **Alerts Section:**
    *   **Incomplete Trades:** Alerts if you have trades stuck in `OPEN` or `DRAFT`.
    *   **Invalid Trades:** Alerts if your data entry is malformed.
    *   **Rule Violations:** Warnings if you broke any risk rules this week.
*   **Equity Summary Cards:**
    *   **Current Balance:** Live account balance.
    *   **Total P&L:** Net Profit/Loss across all trades.
    *   **Max Drawdown:** Peak-to-valley percentage drop.
    *   **Win Rate:** Percentage of winning trades.
*   **Quick Stats:** Streak (Win/Loss), Total Trades, Wins, Losses, Avg RR, Profit Factor, Expectancy.
*   **Recent Trades Table:** Shows last 5 closed trades.
*   **Upcoming Tasks:** Actionable items like "Complete trade [ID]" or "Monitor planned trade".

### 2. Trades (List View)
The master list of your trading activity.

*   **Filters Bar:** Filter by State (Open/Closed), Status (Win/Loss), Setup, Session, or Market Type.
*   **Columns:** ID, Instrument, Direction, State, Status, Setup, Session, RR, P&L, Date.
*   **Action:** Click "New Trade" to generate a unique ID (`YYMMDD.NN`) and start logging.

### 3. Trade Detail (Entry Form)
The heart of the application. This form tracks over 40 distinct data points per trade.

#### Header
*   **Trade State:** `DRAFT` → `PLANNED` → `OPEN` → `CLOSED` etc.
*   **Trade Status:** `PENDING`, `WIN`, `LOSS`, `BE` (Break Even).
*   **Trade Name:** Auto-generated e.g., "EURUSD London Long BOS".

#### Core Data
*   **Account:** Select which trading account this belongs to.
*   **Setup:** Link to a strategy from your Playbook.
*   **Market Type:** Forex, Crypto, Indices, Commodities, Stocks.
*   **Instrument:** Ticker symbol (e.g., BTCUSD).
*   **Session:** Asian, London, NY AM, NY PM.
*   **Entry Type:** Market, Limit, Stop.
*   **Prices:** Planned Entry, Actual Entry, Stop Loss, Take Profit.
*   **Risk:** Risk % (of account), USD Risk.
*   **Planned RR:** Auto-calculated Reward-to-Risk ratio.
*   **Exit:** Exit Type (TP, SL, Manual), Exit Price, Net PnL.
*   **Actual RR:** Auto-calculated final performance.

#### Context & Execution
*   **Higher TF Bias:** Bullish/Bearish context on H4/Daily.
*   **Market Structure:** Notes on trends and breaks.
*   **Liquidity:** Notes on inductor zones.
*   **Chart Links:** URL to TradingView snapshot.
*   **Slippage & Spread:** Execution quality metrics.
*   **News Nearby:** Yes/No flag.

#### Psychology (Mental Edge)
*   **Emotions:** Track emotions Pre-trade, During-trade, and Post-trade (e.g., Calm, Anxious, Greedy).
*   **Intensity:** 1-10 slider for emotional intensity.
*   **Confidence Score:** 1-10 rating of your conviction.

#### Narrative & Management
*   **Raw Narrative:** Free-text area for your thoughts.
*   **Management Notes:** How you handled the position (trailing stops, partials).

### 4. Strategies (Playbook Builder)
Define your edge here.

*   **Setup Name:** Unique identifier (e.g., "Asian Range Sweep").
*   **Status:** Active or Paused.
*   **Expected RR:** Baseline target.
*   **Max Trades/Day:** Limit per session.
*   **Criteria Fields:** Specific text areas for Conditions, Entry Model, SL Logic, TP Logic.

### 5. Playbook (Viewer)
A read-only, visual gallery of your active strategies. Great for "pre-session priming" to review your setups before trading.

### 6. Rules (Risk Manager)
Define the boundaries you must not cross.

*   **Enforcement Level:** `STRICT` (Violation logged), `WARNING` (Alert only).
*   **Metrics:** Max Risk Per Trade %, Max Daily Loss %, Max Open Risk %.
*   **Logic:** Text rules for Stop Loss usage, Session restrictions, and "No Trade" conditions (e.g., "Don't trade NFP").

### 7. Analytics (Performance)
Deep dive into your data.

*   **Equity Curve:** Visual growth chart.
*   **RR Distribution:** Bar chart showing frequency of outcome sizes.
*   **Win Rate Tables:** Breakdown by Setup, Session, and Market.
*   **Psychometrics:** Radar chart correlating Emotions to Win Rate.
*   **Risk Analysis:** Advanced institutional metrics (Sharpe Ratio, Sortino, SQN Score, CAGR).
*   **Time Analysis:** Holding time efficiency and PnL/Hour.

### 8. Control Panel (Admin)
Configure the Operating System.

*   **User Management:** Create/Delete users (Admin only).
*   **Mode Control:** Switch between Standard Mode (98) and Audit Mode (100).
*   **Data Management:** Export full JSON backup.
*   **Preferences:** Set Timezone and GitHub File Naming convention.
*   **Audit Log:** View immutable history of actions (in Mode 100).

