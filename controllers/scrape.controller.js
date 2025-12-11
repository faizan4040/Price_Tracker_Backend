import { scrapeAmazonProduct } from "../lib/scraper/scraper.js";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "../lib/helpers.js";

/**
 * Controller: Scrape product details from Amazon without saving to DB
 * @param {Request} req
 * @param {Response} res
 */
export async function scrapeProductController(req, res) {
  const { url } = req.body;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, msg: "Product URL is required" });
  }

  try {
    // Scrape the product
    const scrapedProduct = await scrapeAmazonProduct(url);

    if (!scrapedProduct) {
      return res
        .status(500)
        .json({ success: false, msg: "Failed to scrape product" });
    }

    // Prepare price history (current price only)
    const priceHistory = [
      { price: Number(scrapedProduct.currentPrice), date: new Date() },
    ];

    // Build response with calculated prices
    const productData = {
      ...scrapedProduct,
      priceHistory,
      lowestPrice: getLowestPrice(priceHistory),
      highestPrice: getHighestPrice(priceHistory),
      averagePrice: getAveragePrice(priceHistory),
    };

    return res.status(200).json({ success: true, product: productData });
  } catch (err) {
    console.error("Scrape Product Controller Error:", err.message);
    return res
      .status(500)
      .json({ success: false, msg: "Server error occurred" });
  }
}
