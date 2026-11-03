import razorpay from "razorpay";

const isProduction = process.env.NODE_ENV === "production";

// This value is deliberately derived server-side and returned with an order.
// The browser must initialise the Cashfree SDK in the same environment that
// created its payment session.
export const cashfreeMode = isProduction ? "production" : "sandbox";

const sandbox_payment_api_secret_key = process.env.SANDBOX_PAYMENT_KEY_SECRET;
const sandbox_payment_api_id = process.env.SANDBOX_PAYMENT_KEY_ID;

const production_payment_api_secret_key = process.env.PAYMENT_KEY_SECRET;
const production_payment_api_id = process.env.PAYMENT_KEY_ID;

let razorpayInstance: razorpay;

if (isProduction) {
  if (!production_payment_api_secret_key || !production_payment_api_id) {
    throw new Error(
      "Production Razorpay API keys are not set in environment variables.",
    );
  }

  razorpayInstance = new razorpay({
    key_id: production_payment_api_id,
    key_secret: production_payment_api_secret_key,
  });
} else {
  razorpayInstance = new razorpay({
    key_id: sandbox_payment_api_id,
    key_secret: sandbox_payment_api_secret_key,
  });
}

export default razorpayInstance;
