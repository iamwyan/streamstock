const STARTING_CASH = 10000;
const DEFAULT_LIQUIDITY = 25000; // Higher liquidity = user money moves the price less aggressively.
const MAX_FLOW_MOVE = 0.65; // Keeps prototype prices from going nuclear after one big trade.

// New StreamStock pricing foundation:
// Followers + Avg Viewers + Stream Hours + Recent Growth + Market Demand
const PRICE_WEIGHTS = {
  followers: 0.000025,      // large audience foundation
  avgViewers: 0.018,        // live attention is stronger than raw followers
  streamHours: 0.085,       // consistency bonus
  growth: 0.65              // recent growth percentage bonus
};

const defaultStreamers = [
  { name: "Kai Cenat", ticker: "KAI", followers: 15200000, avgViewers: 82000, streamHours: 178, recentGrowth: 12.4, dayChange: 8.24, netFlow: 4200, liquidity: 36000 },
  { name: "xQc", ticker: "XQC", followers: 12100000, avgViewers: 46000, streamHours: 132, recentGrowth: -1.7, dayChange: -2.15, netFlow: -1300, liquidity: 28000 },
  { name: "Pokimane", ticker: "POKI", followers: 9400000, avgViewers: 19000, streamHours: 64, recentGrowth: 3.8, dayChange: 3.4, netFlow: 1600, liquidity: 25000 },
  { name: "IShowSpeed", ticker: "SPEED", followers: 35000000, avgViewers: 118000, streamHours: 96, recentGrowth: 18.2, dayChange: 11.88, netFlow: 5200, liquidity: 30000 },
  { name: "Ludwig", ticker: "LUD", followers: 6400000, avgViewers: 24000, streamHours: 82, recentGrowth: 2.6, dayChange: 1.25, netFlow: 500, liquidity: 22000 },
  { name: "HasanAbi", ticker: "HASAN", followers: 2900000, avgViewers: 31000, streamHours: 190, recentGrowth: -4.2, dayChange: -4.7, netFlow: -2400, liquidity: 24000 },
  { name: "Ninja", ticker: "NINJA", followers: 19000000, avgViewers: 14500, streamHours: 58, recentGrowth: -2.1, dayChange: -1.35, netFlow: -650, liquidity: 21000 },
  { name: "Tarik", ticker: "TARIK", followers: 3500000, avgViewers: 53000, streamHours: 150, recentGrowth: 7.4, dayChange: 5.72, netFlow: 2100, liquidity: 24000 }
];

const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let state = {
  streamers: storage.get("streamstock_streamers", defaultStreamers),
  cash: storage.get("streamstock_cash", STARTING_CASH),
  positions: storage.get("streamstock_positions", {}),
  orders: storage.get("streamstock_orders", []),
  history: storage.get("streamstock_history", []),
  selectedTicker: storage.get("streamstock_selected", defaultStreamers[0].ticker)
};

state.streamers = state.streamers.map((streamer) => ({
  ...streamer,
  // Backwards compatibility for older StreamStock demo data that only had subscribers.
  followers: Number(streamer.followers ?? (streamer.subscribers || 50000) * 120),
  avgViewers: Number(streamer.avgViewers ?? Math.max(250, Math.round((streamer.subscribers || 50000) * 0.34))),
  streamHours: Number(streamer.streamHours ?? 90),
  recentGrowth: Number(streamer.recentGrowth ?? streamer.dayChange ?? 0),
  netFlow: Number(streamer.netFlow || 0),
  liquidity: Number(streamer.liquidity || DEFAULT_LIQUIDITY)
}));


const theme = {
  get() { return storage.get("streamstock_theme", "dark"); },
  set(value) { storage.set("streamstock_theme", value); document.documentElement.setAttribute("data-theme", value); const btn = document.getElementById("themeToggleBtn"); if (btn) btn.textContent = value === "dark" ? "Light mode" : "Dark mode"; }
};
theme.set(theme.get());
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

