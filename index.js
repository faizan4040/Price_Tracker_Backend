import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import serverless from "serverless-http";

import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import productRouter from "./routes/product.router.js";

dotenv.config();

const app = express();

/* ---------- DB CONNECTION (SAFE) ---------- */
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = connectDB().then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

await dbConnect();
/* ------------------------------------------ */

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://price-tracker-frontend-eta.vercel.app",
    ],
    credentials: true,
  })
);

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/products", productRouter);

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "Price History Tracker API running",
  });
});

/* ---------- EXPORT FOR VERCEL ---------- */
export const handler = serverless(app);
