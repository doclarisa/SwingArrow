import { create } from 'zustand';

const useTickerStore = create((set) => ({
  activeTicker: 'NVDA',
  watchlist: ['NVDA', 'META', 'AAPL', 'MSFT', 'SMCI', 'TSLA', 'AMD', 'CRWD', 'PANW', 'MELI'],
  setActiveTicker: (ticker) => set({ activeTicker: ticker }),
}));

export default useTickerStore;
