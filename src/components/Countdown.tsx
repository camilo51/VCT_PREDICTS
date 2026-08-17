"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

export function Countdown({ target }: { target: string | Date }) {
  const targetMs = (typeof target === "string" ? new Date(target) : target).getTime();
  const [label, setLabel] = useState(() => formatCountdown(new Date(targetMs)));

  useEffect(() => {
    const id = setInterval(() => setLabel(formatCountdown(new Date(targetMs))), 30_000);
    return () => clearInterval(id);
  }, [targetMs]);

  return <span className="font-data">{label}</span>;
}
