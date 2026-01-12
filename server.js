const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getAccessToken, createOrder, captureOrder } = require("./paypal");
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

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
    console.error("❌ CREATE ORDER ERROR:",
      err.response?.data || err.message
    );
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
    console.error("❌ CAPTURE ORDER ERROR:",
      err.response?.data || err.message
    );
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

  // If token exists, try to capture the payment
  if (token) {
    try {
      console.log("🔄 Attempting auto-capture...");
      
      const capture = await captureOrder(token);
      
      console.log("========================================");
      console.log("✅ PAYMENT CAPTURED SUCCESSFULLY!");
      console.log("💰 Capture ID:", capture.id);
      console.log("📊 Status:", capture.status);
      console.log("========================================");

      // Get payment details
      const captureDetails = capture.purchase_units[0].payments.captures[0];
      const amount = captureDetails.amount.value;
      const currency = captureDetails.amount.currency_code;
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

      // Send beautiful success page
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            
            .container {
              background: white;
              padding: 50px 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
              width: 100%;
              animation: slideUp 0.5s ease-out;
            }
            
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .success-icon {
              font-size: 80px;
              margin-bottom: 20px;
              animation: scaleIn 0.5s ease-out 0.2s both;
            }
            
            @keyframes scaleIn {
              from {
                transform: scale(0);
              }
              to {
                transform: scale(1);
              }
            }
            
            h1 {
              color: #28a745;
              font-size: 32px;
              margin-bottom: 10px;
              font-weight: 700;
            }
            
            .subtitle {
              color: #666;
              font-size: 16px;
              margin-bottom: 30px;
            }
            
            .details {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 12px;
              margin: 25px 0;
            }
            
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #dee2e6;
            }
            
            .detail-row:last-child {
              border-bottom: none;
            }
            
            .label {
              font-weight: 600;
              color: #666;
              font-size: 14px;
            }
            
            .value {
              color: #333;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              font-weight: 500;
            }
            
            .amount {
              font-size: 36px;
              font-weight: 700;
              color: #28a745;
              margin: 20px 0;
            }
            
            .btn {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 15px 40px;
              border-radius: 10px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin-top: 20px;
              transition: transform 0.2s, box-shadow 0.2s;
              width: 100%;
            }
            
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
            }
            
            .btn:active {
              transform: translateY(0);
            }
            
            .footer-text {
              color: #999;
              font-size: 13px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
            <p class="subtitle">Your payment has been processed and captured</p>
            
            <div class="amount">${currency} ${amount}</div>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Transaction ID</span>
                <span class="value">${capture.id}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status</span>
                <span class="value">${capture.status}</span>
              </div>
              <div class="detail-row">
                <span class="label">Order ID</span>
                <span class="value">${token}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payer ID</span>
                <span class="value">${PayerID}</span>
              </div>
            </div>

            <button class="btn" onclick="window.close()">Close Window</button>
            
            <p class="footer-text">
              Thank you for your payment! You may now close this window.
            </p>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error("========================================");
      console.error("❌ AUTO-CAPTURE FAILED!");
      console.error("Error:", error.response?.data || error.message);
      console.error("========================================");
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Approved</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h2 { 
              color: #ffc107; 
              font-size: 28px;
              margin-bottom: 20px;
            }
            .icon {
              font-size: 60px;
              margin-bottom: 20px;
            }
            .error-details {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
              font-family: monospace;
              font-size: 12px;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⚠️</div>
            <h2>Payment Approved</h2>
            <p>Your payment was approved but could not be captured automatically.</p>
            <div class="error-details">
              <strong>Order ID:</strong> ${token}<br>
              <strong>Error:</strong> ${error.message}
            </div>
            <p><small>Please contact support to complete the transaction.</small></p>
          </div>
        </body>
        </html>
      `);
    }
  } else {
    // No token provided
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f0f0;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          h2 { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>✅ Payment Successful</h2>
          <p>You may now return to the app.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// CANCEL PAGE
app.get("/cancel", (req, res) => {
  console.log("========================================");
  console.log("❌ USER CANCELLED PAYMENT");
  console.log("========================================");
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Cancelled</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          padding: 20px;
        }
        .container {
          background: white;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        h2 { 
          color: #dc3545; 
          font-size: 32px;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h2>Payment Cancelled</h2>
        <p>You cancelled the PayPal payment.</p>
        <p><small>You may now close this window and return to the app.</small></p>
      </div>
    </body>
    </html>
  `);
});

// START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 PayPal Server Running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Base URL: ${process.env.PAYPAL_BASE_URL}`);
  console.log(`========================================`);
});