const $ = (id) => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
const money = (num) => `$${Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const shares = (num) => Number(num || 0).toLocaleString();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function fundamentalsFor(streamer) {
  const followerValue = Number(streamer.followers || 0) * PRICE_WEIGHTS.followers;
  const viewerValue = Number(streamer.avgViewers || 0) * PRICE_WEIGHTS.avgViewers;
  const hoursValue = Number(streamer.streamHours || 0) * PRICE_WEIGHTS.streamHours;
  const growthValue = Math.max(-20, Number(streamer.recentGrowth || 0)) * PRICE_WEIGHTS.growth;
  const base = Math.max(0.25, followerValue + viewerValue + hoursValue + growthValue);
  return { followerValue, viewerValue, hoursValue, growthValue, base };
}
const fundamentalPriceFor = (streamer) => fundamentalsFor(streamer).base;
const flowMultiplierFor = (streamer) => {
  const liquidity = Number(streamer.liquidity || DEFAULT_LIQUIDITY);
  const netFlow = Number(streamer.netFlow || 0);
  return 1 + clamp(netFlow / liquidity, -MAX_FLOW_MOVE, MAX_FLOW_MOVE);
};
const priceFor = (streamer) => fundamentalPriceFor(streamer) * flowMultiplierFor(streamer);
const findStreamer = (ticker) => state.streamers.find((s) => s.ticker === ticker);

function saveState() {
  storage.set("streamstock_streamers", state.streamers);
  storage.set("streamstock_cash", state.cash);
  storage.set("streamstock_positions", state.positions);
  storage.set("streamstock_orders", state.orders);
  storage.set("streamstock_history", state.history);
  storage.set("streamstock_selected", state.selectedTicker);
}

function accountValue() {
  return state.cash + portfolioMarketValue();
}

function seedHistoryIfNeeded() {
  if (state.history && state.history.length) return;
  const base = accountValue();
  state.history = [
    { label: "Start", value: base * 0.985 },
    { label: "Day 2", value: base * 1.01 },
    { label: "Day 3", value: base * 0.997 },
    { label: "Day 4", value: base * 1.018 },
    { label: "Now", value: base }
  ];
}

function recordHistoryPoint() {
  seedHistoryIfNeeded();
  state.history.push({ label: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), value: accountValue() });
  state.history = state.history.slice(-14);
}

function portfolioMarketValue() {
  return Object.entries(state.positions).reduce((sum, [ticker, position]) => {
    const streamer = findStreamer(ticker);
    return streamer ? sum + position.shares * priceFor(streamer) : sum;
  }, 0);
}

function totalCostBasis() {
  return Object.values(state.positions).reduce((sum, position) => sum + position.shares * position.averageCost, 0);
}

function renderTickerTape() {
  const top = [...state.streamers].sort((a, b) => b.dayChange - a.dayChange).slice(0, 4);
  if (!$("tickerTape")) return;
  $("tickerTape").innerHTML = top.map((s) => `
    <div class="tape-item">
      <strong>${s.ticker}</strong>
      <span>${money(priceFor(s))}</span>
      <span class="${s.dayChange >= 0 ? "gain" : "loss"}">${s.dayChange >= 0 ? "+" : ""}${s.dayChange}%</span>
    </div>
  `).join("");
}

function renderMarketLists() {
  const row = (s) => `
    <a class="market-row clickable-row" href="streamer.html?ticker=${encodeURIComponent(s.ticker)}">
      <div><strong>${s.name}</strong><p class="muted">${s.ticker} · ${shares(s.followers)} followers · ${shares(s.avgViewers)} avg viewers</p></div>
      <div style="text-align:right"><strong>${money(priceFor(s))}</strong><p class="${s.dayChange >= 0 ? "gain" : "loss"}">${s.dayChange >= 0 ? "+" : ""}${s.dayChange}%</p></div>
    </a>
  `;
  if (!$("gainersList") || !$("losersList")) return;
  $("gainersList").innerHTML = [...state.streamers].sort((a, b) => b.dayChange - a.dayChange).slice(0, 5).map(row).join("");
  $("losersList").innerHTML = [...state.streamers].sort((a, b) => a.dayChange - b.dayChange).slice(0, 5).map(row).join("");
}

function renderTable() {
  if (!$("tickerTable")) return;
  const q = $("searchInput") ? $("searchInput").value.trim().toLowerCase() : "";
  const filtered = state.streamers.filter((s) => `${s.name} ${s.ticker}`.toLowerCase().includes(q));
  $("tickerTable").innerHTML = filtered.map((s) => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="ticker-badge">${s.ticker}</span></td>
      <td>${shares(s.followers)}</td>
      <td>${money(priceFor(s))}</td>
      <td class="${s.dayChange >= 0 ? "gain" : "loss"}">${s.dayChange >= 0 ? "+" : ""}${s.dayChange}%</td>
      <td><a class="row-btn" href="streamer.html?ticker=${encodeURIComponent(s.ticker)}">Open</a></td>
    </tr>
  `).join("");
}

