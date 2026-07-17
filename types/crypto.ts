export type CryptoToken = {
  symbol: "BTC" | "BNB" | "CAKE" | "$Rwaan" | "USDC" | "SFUND";
  coingeckoId: string;
  highlight?: boolean;
};

export type CryptoPrice = {
  symbol: CryptoToken["symbol"];
  priceUsd: number;
  change24h: number;
  isFallback?: boolean;
};
