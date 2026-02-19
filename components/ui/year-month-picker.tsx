'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatYearMonth, parseYearMonth } from '@/lib/utils';
import { MONTH_NAMES } from '@/constants/date';

const CURRENT_YEAR = new Date().getFullYear();

export type YearMonthPickerProps = {
  /** Current value as YYYY-MM */
  value: string;
  /** Called when user selects a month */
  onChange: (yearMonth: string) => void;
  /** If set, months after this (YYYY-MM) are disabled */
  maxYearMonth?: string;
  /** Year options for the dropdown. Default: 12 years back from current */
  years?: number[];
  /** Optional id for the year select (accessibility) */
  id?: string;
  /** When set, render as Popover with trigger showing current month; class applied to the trigger button */
  triggerClassName?: string;
};

const DEFAULT_YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i);

function PickerContent({
  value,
  onChange,
  maxYearMonth,
  years = DEFAULT_YEARS,
  id,
  onSelectAndClose,
}: YearMonthPickerProps & {
  onSelectAndClose?: (yearMonth: string) => void;
}) {
  const { year, month } = parseYearMonth(value);
  const [pickerYear, setPickerYear] = useState(year);

  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  const handleMonthClick = (ym: string) => {
    onChange(ym);
    onSelectAndClose?.(ym);
  };

  return (
    <div className="flex flex-col gap-3">
      <Select
        value={String(pickerYear)}
        onValueChange={(y) => setPickerYear(Number(y))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, i) => {
          const ym = formatYearMonth(pickerYear, i);
          const isDisabled = maxYearMonth != null && ym > maxYearMonth;
          const isSelected = pickerYear === year && month === i;
          return (
            <Button
              key={i}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className="disabled:opacity-30"
              disabled={isDisabled}
              onClick={() => handleMonthClick(ym)}
            >
              {name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function YearMonthPicker({
  value,
  onChange,
  maxYearMonth,
  years = DEFAULT_YEARS,
  id,
  triggerClassName,
}: YearMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const { year, month } = parseYearMonth(value);
  const displayLabel = `${MONTH_NAMES[month]} ${year}`;

  const handleSelectAndClose = (yearMonth: string) => {
    if (maxYearMonth != null && yearMonth > maxYearMonth) return;
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-pointer min-w-[180px] rounded-md px-2 py-1.5 text-center font-medium outline-none ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            triggerClassName,
          )}
          aria-label="Select month and year"
          aria-live="polite"
        >
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="center">
        <PickerContent
          value={value}
          onChange={onChange}
          maxYearMonth={maxYearMonth}
          years={years}
          id={id}
          onSelectAndClose={handleSelectAndClose}
        />
      </PopoverContent>
    </Popover>
  );
}
