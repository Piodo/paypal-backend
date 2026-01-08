const axios = require("axios");

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.paypal.com";

// Get Access Token
async function getAccessToken() {
  try {
    console.log("🔑 Getting PayPal access token...");
    console.log("📍 Base URL:", PAYPAL_BASE_URL);
    console.log("🆔 Client ID:", PAYPAL_CLIENT_ID ? "Present" : "Missing");
    console.log("🔐 Client Secret:", PAYPAL_CLIENT_SECRET ? "Present" : "Missing");

    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("✅ Access token obtained successfully");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ TOKEN ERROR:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
}

// Create Order
async function createOrder(amount) {
  try {
    console.log("🔍 Creating PayPal order...");
    console.log("💰 Amount:", amount, "PHP");
    
    const token = await getAccessToken();

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "PHP",
            value: Number(amount).toFixed(2)
          },
          description: "Payment for order"
        }
      ],
      application_context: {
        return_url: "https://paypal-backend-93xe.onrender.com/success",
        cancel_url: "https://paypal-backend-93xe.onrender.com/cancel",
        brand_name: "Your Store Name",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING"
      }
    };

    console.log("📤 Sending order data to PayPal...");

    const res = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Order created successfully!");
    console.log("🆔 Order ID:", res.data.id);
    console.log("📊 Order Status:", res.data.status);
    
    return res.data;
  } catch (error) {
    console.error("❌ CREATE ORDER ERROR:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      details: error.response?.data?.details
    });
    throw error;
  }
}

// Capture Order
async function captureOrder(orderId) {
  try {
    console.log("🔍 Capturing PayPal order...");
    console.log("🆔 Order ID:", orderId);
    
    const token = await getAccessToken();

    console.log("📤 Sending capture request to PayPal...");

    const res = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Order captured successfully!");
    console.log("🆔 Capture ID:", res.data.id);
    console.log("📊 Capture Status:", res.data.status);
    
    return res.data;
  } catch (error) {
    console.error("❌ CAPTURE ORDER ERROR:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      details: error.response?.data?.details
    });
    throw error;
  }
}

module.exports = {
  getAccessToken,
  createOrder,
  captureOrder
};