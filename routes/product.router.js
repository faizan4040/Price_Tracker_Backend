import express from "express";
import { getProductById, scrapeAndStoreProduct } from "../lib/actions/scrapeAndStoreProduct.js";
import { getAllProducts, } from "../controllers/product.Controller.js";

const router = express.Router();

router.post("/scrape", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    const product = await scrapeAndStoreProduct(url);

    if (!product) return res.status(404).json({ error: "Failed to scrape product" });

    res.status(200).json({ success: true, product });
  } catch (err) {
    console.error("Scrape Route Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const products = await getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});


router.get("/product/:id", async (req, res) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
