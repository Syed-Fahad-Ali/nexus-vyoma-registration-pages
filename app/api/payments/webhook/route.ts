import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectToDatabase } from "@/database/db";
import EntryTicket from "@/database/schema/entry-ticket.schema";
import EnrolledIndividualEvent from "@/database/schema/enrolled-individual-event.schema";
import Transaction from "@/database/schema/transaction.schema";

import razorpay from "@/utilities/payment/client";
import { generateQRCode } from "@/utilities/generate-qr";
import { sendQREmail } from "@/utilities/emails/ticket-qr-mail";
import { sendEmailToPaymentSuccess } from "@/utilities/emails/payment-success.email";
import { sendEmailToPaymentFailed } from "@/utilities/emails/payment-failed.email";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const rawBody = await request.text();

    // ── 1. Validate Razorpay webhook signature header ──
    const razorpaySignature = request.headers.get("x-razorpay-signature");

    if (!razorpaySignature) {
      return NextResponse.json(
        { message: "Missing webhook signature header" },
        { status: 401 },
      );
    }

    if (!rawBody) {
      return NextResponse.json(
        { message: "Missing request body" },
        { status: 400 },
      );
    }

    // ── 2. Verify signature using HMAC-SHA256 with timing-safe compare ──
    const webhookSecret = isProduction
      ? process.env.RAZORPAY_WEBHOOK_SECRET
      : process.env.SANDBOX_RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret is not configured");
      return NextResponse.json(
        { message: "Webhook verification not configured" },
        { status: 500 },
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const receivedBuf = Buffer.from(razorpaySignature, "hex");

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      console.error("Razorpay webhook signature verification failed");
      return NextResponse.json(
        { message: "Webhook signature verification failed" },
        { status: 401 },
      );
    }

    // ── 3. Parse Razorpay webhook payload & normalize to business-logic vars ──
    const body = JSON.parse(rawBody);
    const eventType = body.event as string; // "payment.captured" | "payment.failed"
    const paymentEntity = body.payload?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json(
        { message: "Invalid webhook payload structure" },
        { status: 200 },
      );
    }

    // Razorpay order_id is their generated ID (order_...).
    // Our custom NVPG_... ID is stored as `receipt` on the order.
    const razorpayOrderId = paymentEntity.order_id as string;
    const fetchedOrder = await razorpay.orders.fetch(razorpayOrderId);
    const orderId = fetchedOrder.receipt; // Our NVPG_... custom order ID

    const customerId = (paymentEntity.notes?.userId as string) ?? "";
    const customerEmail = paymentEntity.email as string;
    const customerName =
      (paymentEntity.notes?.userName as string) || customerEmail;
    const paymentId = paymentEntity.id as string; // pay_...
    const orderAmount = Number(fetchedOrder.amount) / 100; // paise → rupees

    // Map Razorpay event types to the status values the business logic expects
    const paymentStatus =
      eventType === "payment.captured"
        ? "SUCCESS"
        : eventType === "payment.failed"
          ? "FAILED"
          : null;

    if (!paymentStatus) {
      // Unhandled event type (e.g. payment.authorized) — acknowledge and skip
      return NextResponse.json(
        { message: `Unhandled event type: ${eventType}` },
        { status: 200 },
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // BUSINESS LOGIC BELOW — identical to the original implementation
    // ════════════════════════════════════════════════════════════════════

    const entryTicket = await EntryTicket.findOne({ userId: customerId });

    if (!entryTicket) {
      console.error(`Entry ticket not found for customerId: ${customerId}`);
      return NextResponse.json(
        { message: "Entry ticket not found for the given customerId" },
        { status: 404 },
      );
    }

    if (paymentStatus === "SUCCESS") {
      if (orderId && orderId.startsWith("NVPG_TECH_")) {
        // `NVPG_TECH_${newTransaction._id}_${Date.now()}`
        const transaction_id = orderId.split("_")[2];
        const transaction = await Transaction.findById(transaction_id);

        if (!transaction) {
          console.error(
            `Transaction not found for transaction_id: ${transaction_id}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction not found for the given transaction_id",
          );
          return NextResponse.json(
            { message: "Transaction not found for the given transaction_id" },
            { status: 404 },
          );
        }

        if (transaction.userId.toString() !== customerId) {
          console.error(
            `Transaction userId does not match customerId: ${customerId}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction userId does not match customerId",
          );
          return NextResponse.json(
            { message: "Transaction userId does not match customerId" },
            { status: 200 },
          );
        }

        if (transaction.status === "completed") {
          return NextResponse.json(
            { message: "Payment already processed for this transaction" },
            { status: 200 },
          );
        }

        if (entryTicket && entryTicket.isPaid === false) {
          const qr_code = await generateQRCode({
            userId: entryTicket.userId,
            userEmail: customerEmail,
          });
          await sendQREmail(customerEmail, customerName, qr_code);
          entryTicket.isPaid = true;
          await entryTicket.save();
        }

        entryTicket.isTechEvents = true;
        transaction.status = "completed";
        transaction.isTechEvents = true;
        await transaction.save();
        await entryTicket.save();

        await sendEmailToPaymentSuccess(
          customerEmail,
          customerName,
          orderId,
          orderAmount,
          paymentId,
        );

        return NextResponse.json(
          { message: "Payment verified and entry ticket updated successfully" },
          { status: 200 },
        );
      } else if (orderId && orderId.startsWith("NVPG_")) {
        // `NVPG_${newTransaction._id}_${Date.now()}`
        const transaction_id = orderId.split("_")[1];
        const transaction = await Transaction.findById(transaction_id);

        if (!transaction) {
          console.error(
            `Transaction not found for transaction_id: ${transaction_id}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction not found for the given transaction_id",
          );
          return NextResponse.json(
            { message: "Transaction not found for the given transaction_id" },
            { status: 404 },
          );
        }

        if (transaction.userId.toString() !== customerId) {
          console.error(
            `Transaction userId does not match customerId: ${customerId}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction userId does not match customerId",
          );
          return NextResponse.json(
            { message: "Transaction userId does not match customerId" },
            { status: 200 },
          );
        }

        if (transaction.status === "completed") {
          return NextResponse.json(
            { message: "Payment already processed for this transaction" },
            { status: 200 },
          );
        }

        if (transaction.enrolledIndividualEvents) {
          const enrolledIndividualEvents = transaction.enrolledIndividualEvents;
          for (const enrolledEvent of enrolledIndividualEvents) {
            const enrolledEventDoc =
              await EnrolledIndividualEvent.findById(enrolledEvent);
            if (!enrolledEventDoc) {
              console.error(
                `Enrolled individual event not found: ${enrolledEvent}`,
              );
              continue;
            }
            await EnrolledIndividualEvent.findByIdAndUpdate(enrolledEvent, {
              isPaid: true,
            });
          }
        }

        if (entryTicket && entryTicket.isPaid === false) {
          const qr_code = await generateQRCode({
            userId: entryTicket.userId,
            userEmail: customerEmail,
          });
          await sendQREmail(customerEmail, customerName, qr_code);
          entryTicket.isPaid = true;
          await entryTicket.save();
        }

        transaction.status = "completed";
        await transaction.save();

        await sendEmailToPaymentSuccess(
          customerEmail,
          customerName,
          orderId,
          orderAmount,
          paymentId,
        );

        return NextResponse.json(
          { message: "Payment verified and entry ticket updated successfully" },
          { status: 200 },
        );
      }
    } else if (paymentStatus === "FAILED") {
      if (orderId && orderId.startsWith("NVPG_TECH_")) {
        const transaction_id = orderId.split("_")[2];
        const transaction = await Transaction.findById(transaction_id);

        if (!transaction) {
          console.error(
            `Transaction not found for transaction_id: ${transaction_id}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction not found for the given transaction_id",
          );
          return NextResponse.json(
            { message: "Transaction not found for the given transaction_id" },
            { status: 404 },
          );
        }

        if (transaction.userId.toString() !== customerId) {
          console.error(
            `Transaction userId does not match customerId: ${customerId}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction userId does not match customerId",
          );
          return NextResponse.json(
            { message: "Transaction userId does not match customerId" },
            { status: 400 },
          );
        }

        if (transaction) {
          transaction.status = "failed";
          await transaction.save();
        }
        await sendEmailToPaymentFailed(
          customerEmail,
          customerName,
          orderId,
          orderAmount,
          "Payment failed or cancelled",
        );
        return NextResponse.json(
          { message: "Payment failed or cancelled" },
          { status: 400 },
        );
      } else if (orderId && orderId.startsWith("NVPG_")) {
        const transaction_id = orderId.split("_")[1];
        const transaction = await Transaction.findById(transaction_id);

        if (!transaction) {
          console.error(
            `Transaction not found for transaction_id: ${transaction_id}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction not found for the given transaction_id",
          );
          return NextResponse.json(
            { message: "Transaction not found for the given transaction_id" },
            { status: 200 },
          );
        }

        if (transaction.userId.toString() !== customerId) {
          console.error(
            `Transaction userId does not match customerId: ${customerId}`,
          );
          await sendEmailToPaymentFailed(
            customerEmail,
            customerName,
            orderId,
            orderAmount,
            "Transaction userId does not match customerId",
          );
          return NextResponse.json(
            { message: "Transaction userId does not match customerId" },
            { status: 200 },
          );
        }

        if (transaction) {
          transaction.status = "failed";
          await transaction.save();
        }
        await sendEmailToPaymentFailed(
          customerEmail,
          customerName,
          orderId,
          orderAmount,
          "Payment failed or cancelled",
        );
        return NextResponse.json(
          { message: "Payment failed or cancelled" },
          { status: 200 },
        );
      }
    }
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
