import { NextResponse } from "next/server";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/rawli-analytics?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";

export const revalidate = 30;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 30 },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries) throw error;
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

export async function GET() {
  try {
    if (isBuildPhase) {
      return NextResponse.json({}, { status: 200 });
    }

    const response = await fetchWithRetry(COINGECKO_URL);

    if (!response.ok) {
      console.warn(`CoinGecko market API error: ${response.status}`);
      return NextResponse.json(
        { error: `Market feed error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("CoinGecko market fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
