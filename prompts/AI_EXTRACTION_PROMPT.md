# AION Journal OS - AI Extraction Prompt

## Purpose

This document defines how AI should extract structured trade data from narrative text provided by the trader.

## Extraction Process

### Step 1: Identify Extractable Fields

From narrative text, attempt to identify:
- Instrument (e.g., EURUSD, NQ, BTC)
- Direction (LONG/SHORT)
- Entry price
- Stop loss price
- Take profit price
- Session (ASIA/LONDON/NEW_YORK)
- Setup name (if matches known setups)
- Market type (FOREX/INDICES/FUTURES/CRYPTO/STOCKS)

### Step 2: Confidence Scoring

For each extracted field:
- **High (0.9-1.0)**: Explicitly stated with clear value
- **Medium (0.6-0.8)**: Implied but unambiguous
- **Low (0.3-0.5)**: Inferred with some uncertainty
- **None (0)**: Not found or ambiguous

### Step 3: Missing Field Detection

If any required field cannot be extracted:
1. Mark trade as INCOMPLETE
2. List all missing required fields
3. Do NOT fill with defaults or assumptions

## Extraction Schema

```json
{
  "extraction_id": "UUID",
  "source_text": "Original narrative",
  "timestamp_utc": "ISO-8601",
  "extracted_fields": {
    "instrument": {"value": "EURUSD", "confidence": 0.95},
    "direction": {"value": "LONG", "confidence": 0.90},
    "entry_price": {"value": 1.0850, "confidence": 0.85},
    "stop_loss": {"value": null, "confidence": 0, "missing": true},
    "take_profit": {"value": 1.0900, "confidence": 0.80}
  },
  "missing_required": ["stop_loss"],
  "overall_confidence": 0.62,
  "validation_status": "INCOMPLETE",
  "warnings": ["Stop loss not found in narrative"]
}
```

## Field Extraction Rules

### Instrument Detection
- Look for currency pairs: EURUSD, GBPJPY, etc.
- Look for index names: NQ, ES, DAX, etc.
- Look for crypto: BTC, ETH, etc.
- Look for stock tickers: AAPL, TSLA, etc.

### Direction Detection
- "long", "buy", "bullish", "bought" → LONG
- "short", "sell", "bearish", "sold" → SHORT
- Ambiguous statements → DO NOT ASSUME

### Price Extraction
- Look for numeric values near keywords: "entry", "entered at", "SL", "TP"
- Match price format to instrument (forex: 5 decimals, indices: 2 decimals)
- If price format seems wrong, flag a warning

### Session Detection
- Time mentions: "Asian session", "London open", "NY close"
- Time values: Convert to session based on UTC
- If unclear: LEAVE EMPTY, do not guess

## Validation After Extraction

1. Check if direction matches SL/TP logic
2. Verify price levels make sense for instrument
3. Flag any mathematical impossibilities
4. Mark as INVALID if rules are violated

## Never Assume

The following MUST be explicitly stated:
- Risk percentage
- Position size
- Account selection
- Trade date (if different from current)

If not stated, these fields remain NULL - never infer them.
