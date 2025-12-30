import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
// flipkart.playwright.js
import { chromium } from "playwright";
import "dotenv/config";
import { extractCurrency, extractPrice, extractDescription } from "../../lib/helpers.js";


export async function scrapeAmazonProduct(url) {
    if (!url) return;

    const username = process.env.BRIGHT_DATA_USERNAME;
    const password = process.env.BRIGHT_DATA_PASSWORD;
    const port = "33335";
    const session_id = Math.floor(Math.random() * 1000000);

    const options = {
        auth: {
            username: `${username}-session-${session_id}`,
            password,
        },
        host: "brd.superproxy.io",
        port,
        rejectUnauthorized: false,
    };

    try {
        const response = await axios.get(url, options);
        const $ = cheerio.load(response.data);

        // Extract title
        const title = $("#productTitle").text().trim();

        // Extract current price
        const currentPrice = extractPrice(
            $("#corePriceDisplay_desktop_feature_div .a-price-whole").first(),
            $("#priceblock_dealprice").first(),
            $(".a-price .a-offscreen").first()
        );

        // Extract original price (if discounted)
        const originalPrice = extractPrice(
            $(".a-price.a-text-price .a-offscreen").first(),
            $("#priceblock_ourprice").first(),
            $('#listPrice').first(),
            $('#priceblock_delprice').first(),
            $('.a-size-base.a-color-price').first(),
        ); 

        // Extract outofStock price (product unavailable)
        const outofStock =  $("#availability span").text().trim().toLowerCase() === 'currently unavailable';

        const images = 
        $('#imgBlkFront').attr('data-a-dynamic-image') ||
        $('#landingImage').attr('data-a-dynamic-image');

        const imageUrls = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol').first());

        const discountRate = $('.savingsPercentage').first().text().replace(/[-%]/g, '');
           

        const description = extractDescription($);

        // Construct data object with scraped information

        const data = {
            url,
            currency: currency || "$",
            image: imageUrls[0] || "",
            title,
            currentPrice: Number(currentPrice) || Number(originalPrice),
            originalPrice: Number(originalPrice) || Number(currentPrice),
            priceHistory: [],
            discountRate: Number(discountRate),
            category: "category",
            reviewsCount:100,
            stars: 4.5,
            isOutOfStock: outofStock,
            description,
            lowestPrice: Number(currentPrice) || Number(originalPrice), 
            highestPrice: Number(originalPrice) || Number(currentPrice),
            averagePrice: Number(currentPrice) || Number(originalPrice),
        }

        return data;

    } catch (error) {
        console.error("Scraper error:", error.message);
        throw new Error(`Failed to scrape product: ${error.message}`);
    }
}





export async function scrapeFlipkartProduct(url) {
  if (!url) throw new Error("Product URL required");

  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;

  if (!username || !password) {
    throw new Error("Bright Data credentials missing");
  }

  const session = Math.floor(Math.random() * 1e9);

  const proxy = {
    server: "http://brd.superproxy.io:22225",
    username: `${username}-session-${session}-country-in`,
    password,
  };

  const browser = await chromium.launch({
    headless: true,
    proxy,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    locale: "en-IN",
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for Flipkart product title
    await page.waitForSelector("span.B_NuCI", { timeout: 30000 });

    const data = await page.evaluate(() => {
      const getText = (sel) =>
        document.querySelector(sel)?.innerText.trim() || "";

      const parsePrice = (t) =>
        Number(t.replace(/[^\d]/g, "")) || 0;

      const title = getText("span.B_NuCI");
      const currentPrice = parsePrice(
        getText("div._30jeq3._16Jk6d")
      );

      const originalPrice = parsePrice(
        getText("div._3I9_wc._2p6lqe")
      ) || currentPrice;

      const rating = Number(getText("div._3LWZlK")) || 0;

      const reviewsText = getText("span._2_R_DZ");
      const reviewsMatch = reviewsText.match(/([\d,]+)\s*Ratings/i);
      const reviewsCount = reviewsMatch
        ? Number(reviewsMatch[1].replace(/,/g, ""))
        : 0;

      const image =
        document
          .querySelector("img._396cs4._2amPTt._3qGmMb")
          ?.src || "";

      return {
        title,
        currentPrice,
        originalPrice,
        discountRate:
          Math.round(
            ((originalPrice - currentPrice) / originalPrice) * 100
          ) || 0,
        rating,
        reviewsCount,
        image,
        isOutOfStock:
          document.body.innerText.includes("Sold Out") ||
          document.body.innerText.includes("Currently unavailable"),
      };
    });

    if (!data.title || !data.currentPrice) {
      throw new Error("Flipkart data not found (blocked or layout changed)");
    }

    data.url = url;
    data.source = "flipkart";
    data.currency = "₹";
    data.scrapedAt = new Date();

    console.log("✅ Scraped:", data.title);
    return data;
  } finally {
    await browser.close();
  }
}








export async function scrapeMyntraProduct(url) {
  if (!url) throw new Error("URL is required");

  // 🔍 Strong productId extraction
  const productIdMatch = url.match(/\/(\d+)(?:\/|$|\?)/);
  const productId = productIdMatch?.[1];

  if (!productId) {
    throw new Error("Invalid Myntra product URL");
  }

  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;

  if (!username || !password) {
    throw new Error("Bright Data credentials missing");
  }

  const apiUrl = `https://www.myntra.com/gateway/v2/product/${productId}`;

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // REQUIRED for Bright Data TLS
  });

  let response;

  // 🔁 Retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const session = Math.floor(Math.random() * 1e9);

      response = await axios.get(apiUrl, {
        httpsAgent,
        proxy: {
          host: "brd.superproxy.io",
          port: 33335,
          auth: {
            username: `${username}-session-${session}`,
            password,
          },
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "application/json",
          Referer: "https://www.myntra.com/",
          "Accept-Language": "en-IN,en;q=0.9",
        },
        timeout: 30000,
      });

      break;
    } catch (err) {
      if (attempt === 3) {
        throw new Error(`Myntra request failed: ${err.message}`);
      }
    }
  }

  const product = response?.data?.style;

  if (!product) {
    throw new Error("Myntra product data not found");
  }

  const discounted = product.price?.discounted;
  const mrp = product.price?.mrp;

  if (!discounted) {
    throw new Error("Myntra price not found");
  }

  const images =
    product.media?.albums?.[0]?.images?.map(img => img.imageURL) || [];

  const data = {
    url,
    source: "myntra",
    currency: "₹",
    title: product.name || "",
    currentPrice: discounted,
    originalPrice: mrp || discounted,
    discountRate: product.discount || 0,
    image: images[0] || "",
    images,
    isOutOfStock: !product.available,
    description: product.productDetails || "",
    reviewsCount: product.ratings?.count || 0,
    stars: product.ratings?.average || 0,
    priceHistory: [],
    lowestPrice: discounted,
    highestPrice: mrp || discounted,
    averagePrice: discounted,
  };

  console.log("✅ Myntra scraped successfully");
  return data;
}
















