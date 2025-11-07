import { NextResponse } from "next/server";
import User from "@/models/User";
import connectToDatabase from "@/lib/db/mongodb";
import { LoginSchema } from "@/lib/validations/user";
import bcrypt from 'bcrypt'
import { cookies } from "next/headers";
import { generateToken } from "@/lib/auth/jwt";
import { randomUUID } from "crypto";

export async function POST(req) {
    try {
        const userData = await req.json();
        const parsedData = LoginSchema.safeParse(userData);
        if (!parsedData.success) {
            return NextResponse.json(
                { error: true, message: parsedData.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const { email, password } = parsedData.data;
        await connectToDatabase();
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return NextResponse.json(
                { error: true, message: "Invalid credentials" },
                { status: 401 }
            );
        }


        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: true, message: "Invalid credentials" },
                { status: 401 }
            );

        }

        const sessionId = randomUUID();
        const userAgent = req.headers.get("user-agent") || undefined;
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || undefined;

        await User.updateOne(
            { _id: user._id },
            {
                $set: { lastLoginAt: new Date(), isOnline: true },
                $push: {
                    activeSessions: {
                        sessionId,
                        userAgent,
                        ip,
                        createdAt: new Date(),
                        lastSeenAt: new Date(),
                    },
                },
            }
        );

        const token = generateToken(user, { sessionId });

        const cookieStore = await cookies();

        cookieStore.set({
            name: "token",
            value: token,
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 3,
        })

        return NextResponse.json(
            { error: false, message: "Login successful" },
            { status: 200 }
        );
    }
    catch (error) {
        console.log(error);
        return NextResponse.json({
            error: true,
            message: { global: "Internal Server Error" },
        },
            { status: 500 });
    }


}

