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
  selectedTicker: storage.get("streamstock_selected", defaultStreamers[0].ticker)
};

const $ = (id) => document.getElementById(id);
const money = (num) => `$${Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const shares = (num) => Number(num || 0).toLocaleString();
const priceFor = (streamer) => streamer.subscribers * SUBSCRIBER_TO_PRICE;
const findStreamer = (ticker) => state.streamers.find((s) => s.ticker === ticker);

function saveState() {
  storage.set("streamstock_streamers", state.streamers);
  storage.set("streamstock_cash", state.cash);
  storage.set("streamstock_positions", state.positions);
  storage.set("streamstock_orders", state.orders);
  storage.set("streamstock_selected", state.selectedTicker);
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
    <div class="market-row">
      <div><strong>${s.name}</strong><p class="muted">${s.ticker} · ${shares(s.subscribers)} subs</p></div>
      <div style="text-align:right"><strong>${money(priceFor(s))}</strong><p class="${s.dayChange >= 0 ? "gain" : "loss"}">${s.dayChange >= 0 ? "+" : ""}${s.dayChange}%</p></div>
    </div>
  `;
  $("gainersList").innerHTML = [...state.streamers].sort((a, b) => b.dayChange - a.dayChange).slice(0, 5).map(row).join("");
  $("losersList").innerHTML = [...state.streamers].sort((a, b) => a.dayChange - b.dayChange).slice(0, 5).map(row).join("");
}

function renderTable() {
  const q = $("searchInput").value.trim().toLowerCase();
  const filtered = state.streamers.filter((s) => `${s.name} ${s.ticker}`.toLowerCase().includes(q));
  $("tickerTable").innerHTML = filtered.map((s) => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="ticker-badge">${s.ticker}</span></td>
      <td>${shares(s.subscribers)}</td>
      <td>${money(priceFor(s))}</td>
      <td class="${s.dayChange >= 0 ? "gain" : "loss"}">${s.dayChange >= 0 ? "+" : ""}${s.dayChange}%</td>
      <td><button class="row-btn" data-select="${s.ticker}">Trade</button></td>
    </tr>
  `).join("");
}

function renderAccount() {
  const marketValue = portfolioMarketValue();
  const totalReturn = marketValue - totalCostBasis();
  $("portfolioValue").textContent = money(marketValue + state.cash);
  $("cashBalance").textContent = money(state.cash);
  $("cashBalanceHero").textContent = money(state.cash);
  $("totalReturn").textContent = `${totalReturn >= 0 ? "+" : ""}${money(totalReturn)}`;
  $("totalReturn").className = totalReturn >= 0 ? "gain" : "loss";
  $("openOrderCount").textContent = state.orders.length;
}

function renderSelected() {
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
    $("positionsList").innerHTML = `<div class="empty-state">No positions yet. Go buy something before chat pumps it.</div>`;
    return;
  }

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
  const selected = findStreamer(state.selectedTicker);
  const amount = Math.max(0, Number($("shareAmount").value || 0));
  const type = $("orderType").value;
  const limit = Number($("limitPrice").value || 0);
  const activePrice = type === "limit" && limit > 0 ? limit : selected ? priceFor(selected) : 0;
  $("estimatedTotal").textContent = money(amount * activePrice);
}

function renderAll() {
  renderTickerTape();
  renderMarketLists();
  renderTable();
  renderSelected();
  renderAccount();
  renderPositions();
  renderOrders();
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
    return `Bought ${shares(amount)} ${ticker} at ${money(price)}.`;
  }

  const existing = state.positions[ticker];
  if (!existing || existing.shares < amount) return "You do not own enough shares to sell.";
  existing.shares -= amount;
  state.cash += total;
  if (existing.shares <= 0) delete state.positions[ticker];
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
  $("tradeMessage").textContent = fills.length ? fills.join(" ") : "No limit orders filled yet.";
  renderAll();
}

$("tradeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const side = $("orderSide").value;
  const type = $("orderType").value;
  const amount = Math.floor(Number($("shareAmount").value || 0));
  if (amount <= 0) {
    $("tradeMessage").textContent = "Enter at least 1 share.";
    return;
  }
  const msg = type === "market"
    ? placeMarketOrder(side, state.selectedTicker, amount)
    : placeLimitOrder(side, state.selectedTicker, amount, Number($("limitPrice").value || 0));
  $("tradeMessage").textContent = msg;
  renderAll();
});

$("tickerForm").addEventListener("submit", (event) => {
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
  location.hash = "trade";
});

$("orderType").addEventListener("change", () => {
  $("limitPriceWrap").classList.toggle("hidden", $("orderType").value !== "limit");
  updateEstimatedTotal();
});
["shareAmount", "limitPrice"].forEach((id) => $(id).addEventListener("input", updateEstimatedTotal));
$("searchInput").addEventListener("input", renderTable);
$("checkOrdersBtn").addEventListener("click", checkLimitOrders);
$("resetDemoBtn").addEventListener("click", () => {
  localStorage.removeItem("streamstock_streamers");
  localStorage.removeItem("streamstock_cash");
  localStorage.removeItem("streamstock_positions");
  localStorage.removeItem("streamstock_orders");
  localStorage.removeItem("streamstock_selected");
  state = { streamers: defaultStreamers, cash: STARTING_CASH, positions: {}, orders: [], selectedTicker: defaultStreamers[0].ticker };
  renderAll();
});

document.addEventListener("click", (event) => {
  const select = event.target.closest("[data-select]");
  const cancel = event.target.closest("[data-cancel]");
  if (select) {
    state.selectedTicker = select.dataset.select;
    $("tradeMessage").textContent = "";
    renderAll();
    location.hash = "trade";
  }
  if (cancel) {
    state.orders.splice(Number(cancel.dataset.cancel), 1);
    renderAll();
  }
});

renderAll();
