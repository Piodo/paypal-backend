async function createOrder(amount) {
  const token = await getAccessToken();

  const res = await axios.post(
    `${PAYPAL_BASE_URL}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "PHP",
            value: amount.toFixed(2)
          }
        }
      ],
      application_context: {
        return_url: "https://paypal-backend-93xe.onrender.com/success",
        cancel_url: "https://paypal-backend-93xe.onrender.com/cancel",
        brand_name: "Your App Name",
        landing_page: "LOGIN",
        user_action: "PAY_NOW"
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}
