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

      const agent = new HttpsProxyAgent({
        host: "brd.superproxy.io",
        port: 33335,
        auth: `${username}-session-${session}:${password}`,
        rejectUnauthorized: false,
      });

      response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-IN,en;q=0.9",
          Referer: "https://www.google.com/",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        timeout: 30000,
      });

      break; // success
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Flipkart request failed after ${MAX_ATTEMPTS} attempts: ${err.message}`
        );
      }
    }
  }

  const html = response.data;
  const $ = cheerio.load(html);

  // ---------- Try embedded __INITIAL_STATE__ JSON ----------
  let initialState;
  $("script").each((_, el) => {
    const content = $(el).html();
    if (!content || !content.includes("__INITIAL_STATE__")) return;

    // safer regex – only JSON object
    const match = content.match(/__INITIAL_STATE__\s*=\s*({.*})\s*;\s*$/s);
    if (!match) return;

    try {
      initialState = JSON.parse(match[1]);
    } catch (e) {
      console.error("Flipkart JSON parse error:", e);
    }
  });

  let title = "";
  let image = "";
  let currentPrice = 0;
  let originalPrice = 0;
  let discountRate = 0;
  let isOutOfStock = false;
  let reviewsCount = 0;
  let stars = 0;
  let description = "";

  if (initialState && initialState.pageDataV4) {
    // try multiple possible paths – Flipkart changes structure often
    const product =
      initialState?.pageDataV4?.productPage?.productDetails?.[0] ||
      initialState?.pageDataV4?.page?.data?.["10003"]?.widget?.data
        ?.products?.[0];

    if (product) {
      const pricing = product.pricing || {};
      const media = product.media || {};
      const rating = product.rating || product.ratingsAndReviews || {};

      title = product.title || product.name || "";
      image = media.images?.[0]?.url || media.mediaList?.[0]?.url || "";

      currentPrice =
        pricing.finalPrice?.value ||
        pricing.price?.value ||
        pricing.sellingPrice?.value ||
        0;

      originalPrice =
        pricing.mrp?.value ||
        pricing.strikeOffPrice?.value ||
        currentPrice ||
        0;

      discountRate =
        pricing.discountPercentage ||
        pricing.discount?.value ||
        pricing.discount ||
        0;

      isOutOfStock =
        product.availability?.outOfStock ||
        product.isOutOfStock ||
        false;

      reviewsCount =
        rating.ratingCount ||
        rating.totalCount ||
        rating.totalReviewCount ||
        0;

      stars =
        rating.averageRating ||
        rating.starRating ||
        rating.average ||
        0;

      description =
        product.productDescription ||
        product.description ||
        "";
    }
  }

  // --------- Fallbacks using DOM selectors (Cheerio) ---------
  // Title
  if (!title) {
    title = $("span.B_NuCI").first().text().trim();
  }

  // Price
  if (!currentPrice) {
    const priceText = $("div._30jeq3._16Jk6d").first().text().trim(); // main price
    currentPrice = parsePrice(priceText);
  }

  // Original / MRP
  if (!originalPrice) {
    const mrpText = $("div._3I9_wc._2p6lqe").first().text().trim(); // struck MRP
    const mrpParsed = parsePrice(mrpText);
    originalPrice = mrpParsed || currentPrice;
  }

  // Discount
  if (!discountRate) {
    const discText = $("div._3Ay6Sb span").first().text().trim(); // "20% off"
    const discNum = discText.replace(/[^\d]/g, "");
    discountRate = Number(discNum) || 0;
  }

  // Image
  if (!image) {
    const imgSrc =
      $("img._396cs4._2amPTt._3qGmMb").attr("src") ||
      $("img._2r_T1I").attr("src") ||
      "";
    if (imgSrc) {
      image = imgSrc.startsWith("http") ? imgSrc : `https:${imgSrc}`;
    }
  }

  // Description
  if (!description) {
    description = $("div._1mXcCf").text().trim();
  }

  // Reviews count
  if (!reviewsCount) {
    const revText = $("span._2_R_DZ span span").last().text().trim();
    const match = revText.match(/([\d,]+)\s*Reviews/i);
    if (match) reviewsCount = Number(match[1].replace(/,/g, "")) || 0;
  }

  // Rating stars
  if (!stars) {
    const starText = $("div._3LWZlK").first().text().trim();
    stars = Number(starText) || 0;
  }

  if (!title || !currentPrice) {
    throw new Error("Failed to scrape Flipkart product – title/price missing");
  }

  const data = {
    url,
    source: "flipkart",
    currency: "₹",
    title,
    currentPrice,
    originalPrice,
    discountRate,
    image,
    isOutOfStock,
    reviewsCount,
    stars,
    description,
    priceHistory: [],
    lowestPrice: currentPrice,
    highestPrice: originalPrice || currentPrice,
    averagePrice: currentPrice,
  };

  console.log("✅ Flipkart scraped successfully:", data.title);
  return data;
}

/** helper: "₹12,999" -> 12999 */
function parsePrice(text) {
  if (!text) return 0;
  const num = text.replace(/[^\d.]/g, "");
  return Number(num) || 0;
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
















