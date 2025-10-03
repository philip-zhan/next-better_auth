import {
  OrganizationSettingsCards,
  OrganizationMembersCard,
} from "@daveyplate/better-auth-ui";

export default function OrganizationPage() {
  return (
    <div>
      <OrganizationSettingsCards />
      <OrganizationMembersCard />
    </div>
  );
}
