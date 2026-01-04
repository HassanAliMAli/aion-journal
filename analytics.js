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
            maxDrawdown: drawdown.maxDrawdown,
            maxDrawdownPct: drawdown.maxDrawdownPct,
            profitFactor: calculateProfitFactor(trades),
            expectancy: calculateExpectancy(trades),
            invalidCount: countInvalidTrades(trades),
            incompleteCount: countIncompleteTrades(trades)
        };
    }

    return {
        calculateEquityCurve, calculateDrawdown, calculateWinRate, calculateWinRateByGroup,
        calculateRRDistribution, calculateAverageRR, calculateProfitFactor, calculateExpectancy,
        getTradesByPeriod, countViolationsByRule, countInvalidTrades, countIncompleteTrades,
        getPerformanceSummary
    };
})();
