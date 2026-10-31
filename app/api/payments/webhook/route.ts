import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/database/db";
import EntryTicket from "@/database/schema/entry-ticket.schema";
import EnrolledIndividualEvent from "@/database/schema/enrolled-individual-event.schema";
import Transaction from "@/database/schema/transaction.schema";

import cashfree from "@/utilities/payment/client";
import { generateQRCode } from "@/utilities/generate-qr";
import { sendQREmail } from "@/utilities/emails/ticket-qr-mail";
import { sendEmailToPaymentSuccess } from "@/utilities/emails/payment-success.email";
import { sendEmailToPaymentFailed } from "@/utilities/emails/payment-failed.email";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const rawBody = await request.text();

    if (
      !request.headers.get("x-webhook-signature") ||
      !request.headers.get("x-webhook-timestamp")
    ) {
      return NextResponse.json(
        { message: "Missing webhook signature headers" },
        { status: 401 },
      );
    }

    if (!rawBody) {
      return NextResponse.json(
        { message: "Missing request body" },
        { status: 400 },
      );
    }

    try {
      cashfree.PGVerifyWebhookSignature(
        request.headers.get("x-webhook-signature")!,
        rawBody,
        request.headers.get("x-webhook-timestamp")!,
      );
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return NextResponse.json(
        { message: "Error verifying webhook signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody);

    const orderId = body.data?.order?.order_id;
    const customerId = body.data?.customer_details?.customer_id;
    const customerEmail = body.data?.customer_details?.customer_email;
    const customerName = body.data?.customer_details?.customer_name;
    const paymentStatus = body.data?.payment?.payment_status;
    const paymentAmount = body.data?.payment?.payment_amount;
    const orderAmount = body.data?.order?.order_amount;

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
            { status: 400 },
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
          body.data?.payment?.payment_id || null,
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
            { status: 400 },
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
          body.data?.payment?.payment_id || null,
        );

        return NextResponse.json(
          { message: "Payment verified and entry ticket updated successfully" },
          { status: 200 },
        );
      }
    } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
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
      }
    }
  } catch (error) {
    console.error("Cashfree webhook error:", error);

    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
