import {
  OrganizationSettingsCards,
  OrganizationMembersCard,
} from "@daveyplate/better-auth-ui";
import {
  HashTabs,
  HashTabsList,
  HashTabsTrigger,
  HashTabsContent,
} from "@/components/hash-tabs";

export default function OrganizationPage() {
  return (
    <div>
      <HashTabs defaultValue="settings">
        <HashTabsList>
          <HashTabsTrigger value="settings">Settings</HashTabsTrigger>
          <HashTabsTrigger value="members">Members</HashTabsTrigger>
        </HashTabsList>
        <HashTabsContent value="settings">
          <OrganizationSettingsCards />
        </HashTabsContent>
        <HashTabsContent value="members">
          <OrganizationMembersCard />
        </HashTabsContent>
      </HashTabs>
    </div>
  );
}
