import connectDB from "../database/db.js";
import Product from "../model/product.model.js";
import { scrapeAmazonProduct } from "../lib/scraper/scraper.js";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "../lib/helpers.js";

// Clean unwanted query params from URL
const cleanUrl = (url) => url.split("?")[0];

// ================= CREATE OR UPDATE PRODUCT =================
export const createProduct = async (req, res) => {
  try {
    await connectDB();
    const { url, category } = req.body;
    if (!url || !category)
      return res
        .status(400)
        .json({ message: "Product URL and category are required" });

    const cleanedUrl = cleanUrl(url);

    // 1️⃣ Scrape product
    const scrapedData = await scrapeAmazonProduct(cleanedUrl);
    if (!scrapedData)
      return res.status(500).json({ message: "Failed to scrape product" });

    // 2️⃣ Check if product exists
    let existingProduct = await Product.findOne({ url: cleanedUrl });

    if (existingProduct) {
      const newEntry = { prices: scrapedData.currentPrice, date: new Date() };
      const updatedHistory = [...existingProduct.priceHistory, newEntry];

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

    // 3️⃣ Create new product
    const newHistory = [{ prices: scrapedData.currentPrice, date: new Date() }];
    const newProduct = await Product.create({
      ...scrapedData,
      url: cleanedUrl,
      category,
      priceHistory: newHistory,
      lowestPrice: scrapedData.currentPrice,
      highestPrice: scrapedData.originalPrice,
      averagePrice: scrapedData.currentPrice,
    });

    return res
      .status(201)
      .json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// ================= GET ALL PRODUCTS =================
export const getAllProducts = async (req, res) => {
  try {
    await connectDB();
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Product.countDocuments();

    res.status(200).json({ products, total });
  } catch (error) {
    8;
    console.error("GET ALL PRODUCTS ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};

// ================= GET PRODUCT BY ID =================
export const getProductById = async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    console.error("GET PRODUCT BY ID ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================= DELETE PRODUCT =================
export const deleteProduct = async (req, res) => {
  try {
    await connectDB();
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

