import {
  AccountSettingsCards,
  SecuritySettingsCards,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";
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
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <AccountSettingsCards />
          <DeleteAccountCard />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettingsCards />
        </TabsContent>
      </Tabs>
    </div>
  );
}
