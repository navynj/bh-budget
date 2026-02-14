'use client';

import type React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, BarStack } from 'recharts';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ClassName } from '@/types/className';
import { CHART_COLORS } from '@/constants/color';
import { formatCurrency } from '@/lib/utils';

interface ChartBarStackedProps extends ClassName {
  chartData: any[];
  chartConfig: ChartConfig;
  /** DataKey whose Bar fill uses CHART_COLORS by row index (e.g. "current"). */
  rowColorDataKey?: string;
  /** DataKeys to exclude from legend (e.g. ["current"]). */
  excludeFromLegend?: string[];
  /** In tooltip, hide items with value 0. */
  filterTooltipZero?: boolean;
  /** Override tooltip value per payload row (e.g. show actual total for "current"). */
  tooltipValueGetter?: (
    payload: Record<string, unknown>,
    dataKey: string,
  ) => number | undefined;
  /** Color for tooltip indicator per item (e.g. row color for "current"). */
  tooltipItemColor?: (
    payload: Record<string, unknown>,
    dataKey: string,
  ) => string | undefined;
  /** Hide color indicator in tooltip for these dataKeys (e.g. ["current"]). */
  hideTooltipIndicatorForKeys?: string[];
  /** DataKeys to always show in tooltip even when value is 0 (e.g. ["budget"]). */
  tooltipAlwaysShowKeys?: string[];
  /** Override tooltip row name per payload (e.g. show category full name for "current"). */
  tooltipNameGetter?: (
    payload: Record<string, unknown>,
    dataKey: string,
  ) => string | undefined;
  /** Extra tooltip rows per payload row (e.g. "Remaining" when not over budget). */
  tooltipExtraRows?: (
    payload: Record<string, unknown>,
  ) => Array<{ dataKey: string; name: string; value: number; color?: string }>;
}

export function ChartBarStacked({
  chartData,
  chartConfig,
  rowColorDataKey,
  excludeFromLegend = [],
  filterTooltipZero = false,
  tooltipValueGetter,
  tooltipItemColor,
  hideTooltipIndicatorForKeys = [],
  tooltipAlwaysShowKeys = [],
  tooltipNameGetter,
  tooltipExtraRows,
  className,
}: ChartBarStackedProps) {
  const renderTooltip = (props: {
    active?: boolean;
    payload?: Array<{
      value?: unknown;
      name?: string;
      dataKey?: string | number;
      color?: string;
      payload?: unknown;
    }>;
    label?: string;
  }) => {
    if (!props.active) return null;
    const rawPayload = props.payload ?? [];
    if (rawPayload.length === 0) return null;
    const filtered = (() => {
      if (!filterTooltipZero && !tooltipValueGetter && !tooltipAlwaysShowKeys.length)
        return rawPayload;
      return rawPayload.filter((p) => {
        const payloadObj =
          p.payload && typeof p.payload === 'object'
            ? (p.payload as Record<string, unknown>)
            : {};
        const dataKey = String(p.dataKey ?? p.name ?? '');
        if (tooltipAlwaysShowKeys.includes(dataKey)) return true;
        const displayValue = tooltipValueGetter
          ? tooltipValueGetter(payloadObj, dataKey)
          : p.value;
        const v =
          displayValue !== undefined
            ? displayValue
            : p.value != null
              ? Number(p.value)
              : 0;
        return v !== 0;
      });
    })();
    let payload = filtered.length > 0 ? filtered : rawPayload;
    const rowPayload =
      payload[0]?.payload && typeof payload[0].payload === 'object'
        ? (payload[0].payload as Record<string, unknown>)
        : {};
    const extraRows = tooltipExtraRows?.(rowPayload) ?? [];
    if (extraRows.length > 0) {
      payload = [
        ...payload,
        ...extraRows.map((row) => ({
          dataKey: row.dataKey,
          name: row.name,
          value: row.value,
          payload: rowPayload,
          color: row.color,
        })),
      ];
    }
    const formatter =
      filterTooltipZero || tooltipValueGetter
        ? (
            value: unknown,
            name: unknown,
            item: {
              payload?: unknown;
              dataKey?: string | number;
              name?: string;
              color?: string;
            },
          ) => {
            const payloadObj =
              item.payload && typeof item.payload === 'object'
                ? (item.payload as Record<string, unknown>)
                : {};
            const dataKey = String(item.dataKey ?? item.name ?? '');
            const displayName =
              tooltipNameGetter?.(payloadObj, dataKey) ?? String(name ?? '');
            const displayValue = tooltipValueGetter
              ? tooltipValueGetter(payloadObj, dataKey)
              : value;
            const num =
              displayValue !== undefined ? Number(displayValue) : Number(value);
            const hideIndicator = hideTooltipIndicatorForKeys.includes(dataKey);
            const color = hideIndicator
              ? undefined
              : (tooltipItemColor?.(payloadObj, dataKey) ??
                item.color ??
                'var(--muted)');
            return (
              <>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {!hideIndicator && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: color,
                      }}
                    />
                  )}
                  <span>{displayName}</span>
                </span>
                <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                  {formatCurrency(num)}
                </span>
              </>
            );
          }
        : undefined;
    return (
      <ChartTooltipContent
        {...({
          active: props.active,
          payload,
          hideLabel: true,
          formatter,
        } as React.ComponentProps<typeof ChartTooltipContent>)}
      />
    );
  };

  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) =>
            typeof value === 'string' ? value.slice(0, 8) : String(value ?? '')
          }
        />
        <ChartTooltip
          content={
            renderTooltip as unknown as React.ComponentProps<
              typeof ChartTooltip
            >['content']
          }
          cursor={{ fill: 'rgba(0,0,0,0.06)' }}
        />
        <ChartLegend
          content={({ payload }) => (
            <ChartLegendContent
              payload={
                excludeFromLegend.length
                  ? payload?.filter(
                      (p) =>
                        !excludeFromLegend.includes(
                          String(p.dataKey ?? p.value),
                        ),
                    )
                  : payload
              }
            />
          )}
        />
        <BarStack radius={[8, 8, 0, 0]}>
          {Object.entries(chartConfig).map(([dataKey, config], i, arr) => {
            const isLast = i === arr.length - 1;
            return (
              <Bar
                key={dataKey}
                dataKey={dataKey}
                stackId="a"
                fill={
                  dataKey === rowColorDataKey
                    ? undefined
                    : config.color || chartData[i]?.fill
                }
                radius={isLast ? [8, 8, 0, 0] : [0, 0, 0, 0]}
              >
                {dataKey === rowColorDataKey &&
                  chartData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
              </Bar>
            );
          })}
        </BarStack>
      </BarChart>
    </ChartContainer>
  );
}
