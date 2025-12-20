import connectDB from "../database/db.js";
import Product from "../model/product.model.js";

import { scrapeAmazonProduct, scrapeMyntraProduct } from "../lib/scraper/scraper.js";
import { scrapeFlipkartProduct } from "../lib/scraper/scraper.js";

import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "../lib/helpers.js";

// Clean unwanted query params
const cleanUrl = (url) => url.split("?")[0];

// ================= CREATE OR UPDATE PRODUCT =================
export const createProduct = async (req, res) => {
  try {
    await connectDB();

    const { url, category } = req.body;
    if (!url || !category) {
      return res
        .status(400)
        .json({ message: "Product URL and category are required" });
    }

    const cleanedUrl = cleanUrl(url);

    // 🔥 PLATFORM DETECTION
    let scrapedData;

    if (cleanedUrl.includes("amazon")) {
      scrapedData = await scrapeAmazonProduct(cleanedUrl);
    } else if (cleanedUrl.includes("flipkart")) {
      scrapedData = await scrapeFlipkartProduct(cleanedUrl);
    } else if (cleanedUrl.includes("myntra")) {
      scrapedData = await scrapeMyntraProduct(cleanedUrl);
    } else {
      return res.status(400).json({ message: "Unsupported product URL" });
    }

    if (!scrapedData || !scrapedData.currentPrice) {
      return res.status(500).json({ message: "Failed to scrape product data" });
    }

    // ================= CHECK EXISTING PRODUCT =================
    let existingProduct = await Product.findOne({ url: cleanedUrl });

    if (existingProduct) {
      const newEntry = {
        prices: scrapedData.currentPrice,
        date: new Date(),
      };

      const updatedHistory = [
        ...existingProduct.priceHistory,
        newEntry,
      ];

      const updatedData = {
        ...scrapedData,
        url: cleanedUrl,
        category,
        priceHistory: updatedHistory,
        lowestPrice: getLowestPrice(updatedHistory),
        highestPrice: getHighestPrice(updatedHistory),
        averagePrice: getAveragePrice(updatedHistory),
      };

      const updatedProduct = await Product.findOneAndUpdate(
        { url: cleanedUrl },
        updatedData,
        { new: true }
      );

      return res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    }

    // ================= CREATE NEW PRODUCT =================
    const newHistory = [
      { prices: scrapedData.currentPrice, date: new Date() },
    ];

    const newProduct = await Product.create({
      ...scrapedData,
      url: cleanedUrl,
      category,
      priceHistory: newHistory,
      lowestPrice: scrapedData.currentPrice,
      highestPrice: scrapedData.originalPrice,
      averagePrice: scrapedData.currentPrice,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
    });

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================= GET ALL PRODUCTS =================
export const getAllProducts = async (req, res) => {
  try {
    await connectDB();

    const { page, limit } = req.query;
    const finalLimit = limit ? Number(limit) : 10000;
    const finalPage = page ? Number(page) : 1;
    const skip = (finalPage - 1) * finalLimit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(finalLimit);

    const total = await Product.countDocuments();

    res.status(200).json({ products, total });

  } catch (error) {
    console.error("GET ALL PRODUCTS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ================= GET PRODUCT BY ID =================
export const getProductById = async (req, res) => {
  try {
    await connectDB();

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);

  } catch (error) {
    console.error("GET PRODUCT BY ID ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= DELETE PRODUCT =================
export const deleteProduct = async (req, res) => {
  try {
    await connectDB();

    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });

  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


