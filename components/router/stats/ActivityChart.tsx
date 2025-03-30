import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

interface ActivityChartProps {
  data: number[];
}

interface ChartData {
  hour: string;
  cycles: number;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const formatHour = (hour: string) => {
    const hourNum = parseInt(hour);
    if (hourNum === 0) return "12 AM";
    if (hourNum === 12) return "12 PM";
    if (hourNum === 10 || hourNum === 11) return `${hourNum} AM`;
    if (hourNum === 22 || hourNum === 23) return `${hourNum - 12} PM`;
    return hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
  };

  const chartData: ChartData[] = data.map((value, hour) => ({
    hour: hour.toString().padStart(2, "0"),
    cycles: value,
  }));

  return (
    <Card className="bg-white dark:bg-gray-800 backdrop-blur-sm h-full shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-blue-500" />
          Daily Activity
        </CardTitle>
        <CardDescription>Cycles processed per hour</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: 30 }}>
              <XAxis
                dataKey="hour"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatHour}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={70}
                dy={8}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.[0]?.payload) {
                    const data = payload[0].payload as ChartData;
                    return (
                      <div className="rounded-lg border bg-white dark:bg-gray-900 p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-500 dark:text-gray-400">
                              Time
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-50">
                              {formatHour(data.hour)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-500 dark:text-gray-400">
                              Cycles
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-50">
                              {data.cycles}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="cycles"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-blue-500 dark:fill-blue-400"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
