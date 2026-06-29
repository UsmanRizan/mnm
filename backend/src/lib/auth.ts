import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.ts"; // your drizzle instance
import { expo } from "@better-auth/expo";
import "dotenv/config";
import { schema } from "../db/auth-schema.ts"; // your Drizzle schema with auth tables
import { creditTransaction } from "../db/gem-schema.ts";
import { generateId } from "./utils.ts";
import { phoneNumber } from "better-auth/plugins";
import axios from "axios";

const sendSMS = async (phone: string, otp: string) => {
  return axios.post(
    "https://app.text.lk/api/v3/sms/send",
    {
      recipient: phone,
      sender_id: "TextLKDemo",
      type: "plain",
      message: `Your OTP is ${otp}`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TEXTLK_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );
};
export const auth = betterAuth({
  trustedOrigins: [
    "myapp://",

    // Development mode - Expo's exp:// scheme with local IP ranges
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://", // Trust all Expo URLs (prefix matching)
          "exp://**", // Trust all Expo URLs (wildcard matching)
          "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
          "http://localhost:*/**", // Trust localhost with any port and path
        ]
      : []),
  ],
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
  plugins: [
    // Add any plugins you want to use here
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, ctx) => {
        return sendSMS(phoneNumber, code);
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => {
          return `${phoneNumber}@my-site.com`;
        },
      },
      callbackOnVerification: async ({ user }, ctx) => {
        // The plugin always sets name = phoneNumber during sign-up,
        // but the frontend sends the real name in the request body.
        // Update it here after user creation.
        if (ctx?.body?.name) {
          const updated = await ctx.context.internalAdapter.updateUser(
            user.id,
            { name: ctx.body.name }
          );
          // Mutate the user object in-place so the response returns the correct name
          Object.assign(user, updated);
        }

        // Grant 500 welcome credits to new users
        try {
          await db.insert(creditTransaction).values({
            id: generateId("txn"),
            userId: user.id,
            amount: 500,
            type: "purchase",
            description: "Welcome bonus — 500 credits",
          });
        } catch (err) {
          console.error("Failed to grant welcome credits:", err);
        }
      },
    }),
    expo(),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
