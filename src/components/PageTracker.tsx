"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Logs one 'view' per page change to the site usage log. Mounted once in the root layout. */
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) track("view", null, pathname + window.location.search);
  }, [pathname]);
  return null;
}
