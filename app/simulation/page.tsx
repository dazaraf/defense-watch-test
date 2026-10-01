import type { Metadata } from "next";
import CommandTheater from "@/components/simulation/CommandTheater";
import { getCommandTheaterData } from "@/lib/simulation";
import "./terminal.css";

export const metadata: Metadata = {
  title: "Arsenal Theater — Surge Command",
  description: "Defense industrial-base readiness simulation.",
};

export default function SimulationPage() {
  return <CommandTheater scenarios={getCommandTheaterData()} />;
}
