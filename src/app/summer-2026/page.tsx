import type { Metadata } from "next";
import { LeagueApp } from "@/components/LeagueApp";

export const metadata: Metadata = {
  title: "W7 Padel · Summer Leagues 2026",
  description:
    "W7 Padel Summer Leagues 2026. Live standings, fixtures and knockout brackets. Wicklow Town.",
};

export default function SummerLeagues() {
  return <LeagueApp />;
}
