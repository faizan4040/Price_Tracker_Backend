import { scrapeAmazonProduct } from "../scraper/scraper.js";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../helpers.js";

/**
 * Controller: Scrape product without saving to DB
 */
export async function scrapeProductOnly(req, res) {
  const productUrl = req.body?.url;

  if (!productUrl || typeof productUrl !== "string") {
    return res.status(400).json({ success: false, msg: "Invalid URL" });
  }

  try {
    let finalUrl = productUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    const amazonUrlPattern = /^https?:\/\/(www\.)?(amazon\.in|amazon\.com)\/.*\/dp\/[A-Z0-9]{10}/i;
    if (!amazonUrlPattern.test(finalUrl)) {
      return res.status(400).json({ success: false, msg: "Invalid Amazon product URL" });
    }

    const scrapedProduct = await scrapeAmazonProduct(finalUrl);

    if (!scrapedProduct) {
      return res.status(500).json({ success: false, msg: "Scraping failed" });
    }

    const currentPrice = Number(scrapedProduct.currentPrice);
    if (isNaN(currentPrice)) {
      return res.status(500).json({ success: false, msg: "Invalid product price" });
    }

    const priceHistory = [{ price: currentPrice, date: new Date() }];
    const productData = {
      ...scrapedProduct,
      priceHistory,
      lowestPrice: getLowestPrice(priceHistory),
      highestPrice: getHighestPrice(priceHistory),
      averagePrice: getAveragePrice(priceHistory),
    };

    return res.json({ success: true, product: productData });

  } catch (err) {
    console.error("Scrape Only Error:", err.message);
    return res.status(500).json({ success: false, msg: "Server error occurred" });
  }
}
