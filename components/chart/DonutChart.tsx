'use client';

import type { ReactNode } from 'react';
import { Label, Pie, PieChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface DonutChartProps {
  title?: string;
  description?: string;
  chartData: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey: string;
  chartConfig: ChartConfig;
  innerRadius?: number;
  strokeWidth?: number;
  startAngle?: number;
  endAngle?: number;
  tooltipUnit?: string;
  tooltipFormatter?: (
    value: string | number,
    name: string,
    payload: Record<string, string | number>,
  ) => ReactNode;
}

const ChartPieDonutText = ({
  title,
  description,
  chartData,
  dataKey,
  nameKey,
  chartConfig,
  innerRadius = 60,
  strokeWidth = 5,
  startAngle = 90,
  endAngle = -270,
  tooltipUnit,
  tooltipFormatter,
}: DonutChartProps) => {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name, item) =>
                tooltipFormatter ? (
                  tooltipFormatter(
                    typeof value === 'number' || typeof value === 'string'
                      ? value
                      : String(value),
                    String(name),
                    (item?.payload as Record<string, string | number>) ?? {},
                  )
                ) : (
                  <>
                    <span className="text-muted-foreground">{name}</span>
                    <span className="text-foreground ml-2 font-mono font-medium tabular-nums">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                      {tooltipUnit ?? ''}
                    </span>
                  </>
                )
              }
            />
          }
        />
        <Pie
          data={chartData}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={innerRadius}
          strokeWidth={strokeWidth}
          startAngle={startAngle}
          endAngle={endAngle}
        >
          {(title || description) && (
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {title}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        {description}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          )}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
};

export default ChartPieDonutText;
