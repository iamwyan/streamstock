"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What is StreamStock?",
    a: "StreamStock is a fantasy investing game where users compete to build the highest net worth by trading streamer stocks. Prices move based on creator momentum, market demand, and user trading activity.",
  },
  {
    q: "Are these real stocks?",
    a: "No. StreamStock is a game. No real securities, brokerages, payouts, or ownership of creators are involved.",
  },
  {
    q: "Can I cash out real money?",
    a: "No. Balances, gains, losses, and rankings are in-game only.",
  },
  {
    q: "How are streamer prices calculated?",
    a: "Streamer prices are influenced by followers, average viewers, stream hours, recent growth, market demand, and trading activity from users.",
  },
  {
    q: "Why does the price move after I buy or sell?",
    a: "Buying increases market demand and can push the price up. Selling increases supply pressure and can push the price down. Larger trades usually create more movement.",
  },
  {
    q: "Why can’t I buy a lot, pump the price, then sell for free profit?",
    a: "StreamStock uses bid/ask spread, slippage, trading fees, liquidity, and market impact. You buy slightly above market price and sell slightly below market price, so instant pump-and-dump trading usually loses money instead of printing infinite cash.",
  },
  {
    q: "What is slippage?",
    a: "Slippage is the difference between the displayed price and the actual execution price. Larger orders or less liquid streamer stocks may have more slippage.",
  },
  {
    q: "Why is the buy price different from the sell price?",
    a: "That difference is called the spread. It prevents instant flip exploits and makes the market feel more realistic.",
  },
  {
    q: "How does leaderboard ranking work?",
    a: "Leaderboard rank is based on net worth: cash plus the current value of all streamer holdings.",
  },
  {
    q: "Is net worth public?",
    a: "Yes. Net worth is always public so the race-to-richest leaderboard stays fair and competitive.",
  },
  {
    q: "Can users see my portfolio or trades?",
    a: "You can choose whether your portfolio and trade history are public from your profile privacy settings.",
  },
  {
    q: "Will there be seasons?",
    a: "Yes. StreamStock is designed around competitive seasons, leaderboard races, badges, and future rewards.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="page-wrap">
      <section className="panel full" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Help Center</p>
        <h1>Frequently Asked Questions</h1>
        <p className="muted" style={{ maxWidth: 760 }}>
          Everything users need to know about StreamStock, streamer pricing,
          trading, slippage, privacy, and the race to the richest account.
        </p>
      </section>

      <section
        className="panel full"
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        {faqs.map((item, index) => {
          const isOpen = open === index;

          return (
            <article
              key={item.q}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 18,
                overflow: "hidden",
                background: "var(--panel-soft)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                style={{
                  width: "100%",
                  padding: "20px 22px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                <span>{item.q}</span>
                <span
                  style={{
                    color: "var(--accent)",
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "0 22px 22px",
                    color: "var(--muted)",
                    lineHeight: 1.65,
                    maxWidth: 900,
                  }}
                >
                  {item.a}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}