import {
  AccountSettingsCards,
  SecuritySettingsCards,
  DeleteAccountCard,
  ApiKeysCard,
} from "@daveyplate/better-auth-ui";
import { SignOutCard } from "@/components/sign-out-card";
import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <AccountSettingsCards />
          <SignOutCard />
          <DeleteAccountCard />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettingsCards />
        </TabsContent>
        <TabsContent value="api">
          <ApiKeysCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
