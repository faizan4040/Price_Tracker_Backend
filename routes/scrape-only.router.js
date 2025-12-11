import express from "express";
import { scrapeProductOnly } from "../lib/actions/scrapeProductOnly.js";

const router = express.Router();

router.post("/", scrapeProductOnly);

export default router;
