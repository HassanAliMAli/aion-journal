/**
 * AION Journal OS - Market Engine
 * Pip, tick, contract, and position size calculations for all market types
 */

const AionMarketEngine = (function () {
    'use strict';

    const MARKET_CONFIG = {
        FOREX: {
            EURUSD: { pipValue: 0.0001, pipDecimal: 4, contractSize: 100000, minLot: 0.01, pipValuePerLot: 10 },
            GBPUSD: { pipValue: 0.0001, pipDecimal: 4, contractSize: 100000, minLot: 0.01, pipValuePerLot: 10 },
            USDJPY: { pipValue: 0.01, pipDecimal: 2, contractSize: 100000, minLot: 0.01, pipValuePerLot: 9.1 },
            GBPJPY: { pipValue: 0.01, pipDecimal: 2, contractSize: 100000, minLot: 0.01, pipValuePerLot: 9.1 },
            XAUUSD: { pipValue: 0.01, pipDecimal: 2, contractSize: 100, minLot: 0.01, pipValuePerLot: 1 },
            DEFAULT: { pipValue: 0.0001, pipDecimal: 4, contractSize: 100000, minLot: 0.01, pipValuePerLot: 10 }
        },
        INDICES: {
            NQ: { tickValue: 0.25, tickDecimal: 2, contractSize: 1, tickValuePerContract: 5 },
            ES: { tickValue: 0.25, tickDecimal: 2, contractSize: 1, tickValuePerContract: 12.5 },
            YM: { tickValue: 1, tickDecimal: 0, contractSize: 1, tickValuePerContract: 5 },
            DAX: { tickValue: 0.5, tickDecimal: 1, contractSize: 1, tickValuePerContract: 12.5 },
            US30: { tickValue: 1, tickDecimal: 0, contractSize: 1, tickValuePerContract: 1 },
            NAS100: { tickValue: 0.25, tickDecimal: 2, contractSize: 1, tickValuePerContract: 0.25 },
            DEFAULT: { tickValue: 1, tickDecimal: 2, contractSize: 1, tickValuePerContract: 1 }
        },
        CRYPTO: {
            BTCUSD: { tickValue: 0.5, tickDecimal: 2, contractSize: 1, valuePerPoint: 1 },
            ETHUSD: { tickValue: 0.01, tickDecimal: 2, contractSize: 1, valuePerPoint: 1 },
            DEFAULT: { tickValue: 0.01, tickDecimal: 2, contractSize: 1, valuePerPoint: 1 }
        },
        FUTURES: {
            CL: { tickValue: 0.01, tickDecimal: 2, contractSize: 1000, tickValuePerContract: 10 },
            GC: { tickValue: 0.1, tickDecimal: 2, contractSize: 100, tickValuePerContract: 10 },
            DEFAULT: { tickValue: 0.01, tickDecimal: 2, contractSize: 1, tickValuePerContract: 1 }
        },
        STOCKS: {
            DEFAULT: { tickValue: 0.01, tickDecimal: 2, shareSize: 1, valuePerShare: 1 }
        }
    };

    function getMarketConfig(marketType, instrument) {
        const market = MARKET_CONFIG[marketType] || MARKET_CONFIG.FOREX;
        const normalized = instrument?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEFAULT';
        return market[normalized] || market.DEFAULT;
    }

    function calculatePips(entry, exit, instrument, marketType) {
        const config = getMarketConfig(marketType, instrument);
        const diff = Math.abs(exit - entry);
        if (marketType === 'FOREX') {
            return Math.round(diff / config.pipValue);
        }
        return diff;
    }

    function calculatePipValue(instrument, marketType, lotSize = 1) {
        const config = getMarketConfig(marketType, instrument);
        if (marketType === 'FOREX') {
            return config.pipValuePerLot * lotSize;
        } else if (marketType === 'INDICES' || marketType === 'FUTURES') {
            return config.tickValuePerContract * lotSize;
        }
        return config.valuePerPoint || 1;
    }

    function calculatePositionSize(riskAmount, stopLossPips, instrument, marketType) {
        const pipValue = calculatePipValue(instrument, marketType, 1);
        if (stopLossPips <= 0 || pipValue <= 0) return 0;
        const rawSize = riskAmount / (stopLossPips * pipValue);
        const config = getMarketConfig(marketType, instrument);
        const minLot = config.minLot || 0.01;
        return Math.floor(rawSize / minLot) * minLot;
    }

    function calculateRiskFromPosition(positionSize, stopLossPips, instrument, marketType) {
        const pipValue = calculatePipValue(instrument, marketType, positionSize);
        return stopLossPips * pipValue;
    }

    function formatPrice(price, instrument, marketType) {
        const config = getMarketConfig(marketType, instrument);
        const decimals = config.pipDecimal || config.tickDecimal || 2;
        return parseFloat(price).toFixed(decimals);
    }

    function getPriceIncrement(instrument, marketType) {
        const config = getMarketConfig(marketType, instrument);
        return config.pipValue || config.tickValue || 0.01;
    }

    function getSessionTimes() {
        return {
            ASIA: { start: '00:00', end: '09:00', utcOffset: 0 },
            LONDON: { start: '07:00', end: '16:00', utcOffset: 0 },
            NEW_YORK: { start: '12:00', end: '21:00', utcOffset: 0 },
            OVERLAP_LONDON_NY: { start: '12:00', end: '16:00', utcOffset: 0 }
        };
    }

    function getCurrentSession() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const sessions = getSessionTimes();

        for (const [name, times] of Object.entries(sessions)) {
            const startHour = parseInt(times.start.split(':')[0]);
            const endHour = parseInt(times.end.split(':')[0]);
            if (utcHour >= startHour && utcHour < endHour) {
                return name;
            }
        }
        return 'OFF_HOURS';
    }



    function buildTradeName(instrument, session, direction, setup, entryType) {
        const parts = [];
        if (instrument) parts.push(instrument.toUpperCase());
        if (session) parts.push(session.replace(/_/g, ' '));
        if (direction) parts.push(direction);
        if (setup) parts.push(setup.replace(/[-_]/g, ' '));
        if (entryType) parts.push(entryType);
        return parts.join(' ');
    }

    function generateTradeNameOptions(trade, setups) {
        const options = [];
        const setup = setups?.find(s => s.setup_id === trade.setup_id);
        const setupName = setup?.setup_name || '';

        if (trade.instrument && trade.direction) {
            options.push(`${trade.instrument} ${trade.direction}`);
        }
        if (trade.instrument && trade.session && trade.direction) {
            options.push(`${trade.instrument} ${trade.session} ${trade.direction}`);
        }
        if (trade.instrument && trade.session && trade.direction && setupName) {
            options.push(`${trade.instrument} ${trade.session} ${trade.direction} ${setupName}`);
        }
        if (trade.instrument && setupName) {
            options.push(`${trade.instrument} ${setupName}`);
        }

        return options;
    }

    return {
        getMarketConfig,
        calculatePips,
        calculatePipValue,
        calculatePositionSize,
        calculateRiskFromPosition,

        formatPrice,
        getPriceIncrement,
        getSessionTimes,
        getCurrentSession,
        buildTradeName,
        generateTradeNameOptions,
        MARKET_CONFIG
    };
})();
