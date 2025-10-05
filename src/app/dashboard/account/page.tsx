import {
  AccountSettingsCards,
  SecuritySettingsCards,
  DeleteAccountCard,
  ApiKeysCard,
  OrganizationsCard,
} from "@daveyplate/better-auth-ui";
import { SignOutCard } from "@/components/sign-out-card";
import {
  HashTabs,
  HashTabsList,
  HashTabsTrigger,
  HashTabsContent,
} from "@/components/hash-tabs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return (
    <div>
      <HashTabs defaultValue="settings">
        <HashTabsList>
          <HashTabsTrigger value="settings">Settings</HashTabsTrigger>
          <HashTabsTrigger value="security">Security</HashTabsTrigger>
          <HashTabsTrigger value="api">API Keys</HashTabsTrigger>
          <HashTabsTrigger value="organizations">Organizations</HashTabsTrigger>
        </HashTabsList>
        <HashTabsContent value="settings" className="space-y-4">
          <AccountSettingsCards />
          <SignOutCard />
          <DeleteAccountCard />
        </HashTabsContent>
        <HashTabsContent value="security">
          <SecuritySettingsCards />
        </HashTabsContent>
        <HashTabsContent value="api">
          <ApiKeysCard />
        </HashTabsContent>
        <HashTabsContent value="organizations">
          <OrganizationsCard />
        </HashTabsContent>
      </HashTabs>
    </div>
  );
}
