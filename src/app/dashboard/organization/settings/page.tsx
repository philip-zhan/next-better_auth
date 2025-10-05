import {
  OrganizationSettingsCards,
  OrganizationMembersCard,
} from "@daveyplate/better-auth-ui";

export default function OrganizationSettingsPage() {
  return (
    <div>
      <OrganizationSettingsCards />
      <OrganizationMembersCard />
    </div>
  );
}
