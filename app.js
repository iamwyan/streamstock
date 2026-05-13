const SUBSCRIBER_TO_PRICE = 0.0005; // User rule: 1 subscriber = 0.05 cents = $0.0005 fake value.
const STARTING_CASH = 10000;

const defaultStreamers = [
  { name: "Kai Cenat", ticker: "KAI", subscribers: 165000, dayChange: 8.24 },
  { name: "xQc", ticker: "XQC", subscribers: 98000, dayChange: -2.15 },
  { name: "Pokimane", ticker: "POKI", subscribers: 82000, dayChange: 3.4 },
  { name: "IShowSpeed", ticker: "SPEED", subscribers: 121000, dayChange: 11.88 },
  { name: "Ludwig", ticker: "LUD", subscribers: 62000, dayChange: 1.25 },
  { name: "HasanAbi", ticker: "HASAN", subscribers: 71000, dayChange: -4.7 },
  { name: "Ninja", ticker: "NINJA", subscribers: 53000, dayChange: -1.35 },
  { name: "Tarik", ticker: "TARIK", subscribers: 74000, dayChange: 5.72 }
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

const $ = (id) => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
const money = (num) => `$${Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const shares = (num) => Number(num || 0).toLocaleString();
const priceFor = (streamer) => streamer.subscribers * SUBSCRIBER_TO_PRICE;
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
      <div><strong>${s.name}</strong><p class="muted">${s.ticker} · ${shares(s.subscribers)} subs</p></div>
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
      <td>${shares(s.subscribers)}</td>
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
  setText('stockSubs', `${shares(selected.subscribers)} subs`);
  setText('stockPrice', money(priceFor(selected)));
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

function makeCandles(streamer) {
  const rand = seededRandom(streamer.ticker + streamer.subscribers + streamer.dayChange);
  const current = priceFor(streamer);
  const candles = [];
  let close = current / (1 + streamer.dayChange / 100 || 1);
  for (let i = 0; i < 30; i++) {
    const drift = (streamer.dayChange / 100) / 30;
    const noise = (rand() - 0.48) * 0.055;
    const open = close;
    close = Math.max(0.0001, open * (1 + drift + noise));
    const high = Math.max(open, close) * (1 + rand() * 0.035);
    const low = Math.min(open, close) * (1 - rand() * 0.035);
    candles.push({ open, high, low, close, label: `D${i + 1}` });
  }
  const ratio = current / candles[candles.length - 1].close;
  return candles.map(c => ({ open: c.open * ratio, high: c.high * ratio, low: c.low * ratio, close: c.close * ratio, label: c.label }));
}

function drawCandleChart(streamer) {
  const canvas = $('candleChart');
  if (!canvas) return;
  const candles = makeCandles(streamer);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = 380;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  const pad = 38;
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const max = Math.max(...highs) * 1.01;
  const min = Math.min(...lows) * 0.99;
  const y = val => height - pad - ((val - min) / Math.max(0.000001, max - min)) * (height - pad * 2);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const gy = pad + i * ((height - pad * 2) / 4);
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(width - pad, gy); ctx.stroke();
  }

  const slot = (width - pad * 2) / candles.length;
  const bodyW = Math.max(6, slot * 0.54);
  candles.forEach((c, i) => {
    const x = pad + i * slot + slot / 2;
    const up = c.close >= c.open;
    const color = up ? '#23d18b' : '#ff5470';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
    const top = y(Math.max(c.open, c.close));
    const bottom = y(Math.min(c.open, c.close));
    const bodyH = Math.max(3, bottom - top);
    ctx.globalAlpha = 0.95;
    ctx.fillRect(x - bodyW / 2, top, bodyW, bodyH);
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = 'rgba(247,251,255,0.82)';
  ctx.font = '800 12px Inter, system-ui';
  ctx.fillText(money(candles[candles.length - 1].close), pad, 20);
  ctx.fillStyle = 'rgba(154,167,187,0.9)';
  ctx.fillText('30-day demo candles', pad + 120, 20);
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
    recordHistoryPoint();
    return `Bought ${shares(amount)} ${ticker} at ${money(price)}.`;
  }

  const existing = state.positions[ticker];
  if (!existing || existing.shares < amount) return "You do not own enough shares to sell.";
  existing.shares -= amount;
  state.cash += total;
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

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
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
  ctx.strokeStyle = "#21e6c1";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f7fbff";
    ctx.fill();
  });

  ctx.fillStyle = "rgba(247,251,255,0.78)";
  ctx.font = "700 12px Inter, system-ui";
  ctx.fillText(money(values[values.length - 1]), pad, 18);
  ctx.fillStyle = "rgba(154,167,187,0.9)";
  ctx.fillText("latest", pad + 112, 18);
}

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
    subscribers: Number($("newSubs").value || 0),
    dayChange: Number($("newChange").value || 0)
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
if ($("checkOrdersBtn")) $("checkOrdersBtn").addEventListener("click", checkLimitOrders);
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

window.addEventListener("resize", () => { drawValueChart(); const s = findStreamer(state.selectedTicker); if (s) drawCandleChart(s); });
seedHistoryIfNeeded();
renderAll();
