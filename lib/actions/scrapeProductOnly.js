import { scrapeAmazonProduct } from "../scraper/scraper.js";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice
} from "../helpers.js";

/**
 * Scrapes a product URL and returns product data
 * WITHOUT saving to the database
 */
export async function scrapeProductOnly(productUrl) {
  if (!productUrl) return null;

  try {
    // Scrape the product
    const scrapedProduct = await scrapeAmazonProduct(productUrl);
    if (!scrapedProduct) return null;

    // Prepare price history (just current price)
    const priceHistory = [
      { prices: Number(scrapedProduct.currentPrice), date: new Date() }
    ];

    // Prepare full product object (calculated prices)
    const productData = {
      ...scrapedProduct,
      priceHistory,
      lowestPrice: getLowestPrice(priceHistory),
      highestPrice: getHighestPrice(priceHistory),
      averagePrice: getAveragePrice(priceHistory)
    };

    return productData;

  } catch (err) {
    console.error("Scrape Only Error:", err.message);
    return null;
  }
}