function renderAccount() {
  const marketValue = portfolioMarketValue();
  const totalReturn = marketValue - totalCostBasis();
  setText("portfolioValue", money(marketValue + state.cash));
  setText("cashBalance", money(state.cash));
  setText("cashBalanceHero", money(state.cash));
  setText("totalReturn", `${totalReturn >= 0 ? "+" : ""}${money(totalReturn)}`);
  if ($("totalReturn")) $("totalReturn").className = totalReturn >= 0 ? "gain" : "loss";
  setText("openOrderCount", state.orders.length);
}

function renderSelected() {
  if (!$("selectedName")) return;
  const selected = findStreamer(state.selectedTicker) || state.streamers[0];
  if (!selected) return;
  state.selectedTicker = selected.ticker;
  $("selectedName").textContent = selected.name;
  $("selectedTicker").textContent = selected.ticker;
  $("estimatedPrice").textContent = money(priceFor(selected));
  updateEstimatedTotal();
}

function renderPositions() {
  const entries = Object.entries(state.positions).filter(([, p]) => p.shares > 0);
  if (!entries.length) {
    if (!$("positionsList")) return;
    $("positionsList").innerHTML = `<div class="empty-state">No positions yet. Go buy something before chat pumps it.</div>`;
    return;
  }

  if (!$("positionsList")) return;
  $("positionsList").innerHTML = entries.map(([ticker, position]) => {
    const streamer = findStreamer(ticker);
    if (!streamer) return "";
    const current = priceFor(streamer);
    const value = position.shares * current;
    const pl = value - position.shares * position.averageCost;
    return `
      <div class="position-row">
        <div><strong>${streamer.name}</strong><p class="muted">${ticker} · ${shares(position.shares)} shares @ ${money(position.averageCost)}</p></div>
        <div style="text-align:right"><strong>${money(value)}</strong><p class="${pl >= 0 ? "gain" : "loss"}">${pl >= 0 ? "+" : ""}${money(pl)}</p></div>
      </div>
    `;
  }).join("");
}

function renderOrders() {
  if (!$("ordersList")) return;
  if (!state.orders.length) {
    $("ordersList").innerHTML = `<div class="empty-state">No open limit orders.</div>`;
    return;
  }
  $("ordersList").innerHTML = state.orders.map((o, index) => `
    <div class="order-row">
      <div><strong>${o.side.toUpperCase()} ${o.ticker}</strong><p class="muted">${shares(o.amount)} shares · limit ${money(o.limitPrice)}</p></div>
      <button class="secondary-btn small" data-cancel="${index}">Cancel</button>
    </div>
  `).join("");
}

function updateEstimatedTotal() {
  if (!$("estimatedTotal")) return;
  const selected = findStreamer(state.selectedTicker);
  const amount = Math.max(0, Number($("shareAmount")?.value || 0));
  const type = $("orderType")?.value || "market";
  const limit = Number($("limitPrice")?.value || 0);
  const activePrice = type === "limit" && limit > 0 ? limit : selected ? priceFor(selected) : 0;
  setText("estimatedTotal", money(amount * activePrice));
}


function getTickerFromUrl() {
  return new URLSearchParams(window.location.search).get("ticker");
}

