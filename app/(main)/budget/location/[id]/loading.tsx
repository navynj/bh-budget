import BudgetCardSkeleton, {
  ChartSkeleton,
} from '@/components/features/budget/card/BudgetCardSkeleton';
import { cn } from '@/lib/utils';

export default function LocationBudgetLoading() {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <ChartSkeleton className="h-[450px] w-full md:w-1/3 max-h-[450px]" />
      <BudgetCardSkeleton className="min-w-0 flex-1" />
    </div>
  );
}
