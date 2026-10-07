import WaterSupportApp from "@/components/support/WaterSupportApp";
import type { SupportView } from "@/types/support";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = params?.view;
  const initialView: SupportView = value === "letters" || value === "planner" || value === "support" || value === "community" ? value : "home";
  return <WaterSupportApp initialView={initialView} />;
}
