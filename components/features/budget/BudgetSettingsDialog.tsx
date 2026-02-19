'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BudgetSettingsForm } from '@/components/features/budget/form/BudgetSettingsForm';

type BudgetSettingsDialogProps = {
  initialBudgetRate: number;
  initialReferencePeriodMonths: number;
};

export function BudgetSettingsDialog({
  initialBudgetRate,
  initialReferencePeriodMonths,
}: BudgetSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Budget settings">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Default Budget Settings</DialogTitle>
        <BudgetSettingsForm
          initialBudgetRate={initialBudgetRate}
          initialReferencePeriodMonths={initialReferencePeriodMonths}
          inline
        />
      </DialogContent>
    </Dialog>
  );
}
