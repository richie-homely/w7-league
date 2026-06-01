import { C, F } from "@/theme/tokens";
import { CONTACT } from "@/lib/league";

// Site-wide "powered by" credit + software enquiry call-to-action.
export function KeanoCredit() {
  return (
    <div style={{ fontSize: 11, color: C.mute, marginTop: 10, fontFamily: F.body }}>
      Powered by <strong style={{ color: C.text }}>Keano</strong> ·{" "}
      <a
        href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Software enquiry")}`}
        style={{ color: C.info }}
      >
        Get in touch if you&apos;d like something similar for your club or business
      </a>
      .
    </div>
  );
}
