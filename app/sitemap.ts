import type { MetadataRoute } from "next";

const SITE_URL = "https://www.rawli.finance";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/network", "/leaderboard", "/terms-of-service", "/privacy-policy", "/risk-disclosure"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
