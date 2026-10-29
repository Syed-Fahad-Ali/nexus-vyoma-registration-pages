import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { connectToDatabase } from "@/database/db";
import RegisterUser from "@/database/schema/register-user.schema";
import Package from "@/database/schema/package.schema";
import EnrolledIndividualEvent from "@/database/schema/enrolled-individual-event.schema";
import Event from "@/database/schema/event.schema";
import mongoose from "mongoose";

import { verifyJWT } from "@/utilities/jwt";
import { TokenData } from "../enrollement/enroll-event/route";
import EnrolledTeamEvent from "@/database/schema/enrolled-team-event.schema";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, title, isEntryTicket, price, isShowOnEntryPage, indexPackage } = body;

        if (!eventId || !title || isEntryTicket === undefined ||
            price === undefined || title.trim() === "" || price === 0 ||
            isEntryTicket === null || isShowOnEntryPage === undefined ||
            indexPackage === undefined) {
            return NextResponse.json({
                message: "Missing required fields",
                data: null,
                error: "Required fields are missing",
                redirect: false,
                redirectUrl: null
            }, { status: 400 });
        }

        let eventIds: string[] = [];
        if (eventId) {
            eventIds = eventId.split(",").map((id: string) => id.trim()).filter((id: string) => id !== "");
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
                { status: 401 }
            );
        }

        const userData = verifyJWT(userToken) as TokenData | null;
        const tempData = verifyJWT(tempToken) as TokenData | null;

        if (userData === null || tempData === null) {
            return NextResponse.json(
                {
                    message: "Invalid or expired tokens",
                    data: null,
                    error: "Invalid session token",
                    redirect: true,
                    redirectUrl: "/register/check-email",
                },
                { status: 401 }
            );
        }

        await connectToDatabase();

        // Fetch User Details
        const user = await RegisterUser.findById(userData.user.id);

        if (!user) {
            return NextResponse.json(
                {
                    message: "User not found",
                    data: null,
                    error: "User does not exist",
                    redirect: true,
                    redirectUrl: "/register/check-email",
                },
                { status: 404 });
        }

        const emails: string[] = ["syedaliquadri100@gmail.com", "fahadsyed7799@gmail.com", "jeelanibafanna22@gmail.com"];

        if (user && emails.includes(user.email) !== true) {
            return NextResponse.json(
                {
                    message: "User email is not in the allowed list",
                    data: null,
                    error: "Email not allowed",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 403 }
            );
        }

        const newPackage = await Package.create({
            title,
            eventIds,
            isEntryTicket,
            price,
            isShowOnEntryPage,
            indexPackage
        });

        if (!newPackage) {
            return NextResponse.json({
                message: "Failed to create package",
                data: null,
                error: "Package creation failed",
                redirect: false,
                redirectUrl: null
            }, { status: 500 });
        }


        return NextResponse.json({
            message: "Package created successfully",
            data: null,
            error: null,
            redirect: false,
            redirectUrl: null
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({
            message: "An error occurred while creating the package",
            data: null,
            error: error,
            redirect: false,
            redirectUrl: null
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
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
                { status: 401 }
            );
        }

        const userData = verifyJWT(userToken) as TokenData | null;
        const tempData = verifyJWT(tempToken) as TokenData | null;

        if (userData === null || tempData === null) {
            return NextResponse.json(
                {
                    message: "Invalid or expired tokens",
                    data: null,
                    error: "Invalid session token",
                    redirect: true,
                    redirectUrl: "/register/check-email",
                },
                { status: 401 }
            );
        }

        await connectToDatabase();

        // Fetch User Details
        const user = await RegisterUser.findById(userData.user.id);

        if (!user) {
            return NextResponse.json(
                {
                    message: "User not found",
                    data: null,
                    error: "User does not exist",
                    redirect: true,
                    redirectUrl: "/register/check-email",
                },
                { status: 404 });
        }

        await Event;

        const packages = await Package.find({}).populate("eventIds");

        if (!packages || packages.length === 0) {
            return NextResponse.json({
                message: "No packages found",
                data: null,
                error: "No packages available",
                redirect: false,
                redirectUrl: null
            }, { status: 404 });
        }

        let response: any[] = [];
        for (let i = 0; i < packages.length; i++) {
            let isSoldOut = false;
            let fewRemaining = false;
            let eventList: any[] = [];

            const packageEvent = packages[i];
            const events = packageEvent.eventIds;

            for (const event of events) {
                const participantLimit = event.participant_limit;
                const participantType = event.participants_type;

                if (participantType === "individual") {
                    const count = await EnrolledIndividualEvent.countDocuments({
                        event_id: event._id,
                        $or: [
                            { isPaid: true },
                            { isPaid: false, reservation_time: { $gt: new Date() } }
                        ]
                    });

                    if (participantLimit <= count) {
                        fewRemaining = true;
                        isSoldOut = true;
                    }
                    else if (participantLimit - count <= 10) {
                        fewRemaining = true;
                        isSoldOut = false;
                    } else {
                        isSoldOut = false;
                        fewRemaining = false;
                    }

                    eventList.push({
                        ...event.toObject(),
                        isSoldOut,
                        fewRemaining
                    });
                } else if (participantType === "team") {
                    const count = await EnrolledTeamEvent.countDocuments({
                        event_id: event._id,
                        $or: [
                            { isPaid: true },
                            { isPaid: false, reservation_time: { $gt: new Date() } }
                        ]
                    });

                    if (participantLimit <= count) {
                        isSoldOut = true;
                    }
                    else if (participantLimit - count <= 10) {
                        fewRemaining = true;
                        isSoldOut = false;
                    } else {
                        isSoldOut = false;
                        fewRemaining = false;
                    }

                    eventList.push({
                        ...event.toObject(),
                        isSoldOut,
                        fewRemaining
                    });
                }
            }

            response.push({
                package: { ...packageEvent.toObject(), events: eventList }
            });
        }

        if (!packages || packages.length === 0) {
            return NextResponse.json({
                message: "No packages found",
                data: null,
                error: "No packages available",
                redirect: false,
                redirectUrl: null
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "Package fetched successfully",
            data: response,
            error: null,
            redirect: false,
            redirectUrl: null
        }, { status: 200 });
    } catch (error) {
        console.log("Error fetching package:", error)
        return NextResponse.json({
            message: "Error fetching package",
            data: null,
            error: error,
            redirect: false,
            redirectUrl: null
        }, { status: 500 })
    }
}