import MonthNav from '@/components/layout/MonthNav';
import { getCurrentYearMonth } from '@/lib/utils';
import React from 'react';
import { Suspense } from 'react';

const BudgetLayout = ({ children }: { children: React.ReactNode }) => {
  const yearMonth = getCurrentYearMonth();

  return (
    <>
      <Suspense fallback={null}>
        <MonthNav currentYearMonth={yearMonth} />
      </Suspense>
      {children}
    </>
  );
};

export default BudgetLayout;
