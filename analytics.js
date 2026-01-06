/**
 * AION Journal OS - Analytics Calculation Engine
 */

const AionAnalytics = (function () {
    'use strict';

    function calculateEquityCurve(trades, startingBalance) {
        const closedTrades = trades
            .filter(t => t.trade_state === 'CLOSED' && t.net_pl !== undefined)
            .sort((a, b) => new Date(a.exit_time_utc) - new Date(b.exit_time_utc));

        let balance = startingBalance || 0;
        const curve = [{ date: null, balance: startingBalance, trade: null }];

        closedTrades.forEach(trade => {
            balance += trade.net_pl;
            curve.push({
                date: trade.exit_time_utc,
                balance: Math.round(balance * 100) / 100,
                trade: trade.trade_id
            });
        });

        return curve;
    }

    function calculateDrawdown(equityCurve) {
        let peak = equityCurve[0]?.balance || 0;
        let maxDrawdown = 0;
        let maxDrawdownPct = 0;
        let currentDrawdown = 0;

        equityCurve.forEach(point => {
            if (point.balance > peak) peak = point.balance;
            currentDrawdown = peak - point.balance;
            const drawdownPct = peak > 0 ? (currentDrawdown / peak) * 100 : 0;
            if (drawdownPct > maxDrawdownPct) {
                maxDrawdown = currentDrawdown;
                maxDrawdownPct = drawdownPct;
            }
        });

        return { maxDrawdown, maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100, currentDrawdown };
    }

    function calculateWinRate(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED');
        if (closed.length === 0) return { winRate: 0, wins: 0, losses: 0, breakeven: 0, total: 0 };

        const wins = closed.filter(t => t.trade_status === 'WIN').length;
        const losses = closed.filter(t => t.trade_status === 'LOSS').length;
        const breakeven = closed.filter(t => t.trade_status === 'BREAKEVEN').length;

        return {
            winRate: Math.round((wins / closed.length) * 10000) / 100,
            wins, losses, breakeven, total: closed.length
        };
    }

    function calculateWinRateByGroup(trades, groupField) {
        const groups = {};
        const closed = trades.filter(t => t.trade_state === 'CLOSED');

        closed.forEach(trade => {
            const key = trade[groupField] || 'Unknown';
            if (!groups[key]) groups[key] = { wins: 0, losses: 0, breakeven: 0, total: 0 };
            groups[key].total++;
            if (trade.trade_status === 'WIN') groups[key].wins++;
            else if (trade.trade_status === 'LOSS') groups[key].losses++;
            else groups[key].breakeven++;
        });

        Object.keys(groups).forEach(key => {
            groups[key].winRate = groups[key].total > 0
                ? Math.round((groups[key].wins / groups[key].total) * 10000) / 100
                : 0;
        });

        return groups;
    }

    function calculateRRDistribution(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.actual_rr !== undefined);
        const distribution = { '<-2R': 0, '-2R to -1R': 0, '-1R to 0': 0, '0 to 1R': 0, '1R to 2R': 0, '2R to 3R': 0, '>3R': 0 };

        closed.forEach(trade => {
            const rr = trade.actual_rr;
            if (rr < -2) distribution['<-2R']++;
            else if (rr < -1) distribution['-2R to -1R']++;
            else if (rr < 0) distribution['-1R to 0']++;
            else if (rr < 1) distribution['0 to 1R']++;
            else if (rr < 2) distribution['1R to 2R']++;
            else if (rr < 3) distribution['2R to 3R']++;
            else distribution['>3R']++;
        });

        return distribution;
    }

    function calculateAverageRR(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.actual_rr !== undefined);
        if (closed.length === 0) return { avgRR: 0, avgWinRR: 0, avgLossRR: 0 };

        const total = closed.reduce((sum, t) => sum + t.actual_rr, 0);
        const wins = closed.filter(t => t.trade_status === 'WIN');
        const losses = closed.filter(t => t.trade_status === 'LOSS');

        return {
            avgRR: Math.round((total / closed.length) * 100) / 100,
            avgWinRR: wins.length > 0 ? Math.round((wins.reduce((s, t) => s + t.actual_rr, 0) / wins.length) * 100) / 100 : 0,
            avgLossRR: losses.length > 0 ? Math.round((losses.reduce((s, t) => s + t.actual_rr, 0) / losses.length) * 100) / 100 : 0
        };
    }

    function calculateProfitFactor(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.net_pl !== undefined);
        const grossProfit = closed.filter(t => t.net_pl > 0).reduce((s, t) => s + t.net_pl, 0);
        const grossLoss = Math.abs(closed.filter(t => t.net_pl < 0).reduce((s, t) => s + t.net_pl, 0));
        return grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0;
    }

    function calculateExpectancy(trades) {
        const stats = calculateWinRate(trades);
        const rrStats = calculateAverageRR(trades);
        if (stats.total === 0) return 0;
        const winProb = stats.winRate / 100;
        const lossProb = 1 - winProb;
        return Math.round((winProb * rrStats.avgWinRR + lossProb * rrStats.avgLossRR) * 100) / 100;
    }

    function getTradesByPeriod(trades, period = 'day') {
        const groups = {};
        trades.forEach(trade => {
            if (!trade.date_utc) return;
            let key;
            const date = new Date(trade.date_utc);
            if (period === 'day') key = trade.date_utc.split('T')[0];
            else if (period === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (period === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            else key = trade.date_utc.split('T')[0];

            if (!groups[key]) groups[key] = [];
            groups[key].push(trade);
        });
        return groups;
    }

    function countViolationsByRule(violations) {
        const counts = {};
        violations.forEach(v => {
            counts[v.rule_breached] = (counts[v.rule_breached] || 0) + 1;
        });
        return counts;
    }

    function countInvalidTrades(trades) {
        return trades.filter(t => t.trade_state === 'INVALID').length;
    }

    function countIncompleteTrades(trades) {
        return trades.filter(t => t.trade_state === 'INCOMPLETE').length;
    }

    function calculatePsychometrics(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED');
        const emotions = {};

        // Initialize with all known emotions
        const EMOTIONS = ['CALM', 'CONFIDENT', 'ANXIOUS', 'FEARFUL', 'GREEDY', 'FRUSTRATED', 'EUPHORIC', 'NEUTRAL'];
        EMOTIONS.forEach(e => emotions[e] = { wins: 0, total: 0, winRate: 0, avgPnl: 0 });

        closed.forEach(t => {
            const e = t.pre_trade_emotion;
            if (e && emotions[e]) {
                emotions[e].total++;
                if (t.trade_status === 'WIN') emotions[e].wins++;
            }
        });

        // Calculate rates
        EMOTIONS.forEach(e => {
            if (emotions[e].total > 0) {
                emotions[e].winRate = Math.round((emotions[e].wins / emotions[e].total) * 100);
            }
        });

        return emotions;
    }

    function calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    function calculateSharpeRatio(trades, riskFreeRate = 0) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.net_pl !== undefined);
        if (closed.length < 2) return 0;

        // Use R-multiples for standardization if available, else PnL (normalized usually better)
        // For simplicity and robustness here, we'll use returns (PnL).
        // Ideally Sharpe is periodic returns, here we approximate with per-trade distribution
        const returns = closed.map(t => t.net_pl);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdDev = calculateStandardDeviation(returns);

        return stdDev === 0 ? 0 : Math.round(((avgReturn - riskFreeRate) / stdDev) * 100) / 100;
    }

    function calculateSortinoRatio(trades, targetReturn = 0) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.net_pl !== undefined);
        if (closed.length < 2) return 0;

        const returns = closed.map(t => t.net_pl);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

        const downside = returns.filter(r => r < targetReturn).map(r => Math.pow(r - targetReturn, 2));
        const downsideDev = downside.length > 0 ? Math.sqrt(downside.reduce((s, d) => s + d, 0) / returns.length) : 0;

        return downsideDev === 0 ? 0 : Math.round(((avgReturn - targetReturn) / downsideDev) * 100) / 100;
    }

    function calculateSQN(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && t.net_pl !== undefined);
        if (closed.length < 10) return 0; // SQN requires sample size

        // SQN = SquareRoot(N) * (Expectancy / StdDev)
        // Note: Van Tharp uses R-multiples for this usually. We will use proper Expectancy function logic.
        const stats = calculateExpectancy(trades); // This returns expected R
        // We need StdDev of R-multiples
        const rMultiples = closed.map(t => t.actual_rr || 0);
        const stdDevR = calculateStandardDeviation(rMultiples);

        if (stdDevR === 0) return 0;
        return Math.round((Math.sqrt(closed.length) * (stats / stdDevR)) * 100) / 100;
    }

    function calculateCAGR(trades, startingBalance, startDate) {
        if (!startingBalance || startingBalance <= 0 || trades.length === 0) return 0;

        const sorted = trades.filter(t => t.trade_state === 'CLOSED' && t.exit_time_utc)
            .sort((a, b) => new Date(a.exit_time_utc) - new Date(b.exit_time_utc));

        if (sorted.length === 0) return 0;

        const lastTrade = sorted[sorted.length - 1];
        const endBalance = startingBalance + trades.reduce((sum, t) => sum + (t.net_pl || 0), 0);

        // Calculate years duration
        const start = startDate ? new Date(startDate) : new Date(sorted[0].entry_date);
        const end = new Date(lastTrade.exit_time_utc);
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);

        if (years <= 0) return 0;

        // PMI = (End / Start)^(1/n) - 1
        return Math.round((Math.pow(endBalance / startingBalance, 1 / years) - 1) * 10000) / 100;
    }

    function calculateStreak(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED').sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
        if (closed.length === 0) return { type: 'NONE', count: 0 };

        const firstType = closed[0].trade_status; // WIN, LOSS, BE
        let count = 0;

        for (const t of closed) {
            if (t.trade_status === firstType) count++;
            else break;
        }

        return { type: firstType, count };
    }

    function getPerformanceSummary(trades, startingBalance) {
        const curve = calculateEquityCurve(trades, startingBalance);
        const drawdown = calculateDrawdown(curve);
        const winRate = calculateWinRate(trades);
        const rrStats = calculateAverageRR(trades);

        return {
            currentBalance: curve[curve.length - 1]?.balance || startingBalance,
            totalPnL: (curve[curve.length - 1]?.balance || startingBalance) - startingBalance,
            ...winRate,
            ...rrStats,
            maxDrawdown: drawdown.maxDrawdown || 0,
            maxDrawdownPct: drawdown.maxDrawdownPct || 0,
            profitFactor: calculateProfitFactor(trades) || 0,
            expectancy: calculateExpectancy(trades) || 0,
            sharpe: calculateSharpeRatio(trades) || 0,
            sortino: calculateSortinoRatio(trades) || 0,
            sqn: calculateSQN(trades) || 0,
            cagr: calculateCAGR(trades, startingBalance) || 0,
            streak: calculateStreak(trades) || { type: 'NONE', count: 0 },
            invalidCount: countInvalidTrades(trades) || 0,
            incompleteCount: countIncompleteTrades(trades)
        };
    }

    function calculateTimeStats(trades) {
        const closed = trades.filter(t => t.trade_state === 'CLOSED' && (t.entry_time_utc || t.entry_date) && t.exit_time_utc);
        if (closed.length === 0) return null;

        let totalDuration = 0;
        let winDuration = 0;
        let lossDuration = 0;
        let winCount = 0;
        let lossCount = 0;
        const buckets = { '<15m': 0, '15m-1h': 0, '1h-4h': 0, '4h-24h': 0, '>1d': 0 };

        closed.forEach(t => {
            const start = new Date(t.entry_time_utc || t.entry_date);
            const end = new Date(t.exit_time_utc);
            const durationHrs = (end - start) / (1000 * 60 * 60);

            if (durationHrs < 0) return; // Skip invalid dates

            totalDuration += durationHrs;

            if (t.trade_status === 'WIN') { winDuration += durationHrs; winCount++; }
            if (t.trade_status === 'LOSS') { lossDuration += durationHrs; lossCount++; }

            if (durationHrs < 0.25) buckets['<15m']++;
            else if (durationHrs < 1) buckets['15m-1h']++;
            else if (durationHrs < 4) buckets['1h-4h']++;
            else if (durationHrs < 24) buckets['4h-24h']++;
            else buckets['>1d']++;
        });

        const totalPnL = closed.reduce((sum, t) => sum + (t.net_pl || 0), 0);

        return {
            avgHoldTime: totalDuration / closed.length,
            avgWinHold: winCount > 0 ? winDuration / winCount : 0,
            avgLossHold: lossCount > 0 ? lossDuration / lossCount : 0,
            pnlPerHour: totalDuration > 0 ? totalPnL / totalDuration : 0,
            buckets
        };
    }

    return {
        calculateEquityCurve, calculateDrawdown, calculateWinRate, calculateWinRateByGroup,
        calculateRRDistribution, calculateAverageRR, calculateProfitFactor, calculateExpectancy,
        calculateSharpeRatio, calculateSortinoRatio, calculateSQN, calculateCAGR,
        getTradesByPeriod, countViolationsByRule, countInvalidTrades, countIncompleteTrades,
        getPerformanceSummary, calculatePsychometrics, calculateStreak, calculateTimeStats
    };
})();
