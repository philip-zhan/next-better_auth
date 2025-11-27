import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";
import {
  organizationClient,
  adminClient,
  apiKeyClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    stripeClient({
      subscription: true, // Enable subscription management
    }),
    organizationClient(),
    adminClient(),
    apiKeyClient(),
  ],
});
