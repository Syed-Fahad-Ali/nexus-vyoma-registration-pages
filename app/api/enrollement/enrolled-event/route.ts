import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { connectToDatabase } from "@/database/db";
import RegisterUser from "@/database/schema/register-user.schema";
import Event from "@/database/schema/event.schema";
import EnrolledIndividualEvent from "@/database/schema/enrolled-individual-event.schema";
import EnrolledTeamEvent from "@/database/schema/enrolled-team-event.schema";
import EntryTicket from "@/database/schema/entry-ticket.schema";

import { verifyJWT } from "@/utilities/jwt";

export interface TokenData {
    user: {
        id: string;
        name: string;
        email: string;
    };
}

// When /enroll-event page is loaded, after verification of the user token, we will fetch the user data and enrolled events data and also fetch the events excluding the ones the user is already enrolled in. We will also extend the reservation time for the events that are not paid yet and are not extended yet. The reservation time will be extended by 5 minutes from the current time.
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

        if (userData.user.id !== tempData.user.id) {
            return NextResponse.json(
                {
                    message: "Session mismatch",
                    data: null,
                    error: "Session tokens belong to different users",
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

        const entryTicket = await EntryTicket.findOne({ userId: user._id, isPaid: true });

        if (!entryTicket) {
            return NextResponse.json(
                {
                    message: "Entry ticket not found",
                    data: null,
                    error: "User does not have a paid entry ticket",
                    redirect: true,
                    redirectUrl: "/packages",
                },
                { status: 404 });
        }

        let purchasedEvents: any[] = [];
        let availableFreeEvents: any[] = [];
        let availableTechEvents: any[] = [];

        // Fetch Purchased Events: ===================>
        const enrolledIndividualEvents = await EnrolledIndividualEvent.find({
            register_user_id: user._id,
            isPaid: true,
        })
            .populate("register_user_id", "full_name email phone_number")
            .populate("event_id", "title short_description participants_type")

        const enrolledTeamEvents = await EnrolledTeamEvent.find({
            $or: [
                { team_leader_register_user_id: user._id },
                { team_emails: user.email }
            ],
            isPaid: true,
        })
            .populate("team_leader_register_user_id", "full_name email phone_number")
            .populate("event_id", "title short_description participants_type")

        purchasedEvents = [...enrolledIndividualEvents, ...enrolledTeamEvents];

        // Fetch Available Events: ===================>

        const availableEvents = await Event.find();

        if (availableEvents.length > 0) {
            // Filter out free available events that the user is not enrolled in and not sold out.
            const freeEvents = availableEvents.filter((event) => event.entry_fee === 0);

            for (const event of freeEvents) {
                let isSoldOut = false;
                if (event.participants_type === "individual") {
                    const [count, userEnrollment] = await Promise.all([
                        EnrolledIndividualEvent.countDocuments({
                            event_id: event._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        }),
                        EnrolledIndividualEvent.exists({
                            event_id: event._id,
                            register_user_id: user._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        })
                    ])

                    if (userEnrollment) {
                        continue; // Skip this event as the user is already enrolled
                    }

                    if (count >= event.participant_limit) {
                        isSoldOut = true;
                    }

                    availableFreeEvents.push({
                        ...event.toObject(),
                        isSoldOut
                    });
                } else if (event.participants_type === "team") {
                    const [count, userEnrollment] = await Promise.all([
                        EnrolledTeamEvent.countDocuments({
                            event_id: event._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        }),
                        EnrolledTeamEvent.exists({
                            event_id: event._id,
                            $and: [
                                {
                                    $or: [
                                        { team_leader_register_user_id: user._id },
                                        { team_emails: user.email }
                                    ]
                                },
                                {
                                    $or: [
                                        { isPaid: true },
                                        { isPaid: false, reservation_time: { $gt: new Date() } }
                                    ]
                                }
                            ]
                        })
                    ])

                    if (userEnrollment) {
                        continue; // Skip this event as the user is already enrolled
                    }

                    if (count >= event.participant_limit) {
                        isSoldOut = true;
                    }

                    availableFreeEvents.push({
                        ...event.toObject(),
                        isSoldOut
                    });
                }
            }

            // Filter out tech events that the user is not enrolled in and not sold out.
            const techEvents = availableEvents.filter((event) => event.isTechEvent === true);

            for (const event of techEvents) {
                let isSoldOut = false;
                if (event.participants_type === "individual") {
                    const [count, userEnrollment] = await Promise.all([
                        EnrolledIndividualEvent.countDocuments({
                            event_id: event._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        }),
                        EnrolledIndividualEvent.exists({
                            event_id: event._id,
                            register_user_id: user._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        })
                    ])

                    if (userEnrollment) {
                        continue; // Skip this event as the user is already enrolled
                    }

                    if (count >= event.participant_limit) {
                        isSoldOut = true;
                    }

                    availableTechEvents.push({
                        ...event.toObject(),
                        isSoldOut
                    });
                } else if (event.participants_type === "team") {
                    const [count, userEnrollment] = await Promise.all([
                        EnrolledTeamEvent.countDocuments({
                            event_id: event._id,
                            $or: [
                                { isPaid: true },
                                { isPaid: false, reservation_time: { $gt: new Date() } }
                            ]
                        }),
                        EnrolledTeamEvent.exists({
                            event_id: event._id,
                            $and: [
                                {
                                    $or: [
                                        { team_leader_register_user_id: user._id },
                                        { team_emails: user.email }
                                    ]
                                },
                                {
                                    $or: [
                                        { isPaid: true },
                                        { isPaid: false, reservation_time: { $gt: new Date() } }
                                    ]
                                }
                            ]
                        })
                    ])

                    if (userEnrollment) {
                        continue; // Skip this event as the user is already enrolled
                    }

                    if (count >= event.participant_limit) {
                        isSoldOut = true;
                    }

                    availableTechEvents.push({
                        ...event.toObject(),
                        isSoldOut
                    });
                }
            }
        }



















































        // Fetch Paid Events for the User
        // const paidIndividualEvents = await EnrolledIndividualEvent.find({
        //     register_user_id: user._id,
        //     isPaid: true
        // }).select("-transaction_id -__v");

        // const rawPaidTeamEvents = await EnrolledTeamEvent.find({
        //     $or: [
        //         { team_leader_register_user_id: user._id },
        //         { team_emails: user.email }
        //     ],
        //     isPaid: true
        // }).populate("team_leader_register_user_id", "full_name email phone_number").select("-transaction_id -__v");

        // const allTeammateEmails = Array.from(new Set(rawPaidTeamEvents.flatMap((e: { team_emails?: string[] }) => e.team_emails || [])));
        // const teammateUsers = await RegisterUser.find({ email: { $in: allTeammateEmails } }).select("full_name email phone_number");
        // const teammateMap = new Map(teammateUsers.map((u: { full_name?: string; email?: string; phone_number?: string }) => [
        //     (u.email || '').toLowerCase(),
        //     { name: u.full_name || '', email: u.email || '', phone: u.phone_number || '' }
        // ]));

        // const paidTeamEvents = rawPaidTeamEvents.map((team: Record<string, unknown> & { toObject: () => Record<string, unknown> }) => {
        //     const teamObj = team.toObject();
        //     const leader = teamObj.team_leader_register_user_id as { full_name?: string; email?: string; phone_number?: string } | null;
        //     const memberDetails = ((teamObj.team_emails as string[]) || []).map((email: string) =>
        //         teammateMap.get(email.toLowerCase()) || { name: email.split('@')[0], email, phone: '' }
        //     );
        //     return {
        //         ...teamObj,
        //         team_leader_name: leader?.full_name || '',
        //         team_leader_email: leader?.email || '',
        //         team_leader_phone: leader?.phone_number || '',
        //         team_member_details: memberDetails
        //     };
        // });

        // const paidEvents = {
        //     individualEvents: paidIndividualEvents || [],
        //     teamEvents: paidTeamEvents || []
        // }

        return NextResponse.json({
            message: "User and enrolled events fetched successfully",
            data: {
                user: {
                    id: user._id,
                    name: user.full_name,
                    email: user.email,
                },
                purchasedEvents,
                availableFreeEvents,
                availableTechEvents,
            },
            error: null,
            redirect: false,
            redirectUrl: null
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json({
            message: "Error fetching token",
            data: null,
            error: error,
            redirect: false,
            redirectUrl: null
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId } = body; // for now only individual events
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

        if (userData === null || tempData === null) {
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

        if (userData.user.id !== tempData.user.id) {
            return NextResponse.json(
                { message: "Session mismatch", data: null },
                { status: 401 }
            );
        }

        await connectToDatabase();

        const event = await Event.findOne({ _id: eventId });

        if (!event) {
            return NextResponse.json(
                {
                    message: "Event not found",
                    data: null,
                    error: "Event does not exist",
                    redirect: false,
                    redirectUrl: null,
                },
                { status: 404 },
            );
        }

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
                { status: 404 },
            );
        }

        const entryTicket = await EntryTicket.findOne({
            userId: user._id,
            isPaid: true,
        });

        if (!entryTicket) {
            return NextResponse.json(
                {
                    message: "Entry ticket not found for the user",
                    data: null,
                    error: "Entry ticket does not exist",
                    redirect: true,
                    redirectUrl: "/register/entry-ticket",
                },
                { status: 404 },
            );
        }

        if (event && (event.entry_fee === 0 || event.isTechEvent === true)) {

            if (event.isTechEvent === true && entryTicket.isTechEvents === false) {
                return NextResponse.json(
                    {
                        message: "User is not eligible for tech events",
                        data: null,
                        error: "User does not have access to tech events",
                        redirect: false,
                        redirectUrl: null,
                    },
                    { status: 403 },
                );
            }
            if (event.participants_type === "individual") {
                const enrolledEvent = await EnrolledIndividualEvent.findOne({
                    register_user_id: user._id,
                    event_id: eventId,
                    isPaid: true,
                });

                if (enrolledEvent) {
                    return NextResponse.json(
                        {
                            message: "User is already enrolled in this free individual event",
                            data: null,
                            error: "User already enrolled",
                            redirect: false,
                            redirectUrl: null,
                        },
                        { status: 400 },
                    );
                }

                const newEnrolledEvent = await EnrolledIndividualEvent.create({
                    register_user_id: user._id,
                    event_id: eventId,
                    transaction_id: null,
                    isPaid: true,
                    reservation_time: new Date(),
                    isExtended: false,
                });

                if (!newEnrolledEvent) {
                    return NextResponse.json(
                        {
                            message: "Error enrolling user in the free individual event",
                            data: null,
                            error: "Failed to enroll user",
                            redirect: false,
                            redirectUrl: null,
                        },
                        { status: 500 },
                    );
                }

                return NextResponse.json(
                    {
                        message: "User enrolled successfully in the free individual event",
                        data: newEnrolledEvent,
                        error: null,
                        redirect: false,
                        redirectUrl: null,
                    },
                    { status: 201 },
                );
            } else if (event.participants_type === "team") {
                const { teamName, teamEmails } = body;

                if (!teamName || !teamEmails || !Array.isArray(teamEmails) || teamEmails.includes(user.email)) {
                    return NextResponse.json(
                        {
                            message: "Team name and team emails are required for team events",
                            data: null,
                            error: "Missing team details",
                            redirect: false,
                            redirectUrl: null,
                        },
                        { status: 400 },
                    );
                }

                const team_length = (teamEmails?.length ?? 0) + 1; // +1 for the team leader

                // team_length is greater than or equal to min_team_size and less than or equal to max_team_size
                if (
                    event.min_team_size <= team_length &&
                    event.max_team_size >= team_length
                ) {
                    // Check if the team size is valid for the event

                    if (teamEmails && teamEmails.length > 0) {
                        for (const email of teamEmails) {
                            const existingUser = await RegisterUser.findOne({ email: email });

                            if (!existingUser) {
                                return NextResponse.json(
                                    {
                                        message: `Team member with email ${email} is not registered`,
                                        data: null,
                                        error: "Team member not registered",
                                        redirect: false,
                                        redirectUrl: null,
                                    },
                                    { status: 400 },
                                );
                            }

                            const userEntryTicket = await EntryTicket.findOne({
                                userId: existingUser?._id,
                                isPaid: true,
                            });
                            if (!userEntryTicket) {
                                return NextResponse.json(
                                    {
                                        message: `Team member with email ${email} has not paid for the entry ticket`,
                                        data: null,
                                        error: "Team member entry ticket not paid",
                                        redirect: false,
                                        redirectUrl: null,
                                    },
                                    { status: 400 },
                                );
                            }
                        }
                    }

                    const existingEnrollment = await EnrolledTeamEvent.findOne({
                        $or: [
                            { team_leader_register_user_id: user._id },
                            { team_emails: { $in: teamEmails } },
                        ],
                        event_id: eventId,
                        isPaid: true,
                    });

                    if (existingEnrollment) {
                        return NextResponse.json(
                            {
                                message:
                                    "User or one of the team members is already enrolled in this free team event",
                                data: null,
                                error: "User or team member already enrolled",
                                redirect: false,
                                redirectUrl: null,
                            },
                            { status: 400 },
                        );
                    }

                    const newEnrolledTeamEvent = await EnrolledTeamEvent.create({
                        team_leader_register_user_id: user._id,
                        team_name: teamName,
                        team_emails: teamEmails,
                        team_length: team_length,
                        event_id: eventId,
                        transaction_id: null,
                        isPaid: true,
                        reservation_time: new Date(),
                        isExtended: false,
                    });

                    if (!newEnrolledTeamEvent) {
                        return NextResponse.json(
                            {
                                message: "Error enrolling user in the free team event",
                                data: null,
                                error: "Failed to enroll user",
                                redirect: false,
                                redirectUrl: null,
                            },
                            { status: 500 },
                        );
                    }

                    return NextResponse.json(
                        {
                            message: "User enrolled successfully in the free team event",
                            data: newEnrolledTeamEvent,
                            error: null,
                            redirect: false,
                            redirectUrl: null,
                        },
                        { status: 201 },
                    );
                } else {
                    return NextResponse.json(
                        {
                            message: "Team size is not valid for this event",
                            data: null,
                            error: "Invalid team size",
                            redirect: false,
                            redirectUrl: null,
                        },
                        { status: 400 },
                    );
                }
            }
        }
    } catch (error) {
        return NextResponse.json(
            {
                message: "Error creating enrolled events",
                data: null,
                error: error,
                redirect: false,
                redirectUrl: null,
            },
            { status: 500 },
        );
    }
}