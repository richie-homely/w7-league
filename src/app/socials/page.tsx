import type { Metadata } from "next";
import { SocialsPage } from "@/components/SocialsPage";

export const metadata: Metadata = {
  title: "W7 Padel · Socials",
  description:
    "Socials at W7 Padel, Wicklow Town — this week's drop-in doubles sessions with live sign-up counts, plus the usual weekly rhythm. Book on Playtomic.",
};

export default function Socials() {
  return <SocialsPage />;
}
