import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AdminCalendarView from "~/settings/admin/admin-calendar-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("admin_calendar_description", { defaultValue: "Calendar" })
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("admin")}
      description={t("admin_calendar_description", { defaultValue: "All Bookings Calendar" })}>
      <AdminCalendarView />
    </SettingsHeader>
  );
};

export default Page;
