import type { Metadata } from "next";
import { CoachingPage } from "@/components/CoachingPage";

export const metadata: Metadata = {
  title: "W7 Padel · Coaching",
  description:
    "Padel coaching at W7, Wicklow Town — 1-to-1 lessons, small-group coaching, beginner intro sessions and junior coaching. Book your lesson.",
};

export default function Coaching() {
  return <CoachingPage />;
}
