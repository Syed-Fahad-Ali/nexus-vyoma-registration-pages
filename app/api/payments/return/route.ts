import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import crypto from "crypto";

import razorpay from "@/utilities/payment/client";

const isProduction = process.env.NODE_ENV === "production";

/**
 * POST /api/payments/return
 *
 * Called by the client after a successful Razorpay checkout.
 * Receives { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * and verifies the payment server-side before redirecting.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          message: "Missing required payment verification fields",
          status: 400,
          data: null,
          error: "MISSING_PAYMENT_FIELDS",
          redirect: true,
          redirectUrl: "/payment/failure?reason=missing_fields",
        },
        { status: 400 },
      );
    }

    // ── 1. Verify Razorpay signature (HMAC-SHA256, timing-safe) ──
    const keySecret = isProduction
      ? process.env.PAYMENT_KEY_SECRET
      : process.env.SANDBOX_PAYMENT_KEY_SECRET;

    if (!keySecret) {
      console.error("Payment key secret is not configured");
      return NextResponse.json(
        {
          message: "Payment verification is not configured",
          status: 500,
          data: null,
          error: "VERIFICATION_NOT_CONFIGURED",
          redirect: true,
          redirectUrl: "/payment/failure?reason=verification_error",
        },
        { status: 500 },
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const receivedBuf = Buffer.from(razorpay_signature, "hex");

    const isSignatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isSignatureValid) {
      console.error(
        "Razorpay signature verification failed for order:",
        razorpay_order_id,
      );
      return NextResponse.json(
        {
          message: "Payment signature verification failed",
          status: 400,
          data: null,
          error: "SIGNATURE_MISMATCH",
          redirect: true,
          redirectUrl: `/payment/failure?order_id=${encodeURIComponent(razorpay_order_id)}`,
        },
        { status: 400 },
      );
    }

    // ── 2. Confirm order status via Razorpay API ──
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const orderStatus = order?.status; // "created" | "attempted" | "paid"

    if (orderStatus === "paid") {
      return NextResponse.json(
        {
          message: "Payment successful",
          status: 200,
          data: {
            razorpay_order_id,
            razorpay_payment_id,
          },
          error: null,
          redirect: true,
          redirectUrl: `/payment/success?order_id=${encodeURIComponent(razorpay_order_id)}`,
        },
        { status: 200 },
      );
    }

    // Order exists but isn't marked as paid yet (could be attempted/pending)
    return NextResponse.json(
      {
        message: "Payment is pending verification",
        status: 202,
        data: null,
        error: null,
        redirect: true,
        redirectUrl: `/payment/pending?order_id=${encodeURIComponent(razorpay_order_id)}`,
      },
      { status: 202 },
    );
  } catch (error) {
    // Let Next.js internal signals (prerender bail-out, redirect, notFound)
    // pass through. Only real errors continue to the code below.
    unstable_rethrow(error);

    console.error("Payment return verification failed:", error);

    return NextResponse.json(
      {
        message: "Payment verification error",
        status: 500,
        data: null,
        error: "VERIFICATION_ERROR",
        redirect: true,
        redirectUrl: "/payment/failure?reason=verification_error",
      },
      { status: 500 },
    );
  }
}
