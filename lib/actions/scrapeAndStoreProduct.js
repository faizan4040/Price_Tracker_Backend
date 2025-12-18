import { scrapeAmazonProduct } from "../scraper/scraper.js";
import connectDB from "../../database/db.js";
import Product from "../../model/product.model.js";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice
} from "../helpers.js";


// Amazon scraping
export async function scrapeAndStoreProduct(productUrl) {
  if (!productUrl) return null;

  try {
    await connectDB();

    const scrapedProduct = await scrapeAmazonProduct(productUrl);
    if (!scrapedProduct) return null;

    const existing = await Product.findOne({ url: scrapedProduct.url });

    const newEntry = {
      prices: Number(scrapedProduct.currentPrice), // force number
      date: new Date()
    };

    const priceHistory = existing
      ? [...existing.priceHistory, newEntry]
      : [newEntry];

    const productData = {
      ...scrapedProduct,
      priceHistory,
      lowestPrice: getLowestPrice(priceHistory),
      highestPrice: getHighestPrice(priceHistory),
      averagePrice: getAveragePrice(priceHistory)
    };

    const saved = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      productData,
      { upsert: true, new: true }
    );

    return saved;

  } catch (err) {
    console.error("Scrape Error:", err.message);
    throw new Error("Failed to create/update product");
  }
}


// Flipkart scraping
export async function scrapeAndStoreFlipkartProduct(productUrl) {
  if (!productUrl) return null;

  try {
    await connectDB();

    const scrapedProduct = await scrapeFlipkartProduct(productUrl);
    if (!scrapedProduct) return null;

    const existing = await Product.findOne({ url: scrapedProduct.url });

    const newEntry = {
      prices: Number(scrapedProduct.currentPrice), // force number
      date: new Date()
    };

    const priceHistory = existing
      ? [...existing.priceHistory, newEntry]
      : [newEntry];

    const productData = {
      ...scrapedProduct,
      priceHistory,
      lowestPrice: getLowestPrice(priceHistory),
      highestPrice: getHighestPrice(priceHistory),
      averagePrice: getAveragePrice(priceHistory)
    };

    const saved = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      productData,
      { upsert: true, new: true }
    );

    return saved;

  } catch (err) {
    console.error("Scrape Error:", err.message);
    throw new Error("Failed to create/update product");
  }
}



export async function getProductById(productId) {
  try{
    connectDB();
    const product = await Product.findOne({ _id: productId });
    
    if(!product) return null;

    return product;

  } catch (error){

  }
}


export async function getAllProducts() {
  try {
    await connectDB(); // MUST await

    const products = await Product.find();
    return products;

  } catch (error) {
    console.error("getAllProducts Error:", error.message);
    return []; // return empty array to avoid crashes
  }
}

