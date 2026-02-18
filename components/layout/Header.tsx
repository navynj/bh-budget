import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import React from 'react';
import SignOutButton from '../features/auth/SignOutButton';
import Link from 'next/link';
import { BudgetSettingsDialog } from '../features/budget/BudgetSettingsDialog';
import HeaderNav from './HeaderNav';

type HeaderProps = {
  showBudgetSettings?: boolean;
  budgetSettings?: { budgetRate: number; referencePeriodMonths: number };
};

const Header = async ({ showBudgetSettings, budgetSettings }: HeaderProps) => {
  const session = await auth();
  if (!session?.user) redirect('/auth');

  const isActive = session.user.status === 'active';
  const isOfficeOrAdmin = getOfficeOrAdmin(session.user.role);

  return (
    isActive && (
      <header className="flex items-center justify-between gap-4 border-b pb-6 mb-5 flex-wrap md:flex-nowrap">
        <div className="shrink-0 flex items-center gap-6 md:w-full md:max-w-3xs">
          <div>
            <Link href="/budget">
              <h1 className="text-xl font-semibold">BH Dashboard</h1>
            </Link>
            <p className="text-muted-foreground text-sm">
              {session.user.name ?? session.user.email}
              {session.user.role && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {session.user.role}
                </span>
              )}
              {session.user.locationCode && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {session.user.locationCode}
                </span>
              )}
            </p>
          </div>
        </div>
        <HeaderNav
          className="hidden md:flex w-full"
          isOfficeOrAdmin={isOfficeOrAdmin}
        />
        <div className="flex items-center gap-2">
          {showBudgetSettings && budgetSettings && (
            <BudgetSettingsDialog
              initialBudgetRate={budgetSettings.budgetRate}
              initialReferencePeriodMonths={
                budgetSettings.referencePeriodMonths
              }
            />
          )}
          <SignOutButton size="sm" />
        </div>
        <HeaderNav
          className="md:hidden w-full"
          isOfficeOrAdmin={isOfficeOrAdmin}
        />
      </header>
    )
  );
};

export default Header;
