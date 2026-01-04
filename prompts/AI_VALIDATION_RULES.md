# AION Journal OS - AI Validation Rules

## Purpose

This document defines the validation rules that ALL trades must pass. A trade is considered INVALID unless all applicable checks pass.

## Validation Hierarchy

1. **Schema Validation** - Data structure correctness
2. **Required Fields** - Mandatory data present
3. **Logical Validation** - Mathematical/logical consistency
4. **Rule Compliance** - Trading rules adherence
5. **State Validation** - Trade state machine compliance

## Schema Validation

Every data file must have:
```json
{
  "_meta": {
    "schema_version": "1.0.0",
    "created_at_utc": "ISO-8601 timestamp",
    "last_modified_at_utc": "ISO-8601 timestamp",
    "owner_user_id": "numeric GitHub user ID"
  }
}
```

**Result**: Schema mismatch → REFUSE TO LOAD

## Required Fields by State

### DRAFT State
- trade_id (auto-generated)
- date_utc (auto-generated)

### PLANNED State
- account_id
- instrument
- direction
- market_type
- planned_entry_price
- stop_loss
- take_profit

### OPEN State
All PLANNED requirements plus:
- actual_entry_price
- risk_pct OR usd_risk

### CLOSED State
All OPEN requirements plus:
- exit_price
- exit_type
- exit_time_utc

**Result**: Missing required field → INCOMPLETE

## Logical Validation Rules

### Rule L1: Stop Loss Position
```
IF direction = LONG THEN stop_loss < entry_price
IF direction = SHORT THEN stop_loss > entry_price
```
**Violation**: INVALID - "Stop loss on wrong side of entry"

### Rule L2: Take Profit Position
```
IF direction = LONG THEN take_profit > entry_price
IF direction = SHORT THEN take_profit < entry_price
```
**Violation**: INVALID - "Take profit on wrong side of entry"

### Rule L3: Positive Risk
```
risk_pct > 0 AND risk_pct <= 100
usd_risk > 0
```
**Violation**: INVALID - "Invalid risk value"

### Rule L4: RR Calculation
```
planned_rr = |take_profit - entry| / |entry - stop_loss|
actual_rr = (exit_price - entry) / |entry - stop_loss| * direction_multiplier
```
**Violation**: WARNING - "RR calculation mismatch"

### Rule L5: Exit Price Consistency
```
IF exit_type = TP THEN exit_price ≈ take_profit (±slippage tolerance)
IF exit_type = SL THEN exit_price ≈ stop_loss (±slippage tolerance)
```
**Violation**: WARNING - "Exit price doesn't match exit type"

## Rule Compliance Validation

### Risk Per Trade
```
IF risk_pct > rules.max_risk_per_trade_pct THEN
  IF enforcement = STRICT THEN INVALID
  ELSE WARNING
```

### Minimum RR
```
IF planned_rr < rules.minimum_rr THEN
  IF enforcement = STRICT THEN INVALID
  ELSE WARNING
```

### Session Compliance
```
IF session NOT IN rules.allowed_sessions THEN
  IF enforcement = STRICT THEN INVALID
  ELSE WARNING
```

### Daily Loss Limit
```
IF daily_loss > rules.max_daily_loss_pct THEN
  FLAG VIOLATION
  IF enforcement = STRICT THEN PREVENT new trades
```

## State Transition Rules

Valid transitions:
```
DRAFT → PLANNED, INVALID, INCOMPLETE
PLANNED → OPEN, MISSED, DRAFT
OPEN → CLOSED, INVALID
MISSED → DRAFT
CLOSED → (terminal)
INVALID → DRAFT
INCOMPLETE → DRAFT
```

Invalid transition → REJECT with error

## Violation Recording

When a rule is violated:
```json
{
  "violation_id": "auto-increment",
  "trade_id": "T-XXXXXX",
  "rule_breached": "Rule identifier",
  "description": "Human-readable description",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "timestamp_utc": "ISO-8601"
}
```

## Enforcement Levels

- **STRICT**: Violation prevents saving, trade marked INVALID
- **WARNING**: Violation recorded, user warned, save allowed
- **LOG_ONLY**: Violation recorded silently, save allowed

## Final Validation Status

```
IF any_critical_error THEN "INVALID"
ELSE IF any_missing_required THEN "INCOMPLETE"
ELSE IF has_warnings THEN "VALID_WITH_WARNINGS"
ELSE "VALID"
```