function renderStreamerPage() {
  if (!$('stockName')) return;
  const urlTicker = (getTickerFromUrl() || state.selectedTicker || defaultStreamers[0].ticker).toUpperCase();
  const selected = findStreamer(urlTicker) || state.streamers[0];
  if (!selected) return;
  state.selectedTicker = selected.ticker;
  setText('stockName', selected.name);
  setText('stockTicker', selected.ticker);
  setText('stockSubs', `${shares(selected.followers)} followers`);
  const currentPrice = priceFor(selected);
  const fundamental = fundamentalPriceFor(selected);
  const f = fundamentalsFor(selected);
  setText('stockFollowers', shares(selected.followers));
  setText('stockAvgViewers', shares(selected.avgViewers));
  setText('stockStreamHours', `${shares(selected.streamHours)} hrs / month`);
  setText('stockRecentGrowth', `${selected.recentGrowth >= 0 ? '+' : ''}${Number(selected.recentGrowth || 0).toFixed(1)}%`);
  const multiplier = flowMultiplierFor(selected);
  const netFlow = Number(selected.netFlow || 0);
  setText('stockPrice', money(currentPrice));
  setText('stockPriceInline', money(currentPrice));
  setText('stockFundamental', money(fundamental));
  setText('stockMarketPressure', `${multiplier >= 1 ? '+' : ''}${((multiplier - 1) * 100).toFixed(2)}%`);
  setText('stockNetFlow', money(netFlow));
  setText('stockLiquidity', money(selected.liquidity || DEFAULT_LIQUIDITY));
  setText('stockFormula', `Followers + viewers + stream hours + growth = ${money(fundamental)}. Market demand multiplier ${multiplier.toFixed(3)} = ${money(currentPrice)}.`);
  setText('stockDayChange', `${selected.dayChange >= 0 ? '+' : ''}${selected.dayChange}% today`);
  const changeEl = $('stockDayChange');
  if (changeEl) changeEl.className = selected.dayChange >= 0 ? 'gain' : 'loss';
  drawCandleChart(selected);
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return function() {
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

let activeCandleRange = storage.get("streamstock_candle_range", "1m");
let candleChartApi = null;
let candleSeriesApi = null;

const candleRangeConfig = {
  "1m": { label: "1 minute", count: 120, seconds: 60, volatility: 0.0045 },
  "5m": { label: "5 minute", count: 120, seconds: 300, volatility: 0.008 },
  "10m": { label: "10 minute", count: 120, seconds: 600, volatility: 0.012 },
  "1d": { label: "daily", count: 90, seconds: 86400, volatility: 0.032 },
  "30d": { label: "30 day", count: 72, seconds: 2592000, volatility: 0.11 }
};

function makeCandles(streamer, range = activeCandleRange) {
  const config = candleRangeConfig[range] || candleRangeConfig["1m"];
  const rand = seededRandom(`${streamer.ticker}-${streamer.followers}-${streamer.avgViewers}-${streamer.dayChange}-${range}-${streamer.netFlow}`);
  const current = priceFor(streamer);
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const start = now - (config.count - 1) * config.seconds;
  let close = current / Math.max(0.35, 1 + Number(streamer.dayChange || 0) / 100);
  const drift = (Number(streamer.dayChange || 0) / 100) / config.count;
  const flowBias = clamp(Number(streamer.netFlow || 0) / Number(streamer.liquidity || DEFAULT_LIQUIDITY), -0.18, 0.18) / config.count;

  for (let i = 0; i < config.count; i++) {
    const open = close;
    const noise = (rand() - 0.49) * config.volatility;
    close = Math.max(0.0001, open * (1 + drift + flowBias + noise));
    const wick = config.volatility * (0.3 + rand() * 1.2);
    const high = Math.max(open, close) * (1 + wick);
    const low = Math.max(0.0001, Math.min(open, close) * (1 - wick));
    candles.push({
      time: start + i * config.seconds,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4))
    });
  }

  const ratio = current / candles[candles.length - 1].close;
  return candles.map(c => ({
    ...c,
    open: Number((c.open * ratio).toFixed(4)),
    high: Number((c.high * ratio).toFixed(4)),
    low: Number((c.low * ratio).toFixed(4)),
    close: Number((c.close * ratio).toFixed(4))
  }));
}

