'use client';

import { useEffect, useState } from 'react';
import { parseISO, format } from 'date-fns';

// Type definitions for Recharts components
type RechartsComponents = {
  ResponsiveContainer: any;
  LineChart: any;
  Line: any;
  XAxis: any;
  YAxis: any;
  CartesianGrid: any;
  Tooltip: any;
  Legend: any;
};

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    fill?: boolean;
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

interface SimpleLineChartProps {
  data: ChartData | null;
  width?: number;
  height?: number;
  hideAxes?: boolean;
  hideTooltip?: boolean;
}

export default function SimpleLineChart({ data, width, height, hideAxes = false, hideTooltip = false }: SimpleLineChartProps) {
  const [mounted, setMounted] = useState(false);
  const [recharts, setRecharts] = useState<RechartsComponents | null>(null);

  useEffect(() => {
    // Only load Recharts on client side
    if (typeof window !== 'undefined') {
      import('recharts').then((module) => {
        setRecharts({
          ResponsiveContainer: module.ResponsiveContainer,
          LineChart: module.LineChart,
          Line: module.Line,
          XAxis: module.XAxis,
          YAxis: module.YAxis,
          CartesianGrid: module.CartesianGrid,
          Tooltip: module.Tooltip,
          Legend: module.Legend,
        });
        setMounted(true);
      });
    }
  }, []);

  // Don't render anything on server or until Recharts is loaded
  if (!mounted || !recharts) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (!data || !data.labels || !data.datasets) {
    return <div className="flex items-center justify-center h-64">No data available</div>;
  }

  const {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
  } = recharts;

  // Transform the data to the format expected by Recharts
  const chartData = data.labels.map((label, index) => {
    // Handle date formatting - labels might be in 'yyyy-MM-dd' format or already formatted
    let formattedDate: string;
    try {
      // Try parsing as ISO date first
      formattedDate = format(parseISO(label), 'MMM d');
    } catch {
      // If parsing fails, try as regular date string
      try {
        formattedDate = format(new Date(label), 'MMM d');
      } catch {
        // If all else fails, use the label as-is
        formattedDate = label;
      }
    }

    const dataPoint: any = {
      date: label,
      formattedDate: formattedDate,
    };
    
    // Add dataset values to the data point
    data.datasets.forEach((dataset, datasetIndex) => {
      dataPoint[`value${datasetIndex}`] = dataset.data[index] || 0;
    });
    
    return dataPoint;
  });

  // Define colors
  const colors = {
    violet500: '#8B5CF6',
    violet300: '#C4B5FD',
    gray300: '#D1D5DB',
    gray500: '#6B7280',
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={hideAxes ? { top: 0, right: 0, left: 0, bottom: 0 } : { top: 20, right: 30, left: 20, bottom: 5 }}>
          {!hideAxes && (
            <>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gray300} vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                stroke={colors.gray500}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: colors.gray300 }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                stroke={colors.gray500}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: colors.gray300 }}
                width={40}
                tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              />
            </>
          )}
          {!hideTooltip && (
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: `1px solid ${colors.gray300}`,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                padding: '0.5rem'
              }}
              labelFormatter={(label: string | number) => `Date: ${label}`}
              formatter={(value: any, name: string) => {
                // Format the value and the series name
                return [value, name === 'value0' ? 'Current' : 'Previous'];
              }}
            />
          )}
          {!hideAxes && <Legend formatter={(value: string) => (value === 'value0' ? 'Current' : 'Previous')} />}
          
          {/* Current period line (first dataset) */}
          <Line
            type="monotone"
            dataKey="value0"
            stroke={colors.violet500}
            strokeWidth={2}
            dot={hideAxes ? false : { r: 3, fill: colors.violet500, strokeWidth: 0 }}
            activeDot={hideAxes ? false : { r: 6, stroke: colors.violet500, strokeWidth: 2, fill: 'white' }}
            name="value0"
          />
          
          {/* Previous period line (second dataset) - only if it exists */}
          {data.datasets.length > 1 && (
            <Line
              type="monotone"
              dataKey="value1"
              stroke={colors.gray500}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              name="value1"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

