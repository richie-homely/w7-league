import { P100Usage } from "@/components/P100Usage";

// Admin-only: not linked from the public site, not indexed. The database checks the passcode.
export const metadata = {
  title: "Padel 100 note readers · W7 admin",
  robots: { index: false, follow: false },
};

export default function AdminP100Page() {
  return <P100Usage />;
}
