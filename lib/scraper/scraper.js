import axios from "axios";
import * as cheerio from "cheerio";
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
