const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getAccessToken, createOrder, captureOrder } = require("./paypal");
const admin = require("firebase-admin");

// Ligtas na pag-parse ng Firebase Admin credentials upang maiwasan ang server crash
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error("❌ FIREBASE CONFIG ERROR: Pakisuri ang format sa iyong .env file", error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get("/api/paypal/test", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ 
      success: true, 
      message: "PayPal connection working!",
      hasToken: !!token
    });
  } catch (err) {
    console.error("❌ CONNECTION TEST ERROR:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "PayPal connection failed", 
      details: err.response?.data || err.message 
    });
  }
});

// CREATE ORDER
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    
    console.log("📥 Received create-order request:", { amount });
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        error: "Valid amount is required"
      });
    }

    const order = await createOrder(Number(amount));
    
    console.log("✅ Order created successfully:", order.id);
    res.json(order);
  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to create PayPal order",
      details: err.response?.data || err.message
    });
  }
});

// CAPTURE ORDER
app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log("📥 Received capture-order request:", { orderId });
    
    if (!orderId) {
      return res.status(400).json({
        error: "Order ID is required"
      });
    }

    const capture = await captureOrder(orderId);
    
    console.log("✅ Order captured successfully:", capture.id);
    res.json(capture);
  } catch (err) {
    console.error("❌ CAPTURE ORDER ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to capture PayPal order",
      details: err.response?.data || err.message
    });
  }
});

// ✨ SUCCESS PAGE - WITH AUTO CAPTURE ✨
app.get("/success", async (req, res) => {
  const { token, PayerID } = req.query;
  
  console.log("========================================");
  console.log("✅ USER REDIRECTED TO SUCCESS PAGE");
  console.log("🆔 Order ID (token):", token);
  console.log("👤 Payer ID:", PayerID);
  console.log("========================================");

  if (token) {
    try {
      console.log("🔄 Attempting auto-capture...");
      
      const capture = await captureOrder(token);
      
      console.log("========================================");
      console.log("✅ PAYMENT CAPTURED SUCCESSFULLY!");
      console.log("💰 Capture ID:", capture.id);
      console.log("📊 Status:", capture.status);
      console.log("========================================");

      // Pagkuha ng payment data mula sa tugon ng PayPal
      const purchaseUnit = capture.purchase_units?.[0];
      const captureDetails = purchaseUnit?.payments?.captures?.[0];
      
      if (!captureDetails) {
        throw new Error("No capture details found in transaction response");
      }

      const amount = captureDetails.amount.value;
      const currency = captureDetails.amount.currency_code;

      // Pagsulat ng transaksyon sa Firestore database
      await db.collection("payments").add({
        amount: Number(amount),
        currency: currency,
        customerId: capture.payer?.payer_id || "unknown",
        customerName: `${capture.payer?.name?.given_name || ""} ${capture.payer?.name?.surname || ""}`.trim(),
        deposit: true,
        paymentDate: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: "paypal",
        paymentStatus: "completed",
        remainingBalance: 0,
        transactionId: captureDetails.id
      });

      console.log("🔥 PAYMENT SAVED TO FIRESTORE:", captureDetails.id);

      // Kumpleto at maayos na HTML design response
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex; justify-content: center; align-items: center;
              min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;
            }
            .container {
              background: white; padding: 50px 40px; border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; width: 100%;
              animation: slideUp 0.5s ease-out;
            }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            .success-icon { font-size: 80px; margin-bottom: 20px; }
            h1 { color: #28a745; font-size: 32px; margin-bottom: 10px; font-weight: 700; }
            .subtitle { color: #666; font-size: 16px; margin-bottom: 30px; }
            .details { background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #dee2e6; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #666; font-size: 14px; }
            .value { color: #333; font-family: monospace; font-size: 14px; font-weight: 500; }
            .amount { font-size: 36px; font-weight: 700; color: #28a745; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
            <p class="subtitle">Your payment has been processed and captured.</p>
            <div class="details">
              <div class="detail-row">
                <span class="label">Transaction ID</span>
                <span class="value">${captureDetails.id}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status</span>
                <span class="value" style="color: #28a745; font-weight: bold;">${capture.status}</span>
              </div>
              <div class="amount">${Number(amount).toFixed(2)} ${currency}</div>
            </div>
            <p style="color: #999; font-size: 13px;">You may now close this window and return to the app.</p>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error("❌ AUTO-CAPTURE OR FIRESTORE ERROR:", err.response?.data || err.message);
      res.status(500).send("<h1>Payment Capture Failed</h1><p>Please contact support with your PayPal Order ID.</p>");
    }
  } else {
    res.status(400).send("<h1>Invalid Request</h1><p>Missing PayPal token parameters.</p>");
  }
});

// CANCEL PAGE
app.get("/cancel", (req, res) => {
  res.send(`
    <h1>Payment Cancelled</h1>
    <p>You cancelled the PayPal payment. You may now close this window.</p>
  `);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server running smoothly on port ${PORT}`);
});
