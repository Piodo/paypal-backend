const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createOrder, captureOrder } = require("./paypal");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= PAYPAL ROUTES =================

// 🔹 CREATE ORDER
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        error: "Valid amount is required"
      });
    }

    const order = await createOrder(Number(amount));
    res.json(order);

  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      error: "Failed to create PayPal order"
    });
  }
});

// 🔹 CAPTURE ORDER
app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        error: "Order ID is required"
      });
    }

    const capture = await captureOrder(orderId);
    res.json(capture);

  } catch (err) {
    console.error("❌ CAPTURE ORDER ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      error: "Failed to capture PayPal order"
    });
  }
});

// ================= PAYPAL RETURN ROUTES =================

// ✅ PAYMENT APPROVED
app.get("/success", (req, res) => {
  res.send(`
    <h2>✅ Payment Successful</h2>
    <p>You may now return to the app.</p>
  `);
});

// ❌ PAYMENT CANCELLED
app.get("/cancel", (req, res) => {
  res.send(`
    <h2>❌ Payment Cancelled</h2>
    <p>You cancelled the PayPal payment.</p>
  `);
});

// ================= SERVER START =================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 PayPal server running on port ${PORT}`);
});
