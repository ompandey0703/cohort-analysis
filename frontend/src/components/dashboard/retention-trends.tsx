import { useState } from "react";
import { AnalysisData } from "@/contexts/AnalysisContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast"; // <-- Add this import

interface RetentionTrendsProps {
  data?: AnalysisData;
}

const TABLE_OPTIONS = [
  {
    label: "Retention Table",
    value: "retention_table",
    yAxis: "Retention (%)",
    isPercent: true,
  },
  {
    label: "Revenue Table",
    value: "revenue_table",
    yAxis: "Revenue",
    isPercent: false,
  },
  { label: "ARPU Table", value: "arpu_table", yAxis: "ARPU", isPercent: false },
  { label: "LTV Table", value: "ltv_table", yAxis: "LTV", isPercent: false },
];

export function RetentionTrends({ data }: RetentionTrendsProps) {
  const [selectedTable, setSelectedTable] = useState<string>("retention_table");
  try {
    const analysisData = data;

    // Get the selected table data from cohort_analysis
    const tableData =
      analysisData?.cohort_analysis?.[
        selectedTable as keyof typeof analysisData.cohort_analysis
      ] || {};

    const cohortNames = Object.keys(tableData || {});
    // Get all period numbers (as strings)
    const allPeriods = new Set<string>();
    cohortNames.forEach((cohort) => {
      Object.keys(tableData[cohort] || {}).forEach((period) =>
        allPeriods.add(period)
      );
    });
    const sortedPeriods = Array.from(allPeriods).sort(
      (a, b) => Number(a) - Number(b)
    );

    // Find selected table config
    const selectedTableConfig = TABLE_OPTIONS.find(
      (opt) => opt.value === selectedTable
    );

    // Build trendsData array
    type TrendsEntry = {
      period: string;
      [cohort: string]: number | null | string;
    };

    const trendsData: TrendsEntry[] = sortedPeriods.map((period) => {
      const intervalLabel =
        analysisData?.cohort_interval === "daily"
          ? "Day"
          : analysisData?.cohort_interval === "weekly"
          ? "Week"
          : analysisData?.cohort_interval === "monthly"
          ? "Month"
          : analysisData?.cohort_interval === "quarterly"
          ? "Quarter"
          : "Period";
      const entry: TrendsEntry = { period: `${intervalLabel} ${period}` };
      cohortNames.forEach((cohort) => {
        const value = tableData[cohort]?.[period];
        entry[cohort] =
          value !== undefined && value !== null
            ? selectedTableConfig?.isPercent
              ? Number((value * 100).toFixed(2))
              : Number(value.toFixed(2))
            : null;
      });
      return entry;
    });

    // If no backend data, fallback to static demo data
    const chartData =
      trendsData.length > 0
        ? trendsData
        : [
            {
              week: "Week 0",
              "Jan 2024": 100,
              "Feb 2024": 100,
              "Mar 2024": 100,
            },
            {
              week: "Week 1",
              "Jan 2024": 48.2,
              "Feb 2024": 45.7,
              "Mar 2024": 52.1,
            },
            {
              week: "Week 2",
              "Jan 2024": 32.1,
              "Feb 2024": 28.9,
              "Mar 2024": 35.7,
            },
            {
              week: "Week 3",
              "Jan 2024": 28.4,
              "Feb 2024": 25.1,
              "Mar 2024": 31.2,
            },
            {
              week: "Week 4",
              "Jan 2024": 22.4,
              "Feb 2024": 19.3,
              "Mar 2024": 24.8,
            },
          ];

    // Get Y axis label for the selected table
    const yAxisLabel = selectedTableConfig?.yAxis || "Value";

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cohort Trends</CardTitle>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger
                className="w-48 h-9 text-sm font-semibold border-primary bg-white dark:bg-background shadow-sm hover:border-accent focus:ring-2 focus:ring-primary"
                style={{
                  borderRadius: "0.5rem",
                  minWidth: "180px",
                  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
                }}
              >
                <SelectValue placeholder="Select Table" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm font-medium px-8 py-2 hover:bg-accent" // <-- px-8 adds enough left padding for checkmark
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px] max-w-full border rounded-lg bg-muted dark:bg-background dark:border-muted">
            <div className="min-w-[800px] w-full h-[400px] bg-muted dark:bg-background">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="period"
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                    domain={[0, "auto"]}
                    tickFormatter={(value) =>
                      typeof value === "number" ? value.toFixed(2) : value
                    }
                    label={{
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      style: {
                        textAnchor: "middle",
                        fontSize: 13,
                        fill: "#888",
                      },
                    }}
                  />
                  <Legend />
                  <Tooltip
                    formatter={(value: number | string) =>
                      typeof value === "number"
                        ? selectedTableConfig?.isPercent
                          ? value.toFixed(2) + "%"
                          : value.toFixed(2)
                        : value
                    }
                  />
                  {cohortNames.length > 0
                    ? cohortNames.map((cohort, idx) => (
                        <Line
                          key={cohort}
                          type="monotone"
                          dataKey={cohort}
                          stroke={`hsl(var(--chart-${idx + 1}))`}
                          strokeWidth={2}
                          dot={{
                            fill: `hsl(var(--chart-${idx + 1}))`,
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />
                      ))
                    : [
                        <Line
                          key="Jan 2024"
                          type="monotone"
                          dataKey="Jan 2024"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={{
                            fill: "hsl(var(--chart-1))",
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />,
                        <Line
                          key="Feb 2024"
                          type="monotone"
                          dataKey="Feb 2024"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={{
                            fill: "hsl(var(--chart-2))",
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />,
                        <Line
                          key="Mar 2024"
                          type="monotone"
                          dataKey="Mar 2024"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          dot={{
                            fill: "hsl(var(--chart-3))",
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />,
                      ]}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-right">
            Time Period
          </div>
        </CardContent>
      </Card>
    );
  } catch (err) {
    toast({
      title: "Error",
      description:
        err?.message || "An error occurred while rendering the chart.",
      variant: "destructive",
    });
    return null;
  }
}
