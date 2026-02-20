# SwingArrow

[![MIT License](https://img.shields.io/badge/license-MIT-c9a84c?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)](https://expressjs.com)

A dark-themed swing trading research dashboard. Combines real-time market data, SEPA-style setup scoring, a position size calculator, and a trade journal — all in one focused interface.

---

## Screenshot

> _Dashboard with candlestick chart, SEPA checklist, and trade plan sidebar_

![SwingArrow Dashboard](docs/screenshot.png)

---

## Features

**Dashboard**
- Live watchlist with real-time price, change %, and volume for 10 tickers
- Interactive candlestick chart with 50/200-day SMA overlays (powered by TradingView Lightweight Charts)
- Interval switcher: 1D · 1W · 1M
- SEPA Setup Checklist — 8 criteria scored against live fundamentals (RS Rating, EPS growth, revenue growth, operating margin, 52-week range position, stage, volume, forward P/E)
- Auto-calculated Trade Plan with editable entry, stop, and targets; position sizing and R:R ratio
- Alerts feed panel

**Screener**
- Live scanner across 20 high-momentum tickers
- Proportional SEPA setup scoring (`passed/available` so missing data never penalises)
- Filters: Min RS Rating · Min EPS Growth · Min Score · Stage · Volume spike toggle
- Sortable 14-column table with color-coded RS, volume, and score grades
- 60-second auto-refresh with countdown; "Analyze →" jumps to Dashboard for any ticker

**Trade Journal**
- Stats bar: Total Trades · Win Rate · Avg R Multiple · Total P&L · Best/Worst Trade · Avg Hold Days
- Add new trades with auto-calculated stop loss (−7.5%) and auto-derived result, R multiple, and P&L
- Sortable 12-column trade table; row borders color-coded by Win / Loss / Open
- Notes column with hover tooltip for full text
- Persists to `localStorage` — survives page reloads

**Position Calculator**
- Position Size Calculator: account size, risk %, entry/stop/target → shares, capital required, % of account, R:R
- R Multiple Calculator: entry, exit, stop → R multiple, Win/Loss/Breakeven, P&L per share
- Reference card: O'Neil · Minervini · Darvas rules cheat sheet

**Bottom Bar**
- Live quotes: SPY · QQQ · IWM · DIA · VIX · GLD · BTC (refreshes every 60 s)
- Market condition label: `CONFIRMED UPTREND` / `UPTREND UNDER PRESSURE` / `MARKET IN CORRECTION` based on SPY vs 50d/200d SMA (refreshes every 5 min)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite 7 |
| Routing | React Router v6 |
| State | Zustand v5 |
| Server state / caching | TanStack React Query v5 |
| Charts | TradingView Lightweight Charts v5 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Fonts | DM Serif Display · JetBrains Mono · Instrument Sans |
| Backend | Express 5 (Node.js, CommonJS) |
| Market data | yahoo-finance2 v3 (no API key required) |
| Dev runner | concurrently |

---

## Installation

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/doclarisa/SwingArrow.git
cd SwingArrow

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server && npm install && cd ..

# 4. Start both servers with one command
npm run dev
```

- Frontend → [http://localhost:5173](http://localhost:5173)
- API server → [http://localhost:3001](http://localhost:3001)

To run them separately:

```bash
npm run dev:web   # Vite frontend only
npm run dev:api   # Express API only
```

To build for production:

```bash
npm run build     # outputs to dist/
npm run preview   # preview the production build locally
```

---

## Environment Variables

No API keys are required. yahoo-finance2 fetches public market data directly.

The only optional variable is:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the Express API listens on |

To override, set it in your shell before starting the API:

```bash
PORT=4000 npm run dev:api
```

---

## Project Structure

```
SwingArrow/
├── server/
│   ├── index.js          # Express API — all /api/* routes
│   └── package.json
├── src/
│   ├── components/
│   │   ├── layout/       # Header, BottomBar
│   │   ├── chart/        # CandlestickChart
│   │   ├── sidebar/      # SidebarLeft, SidebarRight
│   │   └── analysis/     # SepaChecklist, TradePlan, AlertsFeed
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Scanner.jsx
│   │   ├── Journal.jsx
│   │   └── Calc.jsx
│   ├── store/
│   │   └── useTickerStore.js   # Zustand — activeTicker, watchlist
│   ├── utils/
│   │   └── tradingCalc.js      # calculateStopLoss, calculatePositionSize, etc.
│   ├── globals.css
│   └── App.jsx
├── package.json
├── vite.config.js
└── LICENSE
```

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m "Add your feature"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a pull request against `main`

Please keep pull requests focused — one feature or fix per PR. Match the existing code style (inline styles for components, JetBrains Mono for data, DM Serif Display for headings).

**Bug reports:** open an issue with steps to reproduce, expected behavior, and actual behavior.

---

## License

[MIT](LICENSE) © 2026 [doclarisa](https://github.com/doclarisa)