function fallbackCandleChart(container, candles) {
  container.innerHTML = '<canvas id="fallbackCandleCanvas"></canvas>';
  const canvas = $('fallbackCandleCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height || 560;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = '100%';
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
  const pad = 46;
  const max = Math.max(...candles.map(c => c.high)) * 1.01;
  const min = Math.min(...candles.map(c => c.low)) * 0.99;
  const y = val => height - pad - ((val - min) / Math.max(0.000001, max - min)) * (height - pad * 2);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = cssVar('--line-soft');
  for (let i = 0; i < 6; i++) {
    const gy = pad + i * ((height - pad * 2) / 5);
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(width - pad, gy); ctx.stroke();
  }
  const visible = candles.slice(-Math.min(80, candles.length));
  const slot = (width - pad * 2) / visible.length;
  const bodyW = Math.max(5, slot * 0.58);
  visible.forEach((c, i) => {
    const x = pad + i * slot + slot / 2;
    const up = c.close >= c.open;
    const color = up ? '#12805c' : '#b42318';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
    const top = y(Math.max(c.open, c.close));
    const bottom = y(Math.min(c.open, c.close));
    ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(3, bottom - top));
  });
}

function drawCandleChart(streamer) {
  const container = $('candleChart');
  if (!container) return;
  const candles = makeCandles(streamer, activeCandleRange);
  const config = candleRangeConfig[activeCandleRange] || candleRangeConfig["1m"];
  document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === activeCandleRange));

  if (!window.LightweightCharts) {
    fallbackCandleChart(container, candles);
    return;
  }

  const rect = container.getBoundingClientRect();
  if (!candleChartApi) {
    candleChartApi = LightweightCharts.createChart(container, {
      width: Math.max(320, Math.floor(rect.width)),
      height: window.innerWidth < 620 ? 420 : 560,
      layout: {
        background: { type: 'solid', color: cssVar('--card') },
        textColor: cssVar('--muted'),
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      grid: {
        vertLines: { color: cssVar('--line-soft') },
        horzLines: { color: cssVar('--line-soft') }
      },
      rightPriceScale: { borderColor: cssVar('--line'), scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderColor: cssVar('--line'), timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 8 },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    });
    candleSeriesApi = candleChartApi.addCandlestickSeries({
      upColor: '#12805c',
      downColor: '#b42318',
      borderUpColor: '#12805c',
      borderDownColor: '#b42318',
      wickUpColor: '#12805c',
      wickDownColor: '#b42318',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }
    });
  } else {
    candleChartApi.applyOptions({
      width: Math.max(320, Math.floor(rect.width)),
      height: window.innerWidth < 620 ? 420 : 560,
      layout: { background: { type: 'solid', color: cssVar('--card') }, textColor: cssVar('--muted') },
      grid: { vertLines: { color: cssVar('--line-soft') }, horzLines: { color: cssVar('--line-soft') } },
      rightPriceScale: { borderColor: cssVar('--line'), scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderColor: cssVar('--line'), timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 8 }
    });
  }

  candleSeriesApi.setData(candles);
  candleChartApi.timeScale().fitContent();
  setText('chartRangeLabel', config.label);
}

