import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";

const authOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email }).select(
          "+password username email image provider"
        );

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          image: user.image,
          provider: user.provider || "credentials",
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, user, trigger, session }) {
      await connectToDatabase();

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.picture) token.picture = session.picture;
      }

      if (account?.provider === "google") {
        const googleId = account.providerAccountId;
        const email = user?.email ?? token.email;
        const picture = user?.image ?? token.picture;
        const name = user?.name ?? token.name;

        let existingUser = await User.findOne({
          $or: [{ googleId }, { email }],
        });

        if (!existingUser) {
          existingUser = await User.create({
            username: await generateUniqueUsername(email, name),
            email,
            image: picture,
            provider: "google",
            googleId,
          });
        } else {
          let updated = false;
          if (!existingUser.googleId) {
            existingUser.googleId = googleId;
            updated = true;
          }
          if (!existingUser.image && picture) {
            existingUser.image = picture;
            updated = true;
          }
          if (existingUser.provider !== "google") {
            existingUser.provider = "google";
            updated = true;
          }
          if (updated) {
            await existingUser.save();
          }
        }

        token.id = existingUser._id.toString();
        token.name = existingUser.username;
        token.picture = existingUser.image;
        token.provider = "google";
        token.email = existingUser.email;

        return token;
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
        token.provider = user.provider ?? "credentials";
      } else if (!token.id && token.email) {
        const existingUser = await User.findOne({ email: token.email }).lean();
        if (existingUser) {
          token.id = existingUser._id.toString();
          token.name = existingUser.username;
          token.picture = existingUser.image;
          token.provider = existingUser.provider;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.provider = token.provider;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

async function generateUniqueUsername(email, name) {
  const candidates = [];
  if (name) candidates.push(sanitizeUsername(name));
  if (email) candidates.push(sanitizeUsername(email.split("@")[0]));

  for (const baseCandidate of candidates.filter(Boolean)) {
    let candidate = baseCandidate || "user";
    let suffix = 0;
    let isUnique = false;
    let lookup = candidate;

    while (!isUnique) {
      const exists = await User.findOne({ username: lookup }).lean();
      if (!exists) {
        isUnique = true;
        break;
      }
      suffix += 1;
      lookup = `${candidate}${suffix}`;
    }

    if (isUnique) return lookup;
  }

  let fallback = `user${Math.floor(Math.random() * 1_000_000)}`;
  let isUnique = false;

  while (!isUnique) {
    const exists = await User.findOne({ username: fallback }).lean();
    if (!exists) {
      isUnique = true;
      break;
    }
    fallback = `user${Math.floor(Math.random() * 1_000_000)}`;
  }

  return fallback;
}

function sanitizeUsername(base) {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 24);
}

export { handler as GET, handler as POST, authOptions };

