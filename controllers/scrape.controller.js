import { scrapeAmazonProduct } from "../lib/scraper/scraper.js";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice
} from "../lib/helpers.js";

export async function scrapeProductOnly(req, res) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, msg: "URL missing" });
  }

  try {
    const scraped = await scrapeAmazonProduct(url);

    if (!scraped) {
      return res.status(500).json({ success: false, msg: "Scraping failed" });
    }

    const priceHistory = [
      { prices: Number(scraped.currentPrice), date: new Date() }
    ];

    return res.json({
      success: true,
      product: {
        ...scraped,
        priceHistory,
        lowestPrice: getLowestPrice(priceHistory),
        highestPrice: getHighestPrice(priceHistory),
        averagePrice: getAveragePrice(priceHistory)
      }
    });

  } catch (err) {
    console.log("Scrape Controller Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
}
