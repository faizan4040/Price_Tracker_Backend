import { scrapeFlipkart } from "./flipkart/flipkart.scraper.js";
import { scrapeMyntra } from "./myntra/myntra.scraper.js";

export async function scrapeProduct(url) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("flipkart.")) return scrapeFlipkart(url);  // use scrapeFlipkart
  if (lowerUrl.includes("myntra.")) return scrapeMyntra(url);

  throw new Error("Unsupported website");
}
