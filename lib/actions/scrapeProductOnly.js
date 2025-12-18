import { scrapeAmazonProduct, scrapeFlipkartProduct, scrapeMyntraProduct } from "../scraper/scraper.js";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../helpers.js";

/**
 * Scrape product details without saving to DB
 */
export async function scrapeProductOnly(req, res) {
  try {
    let productUrl = req.body?.url;
    if (!productUrl || typeof productUrl !== "string") {
      return res.status(400).json({ success: false, msg: "URL is required" });
    }

    if (!/^https?:\/\//i.test(productUrl)) {
      productUrl = "https://" + productUrl;
    }

    const { hostname } = new URL(productUrl);

    let scrapedProduct;
    let platform;

    if (hostname.includes("amazon.")) {
      platform = "amazon";
      scrapedProduct = await scrapeAmazonProduct(productUrl);
    } 
    else if (hostname.endsWith("flipkart.com")) {
      platform = "flipkart";
      scrapedProduct = await scrapeFlipkartProduct(productUrl);
    } 
    else if (hostname.endsWith("myntra.com")) {
      platform = "myntra";
      scrapedProduct = await scrapeMyntraProduct(productUrl);
    } 
    else {
      return res.status(400).json({
        success: false,
        msg: "Unsupported platform",
      });
    }

    if (
      !scrapedProduct ||
      typeof scrapedProduct.currentPrice !== "number"
    ) {
      throw new Error("Invalid scraped data");
    }

    const priceHistory = [
      { price: scrapedProduct.currentPrice, date: new Date() },
    ];

    return res.status(200).json({
      success: true,
      product: {
        ...scrapedProduct,
        platform,
        priceHistory,
        lowestPrice: getLowestPrice(priceHistory),
        highestPrice: getHighestPrice(priceHistory),
        averagePrice: getAveragePrice(priceHistory),
      },
    });
  } catch (err) {
    console.error("Scrape Only Error:", err);
    return res.status(500).json({
      success: false,
      msg: err.message || "Server error occurred",
    });
  }
}








// import { scrapeAmazonProduct, scrapeFlipkartProduct, scrapeMyntraProduct,  } from "../scraper/scraper.js";

// import {
//   getAveragePrice,
//   getHighestPrice,
//   getLowestPrice,
// } from "../helpers.js";

// /**
//  * Scrape product without saving to DB
//  */


// export async function scrapeProductOnly(req, res) {

//   try {
//     const productUrl = req.body?.url;

//     if (!productUrl || typeof productUrl !== "string") {
//       return res
//         .status(400)
//         .json({ success: false, msg: "URL is required" });
//     }

//     let finalUrl = productUrl.trim();
//     if (!/^https?:\/\//i.test(finalUrl)) {
//       finalUrl = "https://" + finalUrl;
//     }

//     let scrapedProduct;
//     let platform;

//     // ---------- PLATFORM DETECTION ----------
//     if (finalUrl.includes("amazon.in") || finalUrl.includes("amazon.com")) {
//       platform = "amazon";
//       scrapedProduct = await scrapeAmazonProduct(finalUrl);
//     } 
//     else if (finalUrl.includes("flipkart.com")) {
//       platform = "flipkart";
//       scrapedProduct = await scrapeFlipkartProduct(finalUrl);
//     } 
//     else if (finalUrl.includes("myntra.com")) {
//       platform = "myntra";
//       scrapedProduct = await scrapeMyntraProduct(finalUrl);
//     } 
//     else {
//       return res.status(400).json({
//         success: false,
//         msg: "Unsupported platform. Only Amazon & Flipkart allowed",
//       });
//     }

//     if (!scrapedProduct) {
//       return res
//         .status(500)
//         .json({ success: false, msg: "Scraping failed" });
//     }

//     const currentPrice = Number(scrapedProduct.currentPrice);
//     const originalPrice =
//       Number(scrapedProduct.originalPrice) || currentPrice;

//     if (isNaN(currentPrice)) {
//       return res.status(500).json({
//         success: false,
//         msg: "Invalid price in scraped data",
//       });
//     }

//     // ---------- PRICE CALCULATIONS ----------
//     const priceHistory = [
//       { price: currentPrice, date: new Date() },
//       { price: originalPrice, date: new Date() },
//     ];

//     const productData = {
//       ...scrapedProduct,
//       platform,
//       priceHistory,
//       lowestPrice: getLowestPrice(priceHistory),
//       highestPrice: getHighestPrice(priceHistory),
//       averagePrice: getAveragePrice(priceHistory),
//     };

//     return res.status(200).json({
//       success: true,
//       product: productData,
//     });

//   } catch (err) {
//     console.error("Scrape Only Error:", err);
//     return res
//       .status(500)
//       .json({ success: false, msg: "Server error occurred" });
//   }
// }





















// import { scrapeAmazonProduct } from "../scraper/scraper.js";
// import { getAveragePrice, getHighestPrice, getLowestPrice } from "../helpers.js";

//  /**
//  * Scrape product without saving to DB
//  */
// export async function scrapeProductOnly(req, res) {
//   try {
//     const productUrl = req.body?.url;

//     if (!productUrl || typeof productUrl !== "string") {
//       return res.status(400).json({ success: false, msg: "URL is required" });
//     }

//     let finalUrl = productUrl.trim();
//     if (!/^https?:\/\//i.test(finalUrl)) {
//       finalUrl = "https://" + finalUrl;
//     }

//     const amazonPattern =
//       /^https?:\/\/(www\.)?(amazon\.(in|com))\/(.*\/)?(dp|gp\/product)\/([A-Z0-9]{10})/i;
//     if (!amazonPattern.test(finalUrl)) {
//       return res.status(400).json({ success: false, msg: "Invalid Amazon product URL" });
//     }

//     const scrapedProduct = await scrapeAmazonProduct(finalUrl);
//     if (!scrapedProduct) {
//       return res.status(500).json({ success: false, msg: "Scraping failed" });
//     }

//     const currentPrice = Number(scrapedProduct.currentPrice);
//     const originalPrice = Number(scrapedProduct.originalPrice) || currentPrice;

//     if (isNaN(currentPrice)) {
//       return res.status(500).json({ success: false, msg: "Invalid price in scraped data" });
//     }

//     // Build price array for better calculations
//     const priceHistory = [
//       { price: currentPrice, date: new Date() },
//       { price: originalPrice, date: new Date() },
//     ];

//     const productData = {
//       ...scrapedProduct,
//       priceHistory,
//       lowestPrice: getLowestPrice(priceHistory),
//       highestPrice: getHighestPrice(priceHistory),
//       averagePrice: getAveragePrice(priceHistory),
//     };

//     return res.status(200).json({
//       success: true,
//       product: productData,
//     });

//   } catch (err) {
//     console.error("Scrape Only Error:", err);
//     return res.status(500).json({ success: false, msg: "Server error occurred" });
//   }
// }




