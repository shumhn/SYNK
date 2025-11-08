import { SignupSchema } from "@/lib/validations/user";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const userData = await req.json();
        const parsedData = SignupSchema.safeParse(userData);
        if (!parsedData.success) {
            return NextResponse.json(
                { error: true, message: parsedData.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { username, email, password } = parsedData.data;
        await connectToDatabase();

        const user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return NextResponse.json(
                {
                    error: true,
                    message: "User already exists",
                },
                { status: 400 }
            );
        }

        await User.create({
            username,
            email,
            password, // This will be hashed by the pre-save hook in User.js
        });

        return NextResponse.json(
            {
                error: false,
                message: "User created successfully"
            },
            { status: 201 }
        );
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: true,
                 message:{global : " An error occurred while creating the account"}},
            { status: 500 }
        );
    }

}
