import type { Metadata } from "next";
import { BoxLeaguePage } from "@/components/BoxLeaguePage";

export const metadata: Metadata = {
  title: "W7 Padel · Autumn/Winter Box League",
  description:
    "W7 Padel Autumn/Winter Box League — starts Mon 14 Sep. Up to 60 teams in boxes by combined Playtomic rating, €40 per team. Registration closes Mon 7 Sep on Playtomic.",
};

export default function BoxLeague() {
  return <BoxLeaguePage />;
}