const leaderboardNames = [
  "ClipLord", "SubWhale", "EmoteFund", "ChatDividend", "LurkerCapital", "DiamondMod", "PrimePumper", "CandleGoblin", "HypeTrainCEO", "RaidRisk",
  "GreenCandleGary", "PortfolioPog", "MarketMage", "DegenDesk", "TickerWizard", "AlphaAndy", "MoonMarauder", "FomoFrog", "VolumeViking", "WKeyInvestor",
  "BidAskBandit", "TrendGoblin", "SubathonShark", "OptionlessOwen", "MintyMargin", "BuyWallBilly", "SellWallSally", "ChartChimp", "WhaleWatcher", "PumpProfessor",
  "RugProofRon", "BetaBeater", "YieldYapper", "DividendDude", "OrderBookOgre", "LimitLarry", "MarketMolly", "CaffeineCapital", "SideQuestSoros", "PixelProfit",
  "StreamerStonks", "KappaKing", "PogQueen", "ModMailMax", "ChannelPointChad", "VODVulture", "RaidBossRich", "SubCountSam", "ClutchCandles", "BagHolderBen",
  "RiskyRiley", "ProfitPanda", "TurboTrader", "SilentStacker", "DeepValueDan", "HODLHarper", "GigaGreen", "RedDayRay", "TapeReaderTess", "LiquidityLiam",
  "WhisperWhale", "TrendTara", "ApeAccountant", "FidelityFaker", "PortfolioPete", "MemeMarketMia", "GammaGabe", "DeltaDylan", "ThetaTheo", "VegaVera",
  "FloatFinder", "SubSpikeSyd", "MomentumMason", "CandlestickCal", "OrderFlowOli", "AskSlapper", "BidBuilder", "MintCondition", "PaperBillionaire", "TerminalTom",
  "HeatMapHaley", "GreenScreenGene", "StreamSniper", "MoneyMouse", "LedgerLuca", "TwitchTickerTia", "NetWorthNate", "BullishBri", "BearishBlake", "RocketRonnie",
  "FakeCoinFinn", "PortfolioPrincess", "ScreenerScout", "TrailingStopTroy", "ChartDoctor", "TradeTicketTim", "PriceActionPax", "BenchmarkedBea", "MarketMando", "SubPrime"
];

function buildLeaderboard() {
  const rand = seededRandom("streamstock-leaderboard-v1");
  const users = leaderboardNames.map((name, index) => {
    const base = 18000 + Math.pow(100 - index, 1.72) * 420 + rand() * 18000;
    const portfolioWeight = 0.25 + rand() * 0.62;
    const portfolio = base * portfolioWeight;
    const cash = base - portfolio;
    const change = (rand() * 18 - 5.5);
    return { name, cash, portfolio, netWorth: cash + portfolio, change };
  });
  users.push({
    name: "You",
    cash: state.cash,
    portfolio: portfolioMarketValue(),
    netWorth: accountValue(),
    change: state.history.length > 1 ? ((accountValue() / state.history[0].value) - 1) * 100 : 0,
    isYou: true
  });
  return users.sort((a, b) => b.netWorth - a.netWorth).slice(0, 100).map((user, i) => ({ ...user, rank: i + 1 }));
}

function renderLeaderboard() {
  if (!$('leaderboardTable')) return;
  const board = buildLeaderboard();
  const q = $('leaderboardSearch') ? $('leaderboardSearch').value.trim().toLowerCase() : '';
  const visible = q ? board.filter((u) => u.name.toLowerCase().includes(q)) : board;
  const you = board.find((u) => u.isYou);
  const top = board[0];
  const average = board.reduce((sum, u) => sum + u.netWorth, 0) / Math.max(1, board.length);

  setText('leaderTopUser', top ? `#1 ${top.name}` : 'No users');
  setText('leaderTopValue', top ? `${money(top.netWorth)} net worth` : 'No leaderboard data');
  setText('myRank', you ? `#${you.rank}` : 'Not top 100');
  setText('myNetWorth', money(accountValue()));
  setText('leaderAverage', money(average));
  setText('leaderCount', `${board.length}`);

  $('leaderboardTable').innerHTML = visible.map((u) => `
    <tr class="${u.isYou ? 'you-row' : ''}">
      <td><span class="rank-badge ${u.rank <= 3 ? 'podium' : ''}">#${u.rank}</span></td>
      <td><strong>${u.name}</strong>${u.isYou ? '<span class="you-chip">You</span>' : ''}</td>
      <td>${money(u.cash)}</td>
      <td>${money(u.portfolio)}</td>
      <td><strong>${money(u.netWorth)}</strong></td>
      <td class="${u.change >= 0 ? 'gain' : 'loss'}">${u.change >= 0 ? '+' : ''}${u.change.toFixed(2)}%</td>
    </tr>
  `).join('');
}

