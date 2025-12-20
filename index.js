import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import productRouter from "./routes/product.router.js";

dotenv.config();
const app = express();

/* DB CONNECTION */
await connectDB();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "https://price-tracker-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/products", productRouter);

app.get("/", (req, res) => {
  res.json({ success: true, message: "API running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));






// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";

// import connectDB from "./database/db.js";
// import userRoute from "./routes/user.route.js";
// import productRouter from "./routes/product.router.js";

// dotenv.config();

// const app = express();

// /* ---------- DB CONNECTION ---------- */
// await connectDB();
// /* ---------------------------------- */

// app.use(express.json());
// app.use(cookieParser());

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://price-tracker-frontend-eta.vercel.app",
//     ],
//     credentials: true,
//   })
// );

// // Routes
// app.use("/api/v1/user", userRoute);
// app.use("/api/v1/products", productRouter);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Price History Tracker API running",
//   });
// });

// // 🔴 THIS IS WHAT RENDER NEEDS
// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
