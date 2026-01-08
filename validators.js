/**
 * AION Journal OS - Data Validation Engine
 */

const AionValidators = (function () {
    'use strict';

    const TRADE_STATES = ['DRAFT', 'PLANNED', 'OPEN', 'MISSED', 'CLOSED', 'INVALID', 'INCOMPLETE'];
    const TRADE_STATUSES = ['WIN', 'LOSS', 'BREAKEVEN', 'PENDING'];
    const DIRECTIONS = ['LONG', 'SHORT'];
    const ENTRY_TYPES = ['MARKET', 'LIMIT', 'STOP'];
    const EXIT_TYPES = ['TP', 'SL', 'MANUAL', 'TIME', 'BREAKEVEN'];
    const MARKET_TYPES = ['FOREX', 'INDICES', 'FUTURES', 'CRYPTO', 'STOCKS'];
    const SESSIONS = ['ASIA', 'LONDON', 'NEW_YORK', 'OVERLAP_LONDON_NY', 'OFF_SESSION'];
    const EMOTIONS = ['CALM', 'CONFIDENT', 'ANXIOUS', 'FEARFUL', 'GREEDY', 'FRUSTRATED', 'EUPHORIC', 'NEUTRAL'];
    const SETUP_STATUSES = ['ACTIVE', 'PAUSED', 'RETIRED'];
    const ENFORCEMENT_LEVELS = ['STRICT', 'WARNING', 'LOG_ONLY'];

    // Market-specific field configuration
    const MARKET_FIELD_CONFIG = {
        FOREX: {
            positionSizeLabel: 'Lots',
            positionSizeField: 'lots',
            pipPointLabel: 'Pip Value ($)',
            pipPointField: 'pip_value',
            showSpread: true,
            showSlippage: true,
            defaultPipValue: 10 // Standard lot, USD pairs
        },
        FUTURES: {
            positionSizeLabel: 'Contracts',
            positionSizeField: 'contracts',
            pipPointLabel: 'Point Value ($)',
            pipPointField: 'point_value',
            showSpread: false,
            showSlippage: true,
            defaultPipValue: null
        },
        STOCKS: {
            positionSizeLabel: 'Shares',
            positionSizeField: 'shares',
            pipPointLabel: null,
            pipPointField: null,
            showSpread: false,
            showSlippage: false,
            defaultPipValue: null
        },
        CRYPTO: {
            positionSizeLabel: 'Quantity',
            positionSizeField: 'quantity',
            pipPointLabel: null,
            pipPointField: null,
            showSpread: true,
            showSlippage: true,
            defaultPipValue: null
        },
        INDICES: {
            positionSizeLabel: 'Contracts/Lots',
            positionSizeField: 'contracts',
            pipPointLabel: 'Point Value ($)',
            pipPointField: 'point_value',
            showSpread: true,
            showSlippage: true,
            defaultPipValue: null
        }
    };

    function validateTrade(trade, setups, rules, account) {
        const errors = [];
        const warnings = [];

        if (!trade.account_id) errors.push('Account is required');
        if (!trade.instrument) errors.push('Instrument is required');
        if (!trade.direction || !DIRECTIONS.includes(trade.direction)) errors.push('Valid direction required');
        if (!trade.market_type || !MARKET_TYPES.includes(trade.market_type)) errors.push('Valid market type required');

        if (trade.trade_state === 'OPEN' || trade.trade_state === 'CLOSED') {
            if (!trade.actual_entry_price || trade.actual_entry_price <= 0) errors.push('Entry price required');
            if (!trade.stop_loss || trade.stop_loss <= 0) errors.push('Stop loss required');
        }

        if (trade.stop_loss && trade.actual_entry_price) {
            if (trade.direction === 'LONG' && trade.stop_loss >= trade.actual_entry_price) {
                errors.push('Stop loss must be below entry for LONG trades');
            }
            if (trade.direction === 'SHORT' && trade.stop_loss <= trade.actual_entry_price) {
                errors.push('Stop loss must be above entry for SHORT trades');
            }
        }

        if (trade.setup_id && setups) {
            const setup = setups.find(s => s.setup_id === trade.setup_id);
            if (setup && setup.setup_status !== 'ACTIVE') {
                warnings.push(`Setup "${setup.setup_name}" is ${setup.setup_status}`);
            }
        }

        if (rules && account) {
            const accountRules = rules.find(r => r.account_id === trade.account_id);
            if (accountRules) {
                if (trade.risk_pct && accountRules.max_risk_per_trade_pct) {
                    if (trade.risk_pct > accountRules.max_risk_per_trade_pct) {
                        if (accountRules.enforcement_level === 'STRICT') {
                            errors.push(`Risk ${trade.risk_pct}% exceeds max ${accountRules.max_risk_per_trade_pct}%`);
                        } else {
                            warnings.push(`Risk ${trade.risk_pct}% exceeds max ${accountRules.max_risk_per_trade_pct}%`);
                        }
                    }
                }
                if (trade.planned_rr && accountRules.minimum_rr) {
                    if (trade.planned_rr < accountRules.minimum_rr) {
                        warnings.push(`RR ${trade.planned_rr} below minimum ${accountRules.minimum_rr}`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            state: errors.length > 0 ? 'INVALID' : (hasRequiredFields(trade) ? trade.trade_state : 'INCOMPLETE')
        };
    }

    function hasRequiredFields(trade) {
        const required = ['account_id', 'instrument', 'direction', 'market_type'];
        return required.every(field => trade[field]);
    }

    function validateStateTransition(currentState, newState, trade) {
        const validTransitions = {
            'DRAFT': ['PLANNED', 'INVALID', 'INCOMPLETE'],
            'PLANNED': ['OPEN', 'MISSED', 'DRAFT'],
            'OPEN': ['CLOSED', 'INVALID'],
            'MISSED': ['DRAFT'],
            'CLOSED': [],
            'INVALID': ['DRAFT'],
            'INCOMPLETE': ['DRAFT']
        };

        if (!validTransitions[currentState]?.includes(newState)) {
            return { valid: false, error: `Cannot transition from ${currentState} to ${newState}` };
        }

        if (newState === 'OPEN' && (!trade.actual_entry_price || !trade.stop_loss)) {
            return { valid: false, error: 'Entry price and stop loss required to open trade' };
        }

        if (newState === 'CLOSED' && !trade.exit_price) {
            return { valid: false, error: 'Exit price required to close trade' };
        }

        return { valid: true };
    }

    function calculateRR(entry, stopLoss, takeProfit, direction) {
        if (!entry || !stopLoss || !takeProfit) return null;
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit - entry);
        if (risk === 0) return null;
        return Math.round((reward / risk) * 100) / 100;
    }

    function calculateActualRR(entry, stopLoss, exitPrice, direction) {
        if (!entry || !stopLoss || !exitPrice) return null;
        const risk = Math.abs(entry - stopLoss);
        const pnl = direction === 'LONG' ? exitPrice - entry : entry - exitPrice;
        if (risk === 0) return null;
        return Math.round((pnl / risk) * 100) / 100;
    }

    function determineTradeStatus(actualRR) {
        if (actualRR === null || actualRR === undefined) return 'PENDING';
        if (actualRR > 0.1) return 'WIN';
        if (actualRR < -0.1) return 'LOSS';
        return 'BREAKEVEN';
    }

    function validateSchema(data, type) {
        if (!data._meta) return { valid: false, error: 'Missing _meta field' };
        if (!AionState.isSchemaCompatible(data._meta.schema_version)) {
            return { valid: false, error: `Incompatible schema version: ${data._meta.schema_version}` };
        }
        return { valid: true };
    }

    function generateTradeId(existingTrades) {
        const maxId = existingTrades.reduce((max, t) => {
            const num = parseInt(t.trade_id?.replace('T-', '') || '0');
            return num > max ? num : max;
        }, 0);
        return `T-${String(maxId + 1).padStart(6, '0')}`;
    }

    function generateId(prefix, existingItems, idField) {
        const maxId = existingItems.reduce((max, item) => {
            const num = parseInt(item[idField]?.toString().replace(/\D/g, '') || '0');
            return num > max ? num : max;
        }, 0);
        return prefix ? `${prefix}${maxId + 1}` : maxId + 1;
    }

    // Calculate P&L based on market type
    function calculatePnL(entry, exit, positionSize, pipPointValue, direction, marketType) {
        if (!entry || !exit || !positionSize) return null;

        const config = MARKET_FIELD_CONFIG[marketType];
        if (!config) return null;

        const priceDiff = direction === 'LONG' ? exit - entry : entry - exit;

        // Stocks/Crypto: Simple P&L = priceDiff * quantity
        if (marketType === 'STOCKS' || marketType === 'CRYPTO') {
            return Math.round(priceDiff * positionSize * 100) / 100;
        }

        // Forex/Futures/Indices: P&L = priceDiff * positionSize * pipPointValue
        if (pipPointValue) {
            // For forex, priceDiff is in pips (need to convert based on instrument)
            // Simplified: assume pipPointValue already accounts for pip size
            return Math.round(priceDiff * positionSize * pipPointValue * 100) / 100;
        }

        return null;
    }

    // Calculate position size from risk parameters
    function calculatePositionSizeFromRisk(accountBalance, riskPct, entry, stopLoss, pipPointValue, marketType) {
        if (!accountBalance || !riskPct || !entry || !stopLoss) return null;

        const riskAmount = accountBalance * (riskPct / 100);
        const slDistance = Math.abs(entry - stopLoss);

        if (slDistance === 0) return null;

        // Stocks/Crypto: shares = riskAmount / slDistance
        if (marketType === 'STOCKS' || marketType === 'CRYPTO') {
            return Math.round((riskAmount / slDistance) * 100) / 100;
        }

        // Forex/Futures: lots = riskAmount / (slDistance * pipPointValue)
        if (pipPointValue && pipPointValue > 0) {
            return Math.round((riskAmount / (slDistance * pipPointValue)) * 100) / 100;
        }

        return null;
    }

    // Get position size value from trade based on market type
    function getPositionSize(trade) {
        const config = MARKET_FIELD_CONFIG[trade.market_type];
        if (!config) return null;
        return trade[config.positionSizeField] || null;
    }

    // Get pip/point value from trade based on market type
    function getPipPointValue(trade) {
        const config = MARKET_FIELD_CONFIG[trade.market_type];
        if (!config || !config.pipPointField) return null;
        return trade[config.pipPointField] || config.defaultPipValue || null;
    }

    return {
        TRADE_STATES, TRADE_STATUSES, DIRECTIONS, ENTRY_TYPES, EXIT_TYPES,
        MARKET_TYPES, SESSIONS, EMOTIONS, SETUP_STATUSES, ENFORCEMENT_LEVELS,
        MARKET_FIELD_CONFIG,
        validateTrade, hasRequiredFields, validateStateTransition,
        calculateRR, calculateActualRR, determineTradeStatus,
        calculatePnL, calculatePositionSizeFromRisk, getPositionSize, getPipPointValue,
        validateSchema, generateTradeId, generateId
    };
})();
