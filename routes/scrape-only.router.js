import express from "express";
import { scrapeProductOnly } from "../controllers/scrape.controller.js";

const router = express.Router();

router.post("/", scrapeProductOnly);

export default router;
