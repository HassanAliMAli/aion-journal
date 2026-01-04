# AION Journal OS - Daily Workflow

## Pre-Session Checklist

1. **Open Dashboard** - Check for incomplete trades and violations
2. **Review Rules** - Confirm max risk, session rules active
3. **Check Setups** - Verify active playbook setups
4. **Note Market Context** - Record HTF bias before session

## During Session

### When Spotting a Setup

1. Go to **Trades** → Click **New Trade**
2. Select **Account** and **Setup**
3. Fill **Instrument**, **Direction**, **Market Type**
4. Enter **Planned Entry**, **Stop Loss**, **Take Profit**
5. Verify RR calculation meets minimum
6. Set state to **PLANNED**

### When Trade Triggers

1. Open the planned trade
2. Enter **Actual Entry Price**
3. Confirm **Risk %** is within rules
4. Set state to **OPEN**
5. Add **Execution Notes** (slippage, spread)

### When Exiting Trade

1. Open the open trade
2. Enter **Exit Price** and **Exit Type** (TP/SL/Manual)
3. Record **Net P&L**
4. Set state to **CLOSED**
5. Fill **Psychology** section
6. Write **Raw Narrative** (your own words, unedited)

## Post-Session

1. **Review closed trades** - Check for rule violations
2. **Update Management Notes** - What you learned
3. **Check Analytics** - Update equity curve tracking
4. **Rate confidence** - How disciplined was today?

## Weekly Review

1. **Filter trades by week** in Analytics
2. **Check win rates** by setup, session, market
3. **Review violations** - Patterns to address
4. **Update setups** - Pause underperforming, improve conditions
5. **Adjust rules** if consistently violated

## Monthly Audit

1. Review all **INVALID** and **INCOMPLETE** trades
2. Check **Mode 100** readiness score
3. Export equity snapshots if needed
4. Update playbook documentation

## State Transition Quick Reference

| Current | Action | New State |
|---------|--------|-----------|
| DRAFT | Complete required fields | PLANNED |
| PLANNED | Entry triggers | OPEN |
| PLANNED | Entry missed | MISSED |
| OPEN | Trade closed | CLOSED |
| Any | Validation fails | INVALID |
| Any | Missing fields | INCOMPLETE |
