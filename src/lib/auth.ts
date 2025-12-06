import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { headers } from "next/headers";
import { Resend } from "resend";
import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import React from "react";
import { db } from "@/database/db";
import * as schema from "@/database/schema/auth-schema";
import { organizations, members } from "@/database/schema/auth-schema";
import { type Plan, plans } from "@/lib/payments/plans";
import { site } from "@/config/site";
import { admin, apiKey, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Default organization for POC - all users will belong to this org
export const DEFAULT_ORGANIZATION_ID = "default-org-poc";
export const DEFAULT_ORGANIZATION_NAME = "Default Organization";
export const DEFAULT_ORGANIZATION_SLUG = "default-org";

// Ensure the default organization exists
async function ensureDefaultOrganization() {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, DEFAULT_ORGANIZATION_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(organizations).values({
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
      slug: DEFAULT_ORGANIZATION_SLUG,
      createdAt: new Date(),
    });
    console.log("Default organization created");
  }
}

// Add user to default organization
async function addUserToDefaultOrganization(userId: string) {
  await ensureDefaultOrganization();

  // Check if user is already a member
  const existingMembership = await db
    .select()
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);

  if (existingMembership.length === 0) {
    await db.insert(members).values({
      id: nanoid(),
      organizationId: DEFAULT_ORGANIZATION_ID,
      userId,
      role: "member",
      createdAt: new Date(),
    });
    console.log("User added to default organization:", userId);
  }
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const name = user.name || user.email.split("@")[0];

      await resend.emails.send({
        from: site.mailFrom,
        to: user.email,
        subject: "Reset your password",
        react: EmailTemplate({
          heading: "Reset your password",
          content: React.createElement(
            React.Fragment,
            null,
            React.createElement("p", null, `Hi ${name},`),
            React.createElement(
              "p",
              null,
              "Someone requested a password reset for your account. If this was you, ",
              "click the button below to reset your password."
            ),
            React.createElement(
              "p",
              null,
              "If you didn't request this, you can safely ignore this email."
            )
          ),
          action: "Reset Password",
          url,
          siteName: site.name,
          baseUrl: site.url,
          imageUrl: `${site.url}/logo.png`, // svg are not supported by resend
        }),
      });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    admin(),
    apiKey(),
    organization(),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: plans,
        getCheckoutSessionParams: async ({ user, plan }) => {
          const checkoutSession: {
            params: {
              subscription_data?: {
                trial_period_days: number;
              };
            };
          } = {
            params: {},
          };

          if (user.trialAllowed) {
            checkoutSession.params.subscription_data = {
              trial_period_days: (plan as Plan).trialDays,
            };
          }

          return checkoutSession;
        },
        onSubscriptionComplete: async ({ event }) => {
          const eventDataObject = event.data.object as Stripe.Checkout.Session;
          const userId = eventDataObject.metadata?.userId;
          console.log("Subscription completed for user:", userId);
        },
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log("User created:", user);
          // Automatically add user to default organization for POC
          await addUserToDefaultOrganization(user.id);
        },
      },
    },
  },
});

export async function getActiveSubscription() {
  const nextHeaders = await headers();
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: nextHeaders,
  });
  return subscriptions.find((s) => s.status === "active");
}

export async function getOrganizationId() {
  const session = await getSession();
  const organizationId = session?.session?.activeOrganizationId;
  // For POC: return default organization if no active org is set
  return organizationId || DEFAULT_ORGANIZATION_ID;
}

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("No session found");
  }
  return session;
}

export async function getUserId() {
  const session = await getSession();
  const userId = session?.session?.userId;
  if (!userId) {
    throw new Error("No user ID found");
  }
  return userId;
}
