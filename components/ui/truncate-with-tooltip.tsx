'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Tailwind truncate = overflow:hidden + text-overflow:ellipsis + white-space:nowrap.
 * Text is truncated when scrollWidth > clientWidth. Show tooltip only in that case. */
function useIsTruncated(deps: React.DependencyList = []) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const check = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [check, ...deps]);

  return { ref, isTruncated };
}

export function TruncateWithTooltip({
  content,
  className,
  children,
  side = 'top',
  contentClassName,
}: {
  content: string;
  className?: string;
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  contentClassName?: string;
}) {
  const { ref, isTruncated } = useIsTruncated([content]);

  const span = (
    <span ref={ref} className={cn('truncate', className)}>
      {children ?? content}
    </span>
  );

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{span}</TooltipTrigger>
        <TooltipContent
          side={side}
          className={contentClassName ?? 'max-w-[min(80vw,20rem)]'}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  return span;
}
