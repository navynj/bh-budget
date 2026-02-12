'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
import { useNavigationProgress } from '@/components/providers/NavigationProgress';
import {
  formatYearMonth,
  getCurrentYearMonth,
  nextMonth,
  parseYearMonth,
  prevMonth,
} from '@/lib/utils';
import { MONTH_NAMES } from '@/constants/date';
import { useEffect, useState } from 'react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i);

export default function MonthNav({
  currentYearMonth,
}: {
  currentYearMonth: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const effectiveYearMonth =
    searchParams.get('yearMonth') ?? currentYearMonth ?? getCurrentYearMonth();
  const { year, month } = parseYearMonth(effectiveYearMonth);
  const displayLabel = `${MONTH_NAMES[month]} ${year}`;
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const currentYearMonthLimit = getCurrentYearMonth();
  const canGoNext = next <= currentYearMonthLimit;

  const [pickerYear, setPickerYear] = useState(year);
  const navigationProgress = useNavigationProgress();

  const go = (yearMonth: string) => {
    navigationProgress?.startNavigation();
    const params = new URLSearchParams(searchParams.toString());
    params.set('yearMonth', yearMonth);
    router.push(`/budget?${params.toString()}`);
  };

  const handleMonthSelect = (yearMonth: string) => {
    if (yearMonth > currentYearMonthLimit) return;
    setPopoverOpen(false);
    go(yearMonth);
  };

  useEffect(() => {
    if (popoverOpen) setPickerYear(year);
  }, [popoverOpen, year]);

  return (
    <nav className="flex items-center justify-center gap-4 py-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => go(prev)}
      >
        ←
      </Button>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="min-w-[180px] rounded-md px-2 py-1.5 text-center font-medium outline-none ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Select month and year"
            aria-live="polite"
          >
            {displayLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="center">
          <div className="flex flex-col gap-3">
            <Select
              value={String(pickerYear)}
              onValueChange={(y) => setPickerYear(Number(y))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-1">
              {MONTH_NAMES.map((name, i) => {
                const ym = formatYearMonth(pickerYear, i);
                const isDisabled = ym > currentYearMonthLimit;
                const isSelected = pickerYear === year && month === i;
                return (
                  <Button
                    key={i}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className="disabled:opacity-30"
                    disabled={isDisabled}
                    onClick={() => handleMonthSelect(ym)}
                  >
                    {name}
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={!canGoNext}
        onClick={() => canGoNext && go(next)}
      >
        →
      </Button>
    </nav>
  );
}
