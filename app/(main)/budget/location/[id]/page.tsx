import BudgetCard from '@/components/features/budget/card/BudgetCard';
import BudgetCardList from '@/components/features/budget/card/BudgetCardList';
import {
  attachCurrentMonthCosToBudgets,
  getBudgetByLocationAndMonth,
} from '@/lib/budget';
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
    redirect(`/budget/location/${id}?yearMonth=${yearMonth}`);
  }
  const [withCos] = await attachCurrentMonthCosToBudgets([budget], yearMonth);
  budget = withCos;

  return (
    <BudgetCardList
      yearMonth={yearMonth}
      isOfficeOrAdmin={false}
      budget={budget}
      budgets={[]}
      locationId={id}
    />
  );
};

export default LocationPage;
