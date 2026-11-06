import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { connectToDatabase } from "@/database/db";
import RegisterUser from "@/database/schema/register-user.schema";
import EventTeamMember from "@/database/schema/event-team-member.schema";

import { verifyJWT } from "@/utilities/jwt";
import { TokenData } from "../../enrollement/enrolled-event/route";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, event_id, full_name } = body;
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

        if (!email || !event_id || !full_name) {
            return NextResponse.json(
                {
                    message: "Missing required fields",
                    data: null,
                    error: "Incomplete request body",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 400 }
            );
        }

        const eventIdArray = event_id.split(",").map((id: string) => id.trim());
        if (eventIdArray.length === 0) {
            return NextResponse.json(
                {
                    message: "Invalid event_id format",
                    data: null,
                    error: "event_id must be a comma-separated string of IDs",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 400 }
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

        const adminEmails = process.env.ADMIN_EMAILS!
        if (!adminEmails.includes(user.email)) {
            return NextResponse.json(
                {
                    message: "Unauthorized access",
                    data: null,
                    error: "User is not an admin",
                    redirect: true,
                    redirectUrl: "/register/check-email",
                },
                { status: 403 }
            );
        }

        const existingMember = await EventTeamMember.findOne({ email });
        if (existingMember) {
            return NextResponse.json(
                {
                    message: "Team member already exists",
                    data: null,
                    error: "Duplicate team member",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 409 }
            );
        }

        const newTeamMember = await EventTeamMember.create({
            event_id: eventIdArray,
            email,
            full_name
        });

        if (!newTeamMember) {
            return NextResponse.json(
                {
                    message: "Failed to create team member",
                    data: null,
                    error: "Database error",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Team member has registered and purchased the entry ticket.",
            data: {

            },
            error: null,
            redirect: false,
            redirectUrl: null
        }, { status: 200 });
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