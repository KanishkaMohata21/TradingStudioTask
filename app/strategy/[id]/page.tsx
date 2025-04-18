import { StrategyDetail } from "@/components/strategy/StrategyDetail";
import { getStrategies } from "@/lib/api";

export default function StrategyPage({ params }: { params: { id: string } }) {
  return (
    <main className="container mx-auto px-4">
      <StrategyDetail strategyId={params.id} />
    </main>
  );
}
