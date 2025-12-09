// Notification constants
const Notification = {
  WELCOME: "WELCOME",
  CHANGE_OF_STOCK: "CHANGE_OF_STOCK",
  LOWEST_PRICE: "LOWEST_PRICE",
  THRESHOLD_MET: "THRESHOLD_MET",
};

const THRESHOLD_PERCENTAGE = 40;

// Extracts and returns the price from possible cheerio elements
export function extractPrice(...elements) {
  for (const element of elements) {
    if (!element || typeof element.text !== "function") continue;

    const priceText = element.text().trim();
    if (!priceText) continue;

    const cleanPrice = priceText.replace(/[^\d.]/g, "");

    let firstPrice = cleanPrice.match(/\d+\.\d{2}/)?.[0];

    return firstPrice || cleanPrice;
  }
  return "";
}

// Extract currency symbol
export function extractCurrency(element) {
  if (!element || typeof element.text !== "function") return "";
  const currencyText = element.text().trim().slice(0, 1);
  return currencyText || "";
}

// Extract description from Amazon HTML using cheerio
export function extractDescription($) {
  const selectors = [
    ".a-unordered-list .a-list-item",
    ".a-expander-content p",
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      const textContent = elements
        .map((_, element) => $(element).text().trim())
        .get()
        .join("\n");

      return textContent;
    }
  }

  return "";
}

// Get highest price from history
export function getHighestPrice(priceList = []) {
  if (!priceList.length) return 0;

  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice.price;
}

// Get lowest price from history
export function getLowestPrice(priceList = []) {
  if (!priceList.length) return 0;

  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice.price;
}

export function getAveragePrice(priceList = []) {
  if (!priceList.length) return 0;

  // Convert to number + remove invalid prices
  const validPrices = priceList
    .map((item) => Number(item.price))
    .filter((p) => !isNaN(p));

  if (!validPrices.length) return 0;

  const sum = validPrices.reduce((acc, curr) => acc + curr, 0);
  return sum / validPrices.length;
}


// Choose email notification type

// export function getEmailNotifType(scrapedProduct, currentProduct) {
//   if (!scrapedProduct || !currentProduct) return null;

//   const lowestPrice = getLowestPrice(currentProduct.priceHistory);

//   if (scrapedProduct.currentPrice < lowestPrice) {
//     return Notification.LOWEST_PRICE;
//   }

//   if (!scrapedProduct.isOutOfStock && currentProduct.isOutOfStock) {
//     return Notification.CHANGE_OF_STOCK;
//   }

//   if (scrapedProduct.discountRate >= THRESHOLD_PERCENTAGE) {
//     return Notification.THRESHOLD_MET;
//   }

//   return null;
// }

// Format numbers like 1,299
export function formatNumber(num = 0) {
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
