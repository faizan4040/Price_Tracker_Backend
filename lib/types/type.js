// Price history structure (JS cannot enforce types, so just comment)
export const PriceHistoryItem = {
  price: 0,
};

// User structure
export const User = {
  email: "",
};

// Product structure
export const Product = {
  _id: "",
  url: "",
  currency: "",
  image: "",
  title: "",
  currentPrice: 0,
  originalPrice: 0,
  priceHistory: [],
  highestPrice: 0,
  lowestPrice: 0,
  averagePrice: 0,
  discountRate: 0,
  description: "",
  category: "",
  reviewsCount: 0,
  stars: 0,
  isOutOfStock: false,
  users: [],
};

// Notification types (use object instead of TS union)
export const NotificationType = {
  WELCOME: "WELCOME",
  CHANGE_OF_STOCK: "CHANGE_OF_STOCK",
  LOWEST_PRICE: "LOWEST_PRICE",
  THRESHOLD_MET: "THRESHOLD_MET",
};

// Email content sample format
export const EmailContent = {
  subject: "",
  body: "",
};

// Email product info structure
export const EmailProductInfo = {
  title: "",
  url: "",
};
