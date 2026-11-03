import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import mongoose from "mongoose";
import { connectToDatabase } from "@/database/db";
import RegisterUser from "@/database/schema/register-user.schema";
import Transaction from "@/database/schema/transaction.schema";
import EntryTicket from "@/database/schema/entry-ticket.schema";
import EnrolledIndividualEvent from "@/database/schema/enrolled-individual-event.schema";
import Event from "@/database/schema/event.schema";
import Package from "@/database/schema/package.schema";

import razorpay from "@/utilities/payment/client";
import { verifyJWT } from "@/utilities/jwt";
import { TokenData } from "@/app/api/enrollement/enrolled-event/route";
import type { Orders } from "razorpay/dist/types/orders";

export async function POST(request: NextRequest) {
  try {
    const { packageId } = await request.json();

    if (!packageId || mongoose.Types.ObjectId.isValid(packageId) === false) {
      return NextResponse.json(
        {
          message: "Invalid packageId provided",
          data: null,
          error: "INVALID_PACKAGE_ID",
          redirect: false,
          redirectUrl: null,
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const userToken = cookieStore.get("nv-session")?.value;
    const tempToken = cookieStore.get("nv-session-temp")?.value;

    if (!userToken || !tempToken) {
      return NextResponse.json(
        {
          message: "Required tokens are missing",
          data: null,
          error: "Missing session token",
          redirect: true,
          redirectUrl: "/register/check-email",
        },
        { status: 401 },
      );
    }

    const userData = verifyJWT(userToken) as TokenData | null;
    const tempData = verifyJWT(tempToken) as TokenData | null;

    if (!userData?.user?.id || !tempData?.user?.id) {
      return NextResponse.json(
        {
          message: "Invalid or expired tokens",
          data: null,
          error: "Invalid session token",
          redirect: true,
          redirectUrl: "/register/check-email",
        },
        { status: 401 },
      );
    }

    // Ensure both tokens belong to the same user.
    if (userData.user.id !== tempData.user.id) {
      return NextResponse.json(
        {
          message: "Session tokens do not match",
          data: null,
          error: "INVALID_SESSION",
          redirect: true,
          redirectUrl: "/register/check-email",
        },
        { status: 401 },
      );
    }

    await connectToDatabase();

    const user = await RegisterUser.findById(userData.user.id);
    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
          data: null,
          error: "USER_NOT_FOUND",
          redirect: true,
          redirectUrl: "/register/check-email",
        },
        { status: 404 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const techEvents = await Event.find({ isTechEvent: true });

    const eventPackage = await Package.findById(packageId).populate("eventIds");

    if (!eventPackage) {
      return NextResponse.json(
        {
          message: "Event package not found",
          data: null,
          error: "PACKAGE_NOT_FOUND",
          redirect: true,
          redirectUrl: "/register/event-package",
        },
        { status: 404 },
      );
    }
    let generateOrderId: string = "";
    let enrolledIndividualEvents: string[] = [];

    let priceOfTeamEvents = 0;
    let priceOfIndividualEvents = 0;

    const eventIds: any[] = eventPackage.eventIds;
    if (eventIds.length === 0) {
      // Here we have to handle the tech events.
      // I don't know what will be the logic but if the eventIds array is empty
      // consider as tech events which includes 15 events.
      const entryTicket = await EntryTicket.findOne({ userId: user._id });

      if (
        entryTicket &&
        entryTicket.isPaid === true &&
        entryTicket.isTechEvents === true
      ) {
        return NextResponse.json(
          {
            message: "You have already paid for the tech events package",
            data: null,
            error: "ALREADY_PAID_FOR_TECH_EVENTS",
            redirect: false,
            redirectUrl: null,
          },
          { status: 400 },
        );
      } else if (!entryTicket) {
        await EntryTicket.create({
          userId: user._id,
        });
      }
      generateOrderId = `NVPG_TECH_${user._id}_${Date.now()}`;

      const individualEvents = techEvents.filter(
        (event) => event.participants_type === "individual",
      );
      const teamEvents = techEvents.filter(
        (event) => event.participants_type === "team",
      );

      priceOfTeamEvents = teamEvents.reduce(
        (total, event) => total + event.entry_fee,
        0,
      );
      priceOfIndividualEvents = individualEvents.reduce(
        (total, event) => total + event.entry_fee,
        0,
      );
    } else {
      for (const eventId of eventIds) {
        const eventType = eventId.participants_type;

        if (eventType === "individual") {
          const entryTicket = await EntryTicket.findOne({ userId: user._id });

          if (!entryTicket) {
            await EntryTicket.create({
              userId: user._id,
            });
          }

          const alreadyEnrolled = await EnrolledIndividualEvent.findOne({
            register_user_id: user._id,
            event_id: eventId._id,
            isPaid: true,
          });

          if (alreadyEnrolled) {
            return NextResponse.json(
              {
                message: "You have already paid for this event package",
                data: null,
                error: "ALREADY_PAID_FOR_PACKAGE",
                redirect: false,
                redirectUrl: null,
              },
              { status: 400 },
            );
          }

          const reservationTime = new Date(Date.now() + 5 * 60 * 1000);

          const enrolledEvents = await EnrolledIndividualEvent.create({
            register_user_id: user._id,
            event_id: eventId._id,
            reservation_time: reservationTime,
            transaction_id: null,
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          });

          if (!enrolledEvents) {
            return NextResponse.json(
              {
                message: "Failed to enroll in individual event",
                data: null,
                error: "FAILED_TO_ENROLL_EVENT",
                redirect: false,
                redirectUrl: null,
              },
              { status: 500 },
            );
          }

          enrolledIndividualEvents.push(enrolledEvents._id);
        } else if (eventType === "team") {
          // Kaisa aata bhai team events? Bcz team events konse bhi nahi hai
          // excluding tech events which will be handled above this
          // and free events which is already handled.
          // Make sure to return ERROR below
          return NextResponse.json(
            {
              message: "Team events are not supported yet",
              data: null,
              error: "TEAM_EVENTS_NOT_SUPPORTED",
              redirect: false,
              redirectUrl: null,
            },
            { status: 400 },
          );
        } else {
          return NextResponse.json(
            {
              message: "Unknown event type encountered",
              data: null,
              error: "UNKNOWN_EVENT_TYPE",
              redirect: false,
              redirectUrl: null,
            },
            { status: 400 },
          );
        }
      }

      if (enrolledIndividualEvents.length === 0) {
        return NextResponse.json(
          {
            message: "No enrolled individual events found for the user",
            data: null,
            error: "NO_ENROLLED_INDIVIDUAL_EVENTS",
            redirect: false,
            redirectUrl: null,
          },
          { status: 404 },
        );
      }
    }

    let newTransaction: any = null;
    if (eventIds.length > 0) {
      newTransaction = await Transaction.create({
        userId: user._id,
        enrolledIndividualEvents,
        status: "creating",
        individualEventsAmount: eventPackage.price,
      });

      if (!newTransaction) {
        return NextResponse.json(
          {
            message: "Failed to create new transaction",
            data: null,
            error: "FAILED_TO_CREATE_TRANSACTION",
            redirect: false,
            redirectUrl: null,
          },
          { status: 500 },
        );
      }

      generateOrderId = `NVPG_${newTransaction._id}_${Date.now()}`;
    } else if (eventIds.length === 0) {
      newTransaction = await Transaction.create({
        userId: user._id,
        enrolledIndividualEvents: [],
        status: "creating",
        individualEventsAmount: priceOfIndividualEvents,
        teamEventsAmount: priceOfTeamEvents,
        isTechEvents: true,
      });

      if (!newTransaction) {
        return NextResponse.json(
          {
            message: "Failed to create new transaction",
            data: null,
            error: "FAILED_TO_CREATE_TRANSACTION",
            redirect: false,
            redirectUrl: null,
          },
          { status: 500 },
        );
      }

      generateOrderId = `NVPG_TECH_${newTransaction._id}_${Date.now()}`;
    }

    let price = eventPackage.price + Number(process.env.SERVICE_FEE || 30);

    const adminEmails = JSON.parse(process.env.ADMIN_EMAILS as string) as string[];
    console.log("Admin Emails:", adminEmails);

    if (adminEmails.length > 0 && adminEmails.includes(user.email)) {
      price = 1;
    }

    // Now payments order creation here
    const razorpayRequest = {
      amount: Math.round(price * 100), // Amount in paise
      currency: "INR",
      receipt: generateOrderId,
      notes: {
        userId: user._id.toString(),
        userName: user.full_name,
      }
    }

    const razorpayResponse = await razorpay.orders.create(razorpayRequest) as Orders.RazorpayOrder;

    console.log("Razorpay Order Creation Response:", razorpayResponse);
    if (!razorpayResponse?.id || !razorpayResponse?.amount) {
      return NextResponse.json(
        {
          message: "Failed to initiate payment with Razorpay",
          data: null,
          error: "FAILED_TO_INITIATE_PAYMENT",
          redirect: false,
          redirectUrl: null,
        },
        { status: 500 },
      );
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      newTransaction._id,
      {
        status: "pending",
      },
      { new: true },
    );

    if (!updatedTransaction) {
      return NextResponse.json(
        {
          message: "Failed to update transaction",
          data: null,
          error: "FAILED_TO_UPDATE_TRANSACTION",
          redirect: false,
          redirectUrl: null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Payment initiation successful",
        data: {
          order_id: razorpayResponse.id,
          order_status: razorpayResponse.status,
          order_amount: razorpayResponse.amount,
          order_currency: razorpayResponse.currency,
          key_id: process.env.NODE_ENV === "production"
            ? process.env.PAYMENT_KEY_ID
            : process.env.SANDBOX_PAYMENT_KEY_ID,
          prefill: {
            name: user.full_name,
            email: user.email,
            contact: user.phone_number,
          },
        },
        error: null,
        redirect: false,
        redirectUrl: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Payment initiation route failed:", error);

    return NextResponse.json(
      {
        message: "Unable to initiate payment",
        data: null,
        error: "PAYMENT_INITIATION_FAILED",
      },
      { status: 500 },
    );
  }
}