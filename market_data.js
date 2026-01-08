/**
 * AION Journal OS - Market Data (Instruments, Pip Values)
 */

const AionMarketData = (function () {
    'use strict';

    // ============================================
    // FOREX PAIRS (Major, Minor, Exotic)
    // ============================================
    const FOREX_PAIRS = [
        // Major Pairs
        { value: 'EURUSD', label: 'EUR/USD', pipValue: 10 },
        { value: 'GBPUSD', label: 'GBP/USD', pipValue: 10 },
        { value: 'USDJPY', label: 'USD/JPY', pipValue: 8.5 },
        { value: 'USDCHF', label: 'USD/CHF', pipValue: 10 },
        { value: 'AUDUSD', label: 'AUD/USD', pipValue: 10 },
        { value: 'USDCAD', label: 'USD/CAD', pipValue: 7.5 },
        { value: 'NZDUSD', label: 'NZD/USD', pipValue: 10 },
        // Minor Pairs
        { value: 'EURGBP', label: 'EUR/GBP', pipValue: 12.5 },
        { value: 'EURJPY', label: 'EUR/JPY', pipValue: 8.5 },
        { value: 'GBPJPY', label: 'GBP/JPY', pipValue: 8.5 },
        { value: 'AUDJPY', label: 'AUD/JPY', pipValue: 8.5 },
        { value: 'CADJPY', label: 'CAD/JPY', pipValue: 8.5 },
        { value: 'CHFJPY', label: 'CHF/JPY', pipValue: 8.5 },
        { value: 'NZDJPY', label: 'NZD/JPY', pipValue: 8.5 },
        { value: 'EURAUD', label: 'EUR/AUD', pipValue: 6.5 },
        { value: 'EURCHF', label: 'EUR/CHF', pipValue: 10 },
        { value: 'EURCAD', label: 'EUR/CAD', pipValue: 7.5 },
        { value: 'EURNZD', label: 'EUR/NZD', pipValue: 6 },
        { value: 'GBPAUD', label: 'GBP/AUD', pipValue: 6.5 },
        { value: 'GBPCHF', label: 'GBP/CHF', pipValue: 10 },
        { value: 'GBPCAD', label: 'GBP/CAD', pipValue: 7.5 },
        { value: 'GBPNZD', label: 'GBP/NZD', pipValue: 6 },
        { value: 'AUDCHF', label: 'AUD/CHF', pipValue: 10 },
        { value: 'AUDCAD', label: 'AUD/CAD', pipValue: 7.5 },
        { value: 'AUDNZD', label: 'AUD/NZD', pipValue: 6 },
        { value: 'CADCHF', label: 'CAD/CHF', pipValue: 10 },
        { value: 'NZDCAD', label: 'NZD/CAD', pipValue: 7.5 },
        { value: 'NZDCHF', label: 'NZD/CHF', pipValue: 10 },
        // Exotic Pairs
        { value: 'USDZAR', label: 'USD/ZAR', pipValue: 0.55 },
        { value: 'USDMXN', label: 'USD/MXN', pipValue: 0.55 },
        { value: 'USDTRY', label: 'USD/TRY', pipValue: 0.35 },
        { value: 'USDSEK', label: 'USD/SEK', pipValue: 0.95 },
        { value: 'USDNOK', label: 'USD/NOK', pipValue: 0.95 },
        { value: 'USDDKK', label: 'USD/DKK', pipValue: 1.45 },
        { value: 'USDSGD', label: 'USD/SGD', pipValue: 7.5 },
        { value: 'USDHKD', label: 'USD/HKD', pipValue: 1.3 },
        { value: 'USDPLN', label: 'USD/PLN', pipValue: 2.5 },
        { value: 'USDHUF', label: 'USD/HUF', pipValue: 0.03 },
        { value: 'USDCZK', label: 'USD/CZK', pipValue: 0.45 },
        { value: 'EURTRY', label: 'EUR/TRY', pipValue: 0.35 },
        { value: 'EURZAR', label: 'EUR/ZAR', pipValue: 0.55 },
        { value: 'EURMXN', label: 'EUR/MXN', pipValue: 0.55 },
        { value: 'EURSEK', label: 'EUR/SEK', pipValue: 0.95 },
        { value: 'EURNOK', label: 'EUR/NOK', pipValue: 0.95 },
        { value: 'EURPLN', label: 'EUR/PLN', pipValue: 2.5 },
        { value: 'GBPZAR', label: 'GBP/ZAR', pipValue: 0.55 },
        { value: 'GBPTRY', label: 'GBP/TRY', pipValue: 0.35 },
        { value: 'GBPSEK', label: 'GBP/SEK', pipValue: 0.95 },
        { value: 'GBPNOK', label: 'GBP/NOK', pipValue: 0.95 },
        // Gold/Silver (XAU/XAG)
        { value: 'XAUUSD', label: 'XAU/USD (Gold)', pipValue: 1 },
        { value: 'XAGUSD', label: 'XAG/USD (Silver)', pipValue: 0.5 },
        { value: 'XAUEUR', label: 'XAU/EUR', pipValue: 1 },
        { value: 'XAUGBP', label: 'XAU/GBP', pipValue: 1 }
    ];

    // ============================================
    // CRYPTO PAIRS (Top 250)
    // ============================================
    const CRYPTO_PAIRS = [
        // Top 50 by market cap
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT',
        'ADA/USDT', 'DOGE/USDT', 'TRX/USDT', 'AVAX/USDT', 'SHIB/USDT',
        'DOT/USDT', 'LINK/USDT', 'BCH/USDT', 'NEAR/USDT', 'MATIC/USDT',
        'LTC/USDT', 'UNI/USDT', 'PEPE/USDT', 'ICP/USDT', 'APT/USDT',
        'ETC/USDT', 'FIL/USDT', 'ATOM/USDT', 'HBAR/USDT', 'IMX/USDT',
        'XLM/USDT', 'OP/USDT', 'ARB/USDT', 'INJ/USDT', 'VET/USDT',
        'MKR/USDT', 'GRT/USDT', 'THETA/USDT', 'RUNE/USDT', 'FTM/USDT',
        'ALGO/USDT', 'AAVE/USDT', 'SEI/USDT', 'FLOW/USDT', 'SAND/USDT',
        'AXS/USDT', 'GALA/USDT', 'XTZ/USDT', 'MANA/USDT', 'EOS/USDT',
        'SNX/USDT', 'EGLD/USDT', 'KAVA/USDT', 'CHZ/USDT', 'CRV/USDT',
        // 51-100
        'LDO/USDT', 'QNT/USDT', 'RNDR/USDT', 'MINA/USDT', 'SUI/USDT',
        'FLR/USDT', 'LUNC/USDT', 'CFX/USDT', 'CAKE/USDT', 'ZIL/USDT',
        'ROSE/USDT', 'ENJ/USDT', 'ONE/USDT', 'GMT/USDT', 'DYDX/USDT',
        'BLUR/USDT', 'WOO/USDT', 'CELO/USDT', 'KLAY/USDT', 'ZRX/USDT',
        '1INCH/USDT', 'COMP/USDT', 'BAT/USDT', 'DASH/USDT', 'ZEC/USDT',
        'YFI/USDT', 'LUNA/USDT', 'CVX/USDT', 'MASK/USDT', 'IOTA/USDT',
        'NEO/USDT', 'WAVES/USDT', 'RSR/USDT', 'OCEAN/USDT', 'ICX/USDT',
        'QTUM/USDT', 'ONT/USDT', 'ZEN/USDT', 'KSM/USDT', 'HNT/USDT',
        'ANKR/USDT', 'STORJ/USDT', 'RVN/USDT', 'SKL/USDT', 'NKN/USDT',
        'CELR/USDT', 'COTI/USDT', 'HOT/USDT', 'DENT/USDT', 'WIN/USDT',
        // 101-150
        'FET/USDT', 'AGIX/USDT', 'FLOKI/USDT', 'WLD/USDT', 'TIA/USDT',
        'ORDI/USDT', 'JTO/USDT', 'ARKM/USDT', 'PENDLE/USDT', 'STX/USDT',
        'TWT/USDT', 'GMX/USDT', 'SSV/USDT', 'RPL/USDT', 'API3/USDT',
        'BAND/USDT', 'SUSHI/USDT', 'UMA/USDT', 'REN/USDT', 'BNT/USDT',
        'AUDIO/USDT', 'RAY/USDT', 'SRM/USDT', 'SPELL/USDT', 'TRIBE/USDT',
        'LOOKS/USDT', 'X2Y2/USDT', 'MAGIC/USDT', 'RDNT/USDT', 'VELA/USDT',
        'HFT/USDT', 'HIGH/USDT', 'HOOK/USDT', 'ID/USDT', 'EDU/USDT',
        'CYBER/USDT', 'COMBO/USDT', 'MAV/USDT', 'LQTY/USDT', 'LEVER/USDT',
        'PERP/USDT', 'ACH/USDT', 'PHB/USDT', 'PUNDIX/USDT', 'KEY/USDT',
        'POND/USDT', 'ALICE/USDT', 'SUPER/USDT', 'BICO/USDT', 'CLV/USDT',
        // 151-200
        'FORTH/USDT', 'RARE/USDT', 'VGX/USDT', 'BETA/USDT', 'LOOM/USDT',
        'BURGER/USDT', 'SFP/USDT', 'WING/USDT', 'ALPACA/USDT', 'DF/USDT',
        'DODO/USDT', 'BADGER/USDT', 'ERN/USDT', 'FIDA/USDT', 'BOND/USDT',
        'TRU/USDT', 'MLN/USDT', 'OGN/USDT', 'POLS/USDT', 'OM/USDT',
        'QUICK/USDT', 'TVK/USDT', 'FARM/USDT', 'ALCX/USDT', 'CTK/USDT',
        'ARPA/USDT', 'GTC/USDT', 'MIR/USDT', 'NMR/USDT', 'REQ/USDT',
        'STMX/USDT', 'MTL/USDT', 'DOCK/USDT', 'DREP/USDT', 'SUN/USDT',
        'IDEX/USDT', 'CHESS/USDT', 'ATA/USDT', 'MOVR/USDT', 'KP3R/USDT',
        'DEGO/USDT', 'PROM/USDT', 'RAMP/USDT', 'MDT/USDT', 'FIRO/USDT',
        'IRIS/USDT', 'HIVE/USDT', 'STEEM/USDT', 'FIO/USDT', 'AKRO/USDT',
        // 201-250
        'TROY/USDT', 'HARD/USDT', 'UNFI/USDT', 'LINA/USDT', 'SLP/USDT',
        'PEOPLE/USDT', 'GLMR/USDT', 'ASTR/USDT', 'MC/USDT', 'GAL/USDT',
        'BSW/USDT', 'DAR/USDT', 'PYR/USDT', 'SANTOS/USDT', 'PORTO/USDT',
        'LAZIO/USDT', 'ATM/USDT', 'ASR/USDT', 'JUV/USDT', 'PSG/USDT',
        'CITY/USDT', 'BAR/USDT', 'ACM/USDT', 'OG/USDT', 'ALPINE/USDT',
        'AMB/USDT', 'BAKE/USDT', 'CREAM/USDT', 'REEF/USDT', 'TORN/USDT',
        'JASMY/USDT', 'AION/USDT', 'WAN/USDT', 'GRS/USDT', 'BEAM/USDT',
        'VITE/USDT', 'SNT/USDT', 'POWR/USDT', 'BLZ/USDT', 'CVC/USDT',
        'TNB/USDT', 'STPT/USDT', 'PERL/USDT', 'COS/USDT', 'CTXC/USDT',
        'DATA/USDT', 'PIVX/USDT', 'NULS/USDT', 'NAS/USDT', 'ARDR/USDT'
    ].map(p => ({ value: p.replace('/', ''), label: p }));

    // ============================================
    // STOCKS (Top US Stocks)
    // ============================================
    const STOCKS = [
        // Mega Cap Tech
        { value: 'AAPL', label: 'AAPL - Apple Inc.' },
        { value: 'MSFT', label: 'MSFT - Microsoft Corp.' },
        { value: 'GOOGL', label: 'GOOGL - Alphabet Inc.' },
        { value: 'AMZN', label: 'AMZN - Amazon.com Inc.' },
        { value: 'NVDA', label: 'NVDA - NVIDIA Corp.' },
        { value: 'META', label: 'META - Meta Platforms Inc.' },
        { value: 'TSLA', label: 'TSLA - Tesla Inc.' },
        { value: 'AVGO', label: 'AVGO - Broadcom Inc.' },
        { value: 'AMD', label: 'AMD - Advanced Micro Devices' },
        { value: 'NFLX', label: 'NFLX - Netflix Inc.' },
        { value: 'ADBE', label: 'ADBE - Adobe Inc.' },
        { value: 'CRM', label: 'CRM - Salesforce Inc.' },
        { value: 'ORCL', label: 'ORCL - Oracle Corp.' },
        { value: 'CSCO', label: 'CSCO - Cisco Systems' },
        { value: 'INTC', label: 'INTC - Intel Corp.' },
        { value: 'IBM', label: 'IBM - IBM Corp.' },
        { value: 'QCOM', label: 'QCOM - Qualcomm Inc.' },
        { value: 'TXN', label: 'TXN - Texas Instruments' },
        { value: 'NOW', label: 'NOW - ServiceNow Inc.' },
        { value: 'INTU', label: 'INTU - Intuit Inc.' },
        // Finance
        { value: 'BRK.B', label: 'BRK.B - Berkshire Hathaway' },
        { value: 'JPM', label: 'JPM - JPMorgan Chase' },
        { value: 'V', label: 'V - Visa Inc.' },
        { value: 'MA', label: 'MA - Mastercard Inc.' },
        { value: 'BAC', label: 'BAC - Bank of America' },
        { value: 'WFC', label: 'WFC - Wells Fargo' },
        { value: 'GS', label: 'GS - Goldman Sachs' },
        { value: 'MS', label: 'MS - Morgan Stanley' },
        { value: 'C', label: 'C - Citigroup Inc.' },
        { value: 'BLK', label: 'BLK - BlackRock Inc.' },
        { value: 'SCHW', label: 'SCHW - Charles Schwab' },
        { value: 'AXP', label: 'AXP - American Express' },
        { value: 'PYPL', label: 'PYPL - PayPal Holdings' },
        { value: 'SQ', label: 'SQ - Block Inc.' },
        // Healthcare
        { value: 'UNH', label: 'UNH - UnitedHealth Group' },
        { value: 'JNJ', label: 'JNJ - Johnson & Johnson' },
        { value: 'LLY', label: 'LLY - Eli Lilly' },
        { value: 'PFE', label: 'PFE - Pfizer Inc.' },
        { value: 'ABBV', label: 'ABBV - AbbVie Inc.' },
        { value: 'MRK', label: 'MRK - Merck & Co.' },
        { value: 'TMO', label: 'TMO - Thermo Fisher' },
        { value: 'ABT', label: 'ABT - Abbott Labs' },
        { value: 'DHR', label: 'DHR - Danaher Corp.' },
        { value: 'BMY', label: 'BMY - Bristol-Myers Squibb' },
        // Consumer
        { value: 'WMT', label: 'WMT - Walmart Inc.' },
        { value: 'PG', label: 'PG - Procter & Gamble' },
        { value: 'KO', label: 'KO - Coca-Cola Co.' },
        { value: 'PEP', label: 'PEP - PepsiCo Inc.' },
        { value: 'COST', label: 'COST - Costco Wholesale' },
        { value: 'HD', label: 'HD - Home Depot' },
        { value: 'MCD', label: 'MCD - McDonalds Corp.' },
        { value: 'NKE', label: 'NKE - Nike Inc.' },
        { value: 'DIS', label: 'DIS - Walt Disney Co.' },
        { value: 'SBUX', label: 'SBUX - Starbucks Corp.' },
        { value: 'TGT', label: 'TGT - Target Corp.' },
        { value: 'LOW', label: 'LOW - Lowes Companies' },
        // Energy
        { value: 'XOM', label: 'XOM - Exxon Mobil' },
        { value: 'CVX', label: 'CVX - Chevron Corp.' },
        { value: 'COP', label: 'COP - ConocoPhillips' },
        { value: 'SLB', label: 'SLB - Schlumberger' },
        { value: 'EOG', label: 'EOG - EOG Resources' },
        // Industrial
        { value: 'CAT', label: 'CAT - Caterpillar Inc.' },
        { value: 'BA', label: 'BA - Boeing Co.' },
        { value: 'HON', label: 'HON - Honeywell Intl' },
        { value: 'UPS', label: 'UPS - United Parcel Service' },
        { value: 'RTX', label: 'RTX - RTX Corp.' },
        { value: 'DE', label: 'DE - Deere & Company' },
        { value: 'GE', label: 'GE - General Electric' },
        { value: 'LMT', label: 'LMT - Lockheed Martin' },
        // EV & Clean Energy
        { value: 'RIVN', label: 'RIVN - Rivian Automotive' },
        { value: 'LCID', label: 'LCID - Lucid Group' },
        { value: 'NIO', label: 'NIO - NIO Inc.' },
        { value: 'XPEV', label: 'XPEV - XPeng Inc.' },
        { value: 'LI', label: 'LI - Li Auto Inc.' },
        { value: 'ENPH', label: 'ENPH - Enphase Energy' },
        { value: 'SEDG', label: 'SEDG - SolarEdge Tech' },
        // Meme/Popular
        { value: 'GME', label: 'GME - GameStop Corp.' },
        { value: 'AMC', label: 'AMC - AMC Entertainment' },
        { value: 'PLTR', label: 'PLTR - Palantir Tech' },
        { value: 'SOFI', label: 'SOFI - SoFi Technologies' },
        { value: 'HOOD', label: 'HOOD - Robinhood Markets' },
        { value: 'COIN', label: 'COIN - Coinbase Global' },
        { value: 'MSTR', label: 'MSTR - MicroStrategy' },
        { value: 'CHWY', label: 'CHWY - Chewy Inc.' },
        { value: 'SNOW', label: 'SNOW - Snowflake Inc.' },
        { value: 'CRWD', label: 'CRWD - CrowdStrike' },
        { value: 'ZS', label: 'ZS - Zscaler Inc.' },
        { value: 'DDOG', label: 'DDOG - Datadog Inc.' },
        { value: 'MDB', label: 'MDB - MongoDB Inc.' },
        { value: 'NET', label: 'NET - Cloudflare Inc.' },
        { value: 'U', label: 'U - Unity Software' },
        { value: 'RBLX', label: 'RBLX - Roblox Corp.' },
        { value: 'AFRM', label: 'AFRM - Affirm Holdings' },
        { value: 'UPST', label: 'UPST - Upstart Holdings' }
    ];

    // ============================================
    // FUTURES (Popular Contracts)
    // ============================================
    const FUTURES = [
        // Equity Index
        { value: 'ES', label: 'ES - E-mini S&P 500', pointValue: 50 },
        { value: 'NQ', label: 'NQ - E-mini Nasdaq 100', pointValue: 20 },
        { value: 'YM', label: 'YM - E-mini Dow', pointValue: 5 },
        { value: 'RTY', label: 'RTY - E-mini Russell 2000', pointValue: 50 },
        { value: 'MES', label: 'MES - Micro E-mini S&P 500', pointValue: 5 },
        { value: 'MNQ', label: 'MNQ - Micro E-mini Nasdaq', pointValue: 2 },
        { value: 'MYM', label: 'MYM - Micro E-mini Dow', pointValue: 0.5 },
        { value: 'M2K', label: 'M2K - Micro E-mini Russell', pointValue: 5 },
        // Energy
        { value: 'CL', label: 'CL - Crude Oil', pointValue: 1000 },
        { value: 'MCL', label: 'MCL - Micro Crude Oil', pointValue: 100 },
        { value: 'NG', label: 'NG - Natural Gas', pointValue: 10000 },
        { value: 'HO', label: 'HO - Heating Oil', pointValue: 42000 },
        { value: 'RB', label: 'RB - RBOB Gasoline', pointValue: 42000 },
        // Metals
        { value: 'GC', label: 'GC - Gold', pointValue: 100 },
        { value: 'MGC', label: 'MGC - Micro Gold', pointValue: 10 },
        { value: 'SI', label: 'SI - Silver', pointValue: 5000 },
        { value: 'SIL', label: 'SIL - Micro Silver', pointValue: 1000 },
        { value: 'HG', label: 'HG - Copper', pointValue: 25000 },
        { value: 'PL', label: 'PL - Platinum', pointValue: 50 },
        { value: 'PA', label: 'PA - Palladium', pointValue: 100 },
        // Agriculture
        { value: 'ZC', label: 'ZC - Corn', pointValue: 50 },
        { value: 'ZS', label: 'ZS - Soybeans', pointValue: 50 },
        { value: 'ZW', label: 'ZW - Wheat', pointValue: 50 },
        { value: 'ZL', label: 'ZL - Soybean Oil', pointValue: 600 },
        { value: 'ZM', label: 'ZM - Soybean Meal', pointValue: 100 },
        // Currencies
        { value: '6E', label: '6E - Euro FX', pointValue: 125000 },
        { value: '6B', label: '6B - British Pound', pointValue: 62500 },
        { value: '6J', label: '6J - Japanese Yen', pointValue: 12500000 },
        { value: '6A', label: '6A - Australian Dollar', pointValue: 100000 },
        { value: '6C', label: '6C - Canadian Dollar', pointValue: 100000 },
        { value: '6S', label: '6S - Swiss Franc', pointValue: 125000 },
        // Interest Rates
        { value: 'ZN', label: 'ZN - 10-Year T-Note', pointValue: 1000 },
        { value: 'ZB', label: 'ZB - 30-Year T-Bond', pointValue: 1000 },
        { value: 'ZF', label: 'ZF - 5-Year T-Note', pointValue: 1000 },
        { value: 'ZT', label: 'ZT - 2-Year T-Note', pointValue: 2000 },
        // VIX
        { value: 'VX', label: 'VX - VIX Futures', pointValue: 1000 }
    ];

    // ============================================
    // INDICES (CFDs/Spread Betting)
    // ============================================
    const INDICES = [
        { value: 'US500', label: 'US500 - S&P 500 Index', pointValue: 1 },
        { value: 'US100', label: 'US100 - Nasdaq 100 Index', pointValue: 1 },
        { value: 'US30', label: 'US30 - Dow Jones Index', pointValue: 1 },
        { value: 'UK100', label: 'UK100 - FTSE 100', pointValue: 1 },
        { value: 'GER40', label: 'GER40 - DAX 40', pointValue: 1 },
        { value: 'FRA40', label: 'FRA40 - CAC 40', pointValue: 1 },
        { value: 'JP225', label: 'JP225 - Nikkei 225', pointValue: 0.01 },
        { value: 'AUS200', label: 'AUS200 - ASX 200', pointValue: 1 },
        { value: 'HK50', label: 'HK50 - Hang Seng 50', pointValue: 0.1 },
        { value: 'CHINA50', label: 'CHINA50 - China A50', pointValue: 0.1 },
        { value: 'EU50', label: 'EU50 - Euro Stoxx 50', pointValue: 1 },
        { value: 'SPAIN35', label: 'SPAIN35 - IBEX 35', pointValue: 1 },
        { value: 'NLD25', label: 'NLD25 - AEX 25', pointValue: 1 },
        { value: 'SWI20', label: 'SWI20 - SMI 20', pointValue: 1 },
        { value: 'VIX', label: 'VIX - Volatility Index', pointValue: 1 }
    ];

    // Get instruments by market type
    function getInstruments(marketType) {
        switch (marketType) {
            case 'FOREX': return FOREX_PAIRS;
            case 'CRYPTO': return CRYPTO_PAIRS;
            case 'STOCKS': return STOCKS;
            case 'FUTURES': return FUTURES;
            case 'INDICES': return INDICES;
            default: return [];
        }
    }

    // Get pip/point value for an instrument
    function getPipValueForInstrument(marketType, instrument) {
        const instruments = getInstruments(marketType);
        const found = instruments.find(i => i.value === instrument);
        if (found) {
            return found.pipValue || found.pointValue || null;
        }
        return null;
    }

    // Calculate trade duration category
    function getTradeDurationCategory(holdingDurationHours) {
        if (holdingDurationHours === null || holdingDurationHours === undefined) return null;
        if (holdingDurationHours < 0.25) return 'SCALP';
        if (holdingDurationHours <= 24) return 'INTRADAY';
        return 'SWING';
    }

    return {
        FOREX_PAIRS,
        CRYPTO_PAIRS,
        STOCKS,
        FUTURES,
        INDICES,
        getInstruments,
        getPipValueForInstrument,
        getTradeDurationCategory
    };
})();
