import type { MetadataRoute } from "next";

// Explicit robots policy + sitemap reference. A legit, indexable site with a
// declared sitemap reads differently to automated classifiers than a cloaked
// drainer clone (which typically blocks crawlers or has none).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.rawli.finance/sitemap.xml",
    host: "https://www.rawli.finance",
  };
}
