import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
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




/**
 * Scrape Flipkart product details via Bright Data proxy
 * @param {string} url - Flipkart product URL
 * @returns {object} - Scraped product data
 */
export async function scrapeFlipkartProduct(url) {
  if (!url) throw new Error("URL is required");

  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;

  if (!username || !password) {
    throw new Error("Bright Data credentials missing in .env");
  }

  const MAX_ATTEMPTS = 3;
  let response;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const session = Math.floor(Math.random() * 1e9);

      // ✅ Bright Data proxy URL (with session)
      const proxyUrl = `http://${username}-session-${session}:${password}@brd.superproxy.io:33335`;
      const agent = new HttpsProxyAgent({
        host: "brd.superproxy.io",
        port: 33335,
        auth: `${username}-session-${session}:${password}`,
        rejectUnauthorized: false, // avoids SSL issues
      });

      response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "text/html",
          "Accept-Language": "en-IN,en;q=0.9",
          Referer: "https://www.flipkart.com/",
        },
        timeout: 30000,
      });

      break; // success, exit retry loop
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Flipkart request failed after ${MAX_ATTEMPTS} attempts: ${err.message}`
        );
      }
    }
  }

  // Parse HTML with cheerio
  const html = response.data;
  const $ = cheerio.load(html);

  // Extract embedded JSON
  let initialState;
  $("script").each((_, el) => {
    const content = $(el).html();
    if (content?.includes("__INITIAL_STATE__")) {
      const match = content.match(/__INITIAL_STATE__\s*=\s*(\{.*\});/s);
      if (match) initialState = JSON.parse(match[1]);
    }
  });

  if (!initialState) {
    throw new Error("Flipkart initial state JSON not found");
  }

  const product = initialState?.pageDataV4?.productPage?.productDetails?.[0];
  if (!product) {
    throw new Error("Flipkart product JSON missing");
  }

  const pricing = product.pricing || {};
  const media = product.media || {};

  const data = {
    url,
    source: "flipkart",
    currency: "₹",
    title: product.title || "",
    currentPrice: pricing.finalPrice?.value || 0,
    originalPrice: pricing.mrp?.value || pricing.finalPrice?.value || 0,
    discountRate: pricing.discountPercentage || 0,
    image: media.images?.[0]?.url || "",
    isOutOfStock: product.availability?.outOfStock || false,
    reviewsCount: product.ratingCount || 0,
    stars: product.averageRating || 0,
    description: product.productDescription || "",
    priceHistory: [], // you can fill this later
    lowestPrice: pricing.finalPrice?.value || 0,
    highestPrice: pricing.mrp?.value || 0,
    averagePrice: pricing.finalPrice?.value || 0,
  };

  console.log("✅ Flipkart scraped successfully:", data.title);
  return data;
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
