function renderAll() {
  renderTickerTape();
  renderMarketLists();
  renderTable();
  renderSelected();
  renderAccount();
  renderPositions();
  renderOrders();
  renderStreamerPage();
  renderLeaderboard();
  drawValueChart();
  saveState();
}

function placeMarketOrder(side, ticker, amount) {
  const streamer = findStreamer(ticker);
  if (!streamer) return "Pick a valid ticker first.";
  const price = priceFor(streamer);
  const total = price * amount;

  if (side === "buy") {
    if (total > state.cash) return "Not enough buying power.";
    const existing = state.positions[ticker] || { shares: 0, averageCost: 0 };
    const newShares = existing.shares + amount;
    const newAverage = ((existing.shares * existing.averageCost) + total) / newShares;
    state.positions[ticker] = { shares: newShares, averageCost: newAverage };
    state.cash -= total;
    streamer.netFlow = Number(streamer.netFlow || 0) + total;
    streamer.dayChange = Number((((priceFor(streamer) / price) - 1) * 100).toFixed(2));
    recordHistoryPoint();
    return `Bought ${shares(amount)} ${ticker} at ${money(price)}.`;
  }

  const existing = state.positions[ticker];
  if (!existing || existing.shares < amount) return "You do not own enough shares to sell.";
  existing.shares -= amount;
  state.cash += total;
  streamer.netFlow = Number(streamer.netFlow || 0) - total;
  streamer.dayChange = Number((((priceFor(streamer) / price) - 1) * 100).toFixed(2));
  if (existing.shares <= 0) delete state.positions[ticker];
  recordHistoryPoint();
  return `Sold ${shares(amount)} ${ticker} at ${money(price)}.`;
}

function placeLimitOrder(side, ticker, amount, limitPrice) {
  if (limitPrice <= 0) return "Enter a valid limit price.";
  state.orders.push({ side, ticker, amount, limitPrice, createdAt: Date.now() });
  return `${side.toUpperCase()} limit order placed for ${shares(amount)} ${ticker} at ${money(limitPrice)}.`;
}

function checkLimitOrders() {
  const remaining = [];
  const fills = [];
  state.orders.forEach((order) => {
    const streamer = findStreamer(order.ticker);
    if (!streamer) return;
    const current = priceFor(streamer);
    const canFill = order.side === "buy" ? current <= order.limitPrice : current >= order.limitPrice;
    if (canFill) fills.push(placeMarketOrder(order.side, order.ticker, order.amount));
    else remaining.push(order);
  });
  state.orders = remaining;
  setText("tradeMessage", fills.length ? fills.join(" ") : "No limit orders filled yet.");
  renderAll();
}


function drawValueChart() {
  const canvas = $("valueChart");
  if (!canvas) return;
  seedHistoryIfNeeded();
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = 260;
  ctx.clearRect(0, 0, width, height);

  const pad = 28;
  const values = state.history.map((p) => p.value);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const range = Math.max(1, max - min);
  const points = state.history.map((p, i) => ({
    x: pad + (i / Math.max(1, state.history.length - 1)) * (width - pad * 2),
    y: height - pad - ((p.value - min) / range) * (height - pad * 2),
    ...p
  }));

  ctx.strokeStyle = cssVar("--line-soft");
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = pad + i * ((height - pad * 2) / 3);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, "rgba(33, 230, 193, 0.32)");
  gradient.addColorStop(1, "rgba(124, 92, 255, 0.02)");
  ctx.beginPath();
  points.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
  ctx.lineTo(points[points.length - 1].x, height - pad);
  ctx.lineTo(points[0].x, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
  ctx.strokeStyle = cssVar("--broker");
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = cssVar("--card");
    ctx.fill();
  });

  ctx.fillStyle = cssVar("--text");
  ctx.font = "700 12px Inter, system-ui";
  ctx.fillText(money(values[values.length - 1]), pad, 18);
  ctx.fillStyle = cssVar("--muted");
  ctx.fillText("latest", pad + 112, 18);
}


