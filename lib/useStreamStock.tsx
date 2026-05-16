"use client";

export function useStreamStock() {
  return {
    state: {
      streamers: [],
      cash: 0,
      positions: {},
      orders: [],
      username: "",
      bio: "",
    },

    ready: true,
    portfolioValue: 0,
    accountValue: 0,
    totalReturn: 0,

    placeOrder: async () => ({
      ok: false,
      message: "Supabase trading active.",
    }),

    reset: () => {},
    setUsername: () => {},
    setBio: () => {},
    updateProfile: () => {},
  };
}