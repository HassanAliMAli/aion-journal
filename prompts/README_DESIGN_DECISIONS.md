# AION Journal OS - Design Decisions

## Why GitHub Pages Only?

- **No server costs** - Runs entirely on static hosting
- **No database fees** - GitHub is the database
- **No backend maintenance** - Pure frontend
- **Audit trail built-in** - Git history = audit log
- **Lifetime storage** - Data lives as long as GitHub exists

## Why Vanilla JavaScript?

- **No build step** - Deploy by copy/paste
- **No dependencies to break** - Self-contained
- **No framework lock-in** - Easy to understand and modify
- **Fast loading** - No framework overhead
- **GitHub Pages compatible** - Works immediately

## Why JSON Files?

- **Human readable** - Can be edited manually if needed
- **Git-friendly** - Clear diffs, easy merging
- **Schema versioned** - Future-proof migrations
- **Simple parsing** - Native JavaScript support

## Why Numeric User ID?

- **Immutable** - Usernames can change, IDs cannot
- **Unique** - Guaranteed by GitHub
- **Private** - Not exposed in UI URLs
- **Isolated** - Each user has separate data folder

## Why Mode 98/100?

- **Mode 98** - Daily operation, flexible editing
- **Mode 100** - Audit mode, locked tables, forced logging
- **Progressive discipline** - Earn Mode 100 through consistency
- **Reversible** - Can downgrade with warning

## Why Append-Only History?

- **No regrets** - Every edit is preserved
- **Accountability** - Cannot hide mistakes
- **Learning** - Review past decisions
- **Legal** - Defensible trade records

## Why UTC-Only Storage?

- **Single source of truth** - No timezone confusion
- **Session calculations** - Consistent across timezones
- **API compatibility** - GitHub uses UTC
- **Display flexibility** - Convert to any timezone on display

## Why Trade State Machine?

- **Clear lifecycle** - DRAFT → PLANNED → OPEN → CLOSED
- **Validation gates** - Must meet requirements to transition
- **Error states** - INVALID/INCOMPLETE are explicit
- **Audit friendly** - Every transition logged

## Trade-offs Accepted

| Decision | Trade-off | Justification |
|----------|-----------|---------------|
| No real-time sync | Must refresh for updates | Simplicity over sync complexity |
| GitHub rate limits | May hit limits on heavy use | Free tier sufficient for personal use |
| No encryption | Data visible to GitHub | Private repo + user responsibility |
| No mobile app | Web-only interface | PWA-capable, responsive design |
