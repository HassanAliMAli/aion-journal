# AION Journal OS - AI Behavior Guide

## How AI Assists in AION

AI can be used alongside AION Journal OS to help with:
- Summarizing trade management notes
- Extracting structured data from narrative
- Validating trades against rules
- Calculating metrics

## What AI Must NEVER Do

1. **Invent data** - If not provided, mark as missing
2. **Infer values** - No guessing stop losses, entries, etc.
3. **Edit raw narrative** - Trader's words are sacred
4. **Delete records** - Append-only, no deletions
5. **Bypass validation** - All rules must be checked
6. **Assume timestamps** - Only use provided/system times

## What AI May Do

1. **Summarize** management notes and context
2. **Extract** data from narrative when explicitly asked
3. **Validate** trades against defined rules
4. **Calculate** RR, win rates, risk percentages
5. **Format** data for display (not modify)

## AI Prompts Included

| File | Purpose |
|------|---------|
| `AI_SYSTEM_PROMPT.md` | Core behavior rules |
| `AI_EXTRACTION_PROMPT.md` | How to parse narrative |
| `AI_VALIDATION_RULES.md` | Trade validation logic |
| `AI_LOCKED_FIELD_LOGIC.md` | What AI cannot modify |

## Using AI with Trade Narratives

When you write a raw narrative like:

> "Took a long on EU during London session. BOS confirmation on M15 after H4 pullback to 50% fib. Entry at 1.0850, SL below swing low at 1.0820, TP at 1.0920. Felt confident but rushed the entry a bit."

AI can extract:
- Instrument: EURUSD ✅
- Direction: LONG ✅
- Session: LONDON ✅
- Entry: 1.0850 ✅
- SL: 1.0820 ✅
- TP: 1.0920 ✅

AI cannot assume:
- Risk percentage ❌
- Position size ❌
- Account ❌

## Mode 100 AI Restrictions

In Mode 100:
- All AI actions are logged to audit_log
- AI cannot modify locked sheets
- Extra confirmation required for any changes

## Ask-Before-Assume Protocol

If AI is uncertain:
1. STOP processing
2. List specific questions
3. Wait for human confirmation
4. Never proceed with assumptions
