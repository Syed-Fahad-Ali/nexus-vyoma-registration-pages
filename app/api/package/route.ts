import { verifyJWT } from "@/utilities/jwt";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { TokenData } from "../enrollement/enroll-event/route";
import { connectToDatabase } from "@/database/db";
import RegisterUser from "@/database/schema/register-user.schema";
import Package from "@/database/schema/package.schema";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, title, isEntryTicket, price } = body;

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
            eventId,
            isEntryTicket,
            price
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
            message: "Error creating enrolled events",
            data: null,
            error: error,
            redirect: false,
            redirectUrl: null
        }, { status: 500 })
    }
}