if ($("timeframeTabs")) $("timeframeTabs").addEventListener("click", (event) => {
  const btn = event.target.closest(".tf-btn");
  if (!btn) return;
  activeCandleRange = btn.dataset.range || "1m";
  storage.set("streamstock_candle_range", activeCandleRange);
  const streamer = findStreamer(state.selectedTicker);
  if (streamer) drawCandleChart(streamer);
});

if ($("tradeForm")) $("tradeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const side = $("orderSide").value;
  const type = $("orderType").value;
  const amount = Math.floor(Number($("shareAmount").value || 0));
  if (amount <= 0) {
    setText("tradeMessage", "Enter at least 1 share.");
    return;
  }
  const msg = type === "market"
    ? placeMarketOrder(side, state.selectedTicker, amount)
    : placeLimitOrder(side, state.selectedTicker, amount, Number($("limitPrice").value || 0));
  setText("tradeMessage", msg);
  renderAll();
});

if ($("tickerForm")) $("tickerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const ticker = $("newTicker").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (state.streamers.some((s) => s.ticker === ticker)) {
    alert("Ticker already exists. Pick another symbol.");
    return;
  }
  state.streamers.push({
    name: $("newName").value.trim(),
    ticker,
    followers: Number($("newFollowers")?.value || $("newSubs")?.value || 0),
    avgViewers: Number($("newAvgViewers")?.value || 1000),
    streamHours: Number($("newStreamHours")?.value || 80),
    recentGrowth: Number($("newGrowth")?.value || $("newChange")?.value || 0),
    dayChange: Number($("newChange").value || 0),
    netFlow: 0,
    liquidity: DEFAULT_LIQUIDITY
  });
  event.target.reset();
  state.selectedTicker = ticker;
  renderAll();
  location.href = `streamer.html?ticker=${encodeURIComponent(ticker)}`;
});

if ($("orderType")) $("orderType").addEventListener("change", () => {
  $("limitPriceWrap").classList.toggle("hidden", $("orderType").value !== "limit");
  updateEstimatedTotal();
});
["shareAmount", "limitPrice"].forEach((id) => { if ($(id)) $(id).addEventListener("input", updateEstimatedTotal); });
if ($("searchInput")) $("searchInput").addEventListener("input", renderTable);
if ($("leaderboardSearch")) $("leaderboardSearch").addEventListener("input", renderLeaderboard);
if ($("checkOrdersBtn")) $("checkOrdersBtn").addEventListener("click", checkLimitOrders);

if ($("themeToggleBtn")) $("themeToggleBtn").addEventListener("click", () => {
  theme.set(theme.get() === "dark" ? "light" : "dark");
  const streamer = findStreamer(state.selectedTicker);
  drawValueChart();
  if (streamer) drawCandleChart(streamer);
});

if ($("resetDemoBtn")) $("resetDemoBtn").addEventListener("click", () => {
  localStorage.removeItem("streamstock_streamers");
  localStorage.removeItem("streamstock_cash");
  localStorage.removeItem("streamstock_positions");
  localStorage.removeItem("streamstock_orders");
  localStorage.removeItem("streamstock_history");
  localStorage.removeItem("streamstock_selected");
  state = { streamers: defaultStreamers, cash: STARTING_CASH, positions: {}, orders: [], history: [], selectedTicker: defaultStreamers[0].ticker };
  renderAll();
});

document.addEventListener("click", (event) => {
  const select = event.target.closest("[data-select]");
  const cancel = event.target.closest("[data-cancel]");
  if (select) {
    state.selectedTicker = select.dataset.select;
    setText("tradeMessage", "");
    renderAll();
    location.href = "index.html#trade";
  }
  if (cancel) {
    state.orders.splice(Number(cancel.dataset.cancel), 1);
    renderAll();
  }
});

window.addEventListener("resize", () => { drawValueChart(); if (candleChartApi && $("candleChart")) candleChartApi.applyOptions({ width: Math.max(320, Math.floor($("candleChart").getBoundingClientRect().width)), height: window.innerWidth < 620 ? 420 : 560 }); const s = findStreamer(state.selectedTicker); if (s) drawCandleChart(s); });
seedHistoryIfNeeded();
renderAll();
