import connectDB from "../database/db.js";
import Product from "../model/product.model.js";

export async function getAllProducts() {
  try {
    await connectDB();
    const products = await Product.find();
    return products;
  } catch (error) {
    console.error(error);
    return [];
  }
}




