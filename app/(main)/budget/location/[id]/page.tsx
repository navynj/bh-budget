import BudgetCardList from '@/components/features/budget/card/BudgetCardList';
import TotalBudgetChart from '@/components/features/budget/chart/TotalBudgetChart';
import {
  attachCurrentMonthCosToBudgets,
  ensureBudgetForMonth,
  getBudgetByLocationAndMonth,
  mapBudgetToDataType,
} from '@/lib/budget';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentYearMonth, isValidYearMonth } from '@/lib/utils';
import { notFound, redirect } from 'next/navigation';

const LocationPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ yearMonth?: string }>;
}) => {
  // ===============================
  // Location
  // ===============================
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    return notFound();
  }

  // ==============
  // Year Month
  // ===============================
  const { yearMonth: searchYearMonth } = await searchParams;
  const yearMonth = searchYearMonth ?? getCurrentYearMonth();
  if (!isValidYearMonth(yearMonth)) {
    redirect(`/budget/location/${id}?yearMonth=${getCurrentYearMonth()}`);
  }

  // ===============================
  // Budget
  // ===============================
  let budget = await getBudgetByLocationAndMonth(id, yearMonth);
  if (!budget) {
    const session = await auth();
    if (!session?.user?.id) redirect('/auth');

    const created = await ensureBudgetForMonth({
      locationId: id,
      yearMonth,
      userId: session.user.id,
    });

    budget = mapBudgetToDataType(created);
  }

  const [withCos] = await attachCurrentMonthCosToBudgets([budget], yearMonth);
  budget = withCos;

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <TotalBudgetChart
        className="w-full md:w-2/3 max-h-[450px]"
        size="lg"
        totalAmount={budget.totalAmount}
        currentCosByCategory={budget.currentCosByCategory ?? []}
      />
      <BudgetCardList
        yearMonth={yearMonth}
        isOfficeOrAdmin={false}
        budget={budget}
        budgets={[]}
        locationId={id}
        hideChart={true}
      />
    </div>
  );
};

export default LocationPage;
