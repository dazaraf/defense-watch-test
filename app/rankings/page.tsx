import { RankingsView } from "@/components/rankings/rankings-view";
import { getRankingsList } from "@/lib/data/companies";

export default function RankingsPage() {
  return <RankingsView companies={getRankingsList()} />;
}
