require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createOrder, captureOrder } = require("./paypal");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PayPal backend is running ✅");
});

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await createOrder(amount);
    res.json(order);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const capture = await captureOrder(orderId);
    res.json(capture);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to capture order" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
