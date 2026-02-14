import BudgetCardList from '@/components/features/budget/card/BudgetCardList';
import TotalBudgetChart from '@/components/features/budget/chart/TotalBudgetChart';
import {
  attachCurrentMonthCosToBudgets,
  attachReferenceCosToBudgets,
  ensureBudgetForMonth,
  getBudgetByLocationAndMonth,
  mapBudgetToDataType,
} from '@/lib/budget';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentYearMonth, isValidYearMonth } from '@/lib/utils';
import { notFound, redirect } from 'next/navigation';
import CategoryBudgetBarChart from '@/components/features/budget/chart/CategoryBudgetBarChart';

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
  const session = await auth();
  let budget = await getBudgetByLocationAndMonth(id, yearMonth);
  if (!budget) {
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
  if (session?.user?.id) {
    const [withRef] = await attachReferenceCosToBudgets(
      [budget],
      yearMonth,
      session.user.id,
    );
    budget = withRef;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className='className="w-full md:w-2/3'>
        <TotalBudgetChart
          className="max-h-[450px]"
          size="lg"
          totalAmount={budget.totalAmount}
          currentCosByCategory={budget.currentCosByCategory ?? []}
        />
        <CategoryBudgetBarChart
          className="w-full md:w-2/3 md:mx-auto"
          totalBudget={budget.totalAmount}
          currentCosByCategory={budget.currentCosByCategory ?? []}
          referenceCosByCategory={budget.referenceCosByCategory ?? []}
          referenceCosTotal={budget.referenceCosTotal}
        />
      </div>
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
