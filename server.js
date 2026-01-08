const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createOrder, captureOrder } = require("./paypal");

const app = express();
app.use(cors());
app.use(express.json());

// ================= PAYPAL ROUTES =================

// CREATE ORDER
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await createOrder(amount);
    res.json(order);
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// CAPTURE ORDER ✅
app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await captureOrder(orderId);
    res.json(result);
  } catch (err) {
    console.error("CAPTURE ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to capture order" });
  }
});

// =================================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
