import { UsagePortal } from "@/components/UsagePortal";

// Admin-only: not linked from anywhere on the site, not indexed. The database checks the passcode.
export const metadata = {
  title: "Site usage · W7 League admin",
  robots: { index: false, follow: false },
};

export default function AdminUsagePage() {
  return <UsagePortal />;
}
