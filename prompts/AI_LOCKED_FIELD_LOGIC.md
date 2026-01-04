# AION Journal OS - AI Locked Field Logic

## Purpose

This document defines the behavior of LOCKED fields and when AI must refuse to modify them.

## What is a Locked Field?

A locked field is one that:
1. Has been committed to the permanent record
2. Is part of the audit trail
3. Cannot be modified without explicit history preservation
4. Represents a "source of truth" moment

## Permanently Locked Fields

### Trade ID
- **Field**: `trade_id`
- **Lock Condition**: On creation
- **Behavior**: NEVER modifiable by any means
- **AI Action**: Refuse any request to change

### Created Timestamp
- **Field**: `created_at_utc` in `_meta`
- **Lock Condition**: On creation
- **Behavior**: Immutable
- **AI Action**: Refuse any modification

### Raw Narrative
- **Field**: `trade_narrative.raw_narrative_text`
- **Lock Condition**: After first save
- **Behavior**: AI NEVER edits this field
- **AI Action**: Can read, cannot write

### History Entries
- **Field**: All entries in `trade_history.json`
- **Lock Condition**: On append
- **Behavior**: Append-only, no modifications
- **AI Action**: Can read, can append, cannot modify existing

### Audit Log Entries
- **Field**: All entries in `audit_log.json`
- **Lock Condition**: On append
- **Behavior**: Append-only, no modifications
- **AI Action**: Can read, can append, cannot modify existing

## Conditionally Locked Fields (Mode 100)

When operating in Mode 100, these tables become LOCKED:

### equity_snapshots.json
- All records have `status: "LOCKED"`
- AI cannot modify existing snapshots
- New snapshots can be added

### management_events.json
- All records locked on creation
- AI can summarize but not modify

### partial_exits.json
- Records locked after creation
- New exits can be added

### strategy_changes.json
- Strategy change history immutable
- New changes can be logged

## AI Behavior with Locked Fields

### When Asked to Modify a Locked Field

1. **Identify** the field as locked
2. **Refuse** the modification politely
3. **Explain** why the field is locked
4. **Suggest** alternatives if applicable

Example response:
```
"I cannot modify the trade_id field as it is permanently locked 
for audit purposes. Trade IDs are immutable once created to 
maintain historical integrity. If you need to correct an error, 
please create a new trade and mark the old one as INVALID."
```

### When Asked to Reference Locked Data

AI MAY:
- Read locked fields for context
- Use locked data in calculations
- Reference locked data in summaries
- Include locked data in reports

AI MUST NOT:
- Alter the underlying locked data
- Suggest modifications to locked data
- Override lock status

## Lock Status Checking

Before any write operation, AI must:

1. Check if field is permanently locked
2. Check current mode (98 vs 100)
3. Check if table has `status: "LOCKED"`
4. Verify operation type (append allowed, modify blocked)

## Unlocking Procedure

Fields can ONLY be unlocked by:
1. Mode downgrade (100 → 98) for conditional locks
2. NEVER for permanent locks

Even after unlocking:
- History of the lock period is preserved
- Audit log records the unlock event
- Original locked values remain in history

## AI Error Responses

When lock violation is attempted:

```json
{
  "error": "LOCKED_FIELD_VIOLATION",
  "field": "field_name",
  "lock_type": "PERMANENT|MODE_100",
  "message": "Human-readable explanation",
  "alternatives": ["List of alternative actions"]
}
```

## Summary

- Some fields are ALWAYS locked (trade_id, timestamps, raw narrative)
- Some fields lock in Mode 100 (equity, events, exits)
- History entries are append-only ALWAYS
- AI must check locks before any write
- AI must refuse and explain locked field modifications
- AI can always READ locked data
