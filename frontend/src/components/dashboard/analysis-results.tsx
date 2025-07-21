import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { type AnalysisData } from "@/contexts/AnalysisContext";
import { toast } from "@/components/ui/use-toast"; // Add this import at the top

interface AnalysisResultsProps {
  data: AnalysisData;
}

// Props include response from backend
export function AnalysisResults({ data }: AnalysisResultsProps) {
  console.log(data);
  const [expandedSections, setExpandedSections] = useState<{
    retention: boolean;
    revenue: boolean;
    arpu: boolean;
    ltv: boolean;
  }>({
    retention: true,
    revenue: false,
    arpu: false,
    ltv: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderMatrixTable = (
    matrixData: Record<string, Record<string, number>>,
    matrixType: "retention" | "revenue" | "arpu" | "ltv",
    cohortSizes: Record<string, number>
  ) => {
    // Get all unique periods from all cohorts
    const allPeriods = new Set<number>();
    Object.values(matrixData).forEach((cohortData) => {
      Object.keys(cohortData).forEach((period) => {
        allPeriods.add(parseInt(period));
      });
    });
    const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b);

    const formatValue = (
      value: number,
      type: "retention" | "revenue" | "arpu" | "ltv"
    ) => {
      switch (type) {
        case "retention":
          return `${(value * 100).toFixed(1)}%`;
        case "revenue":
        case "arpu":
        case "ltv":
          return `₹${value.toLocaleString()}`;
        default:
          return value.toString();
      }
    };

    // Limit the number of columns and rows to display at once
    const MAX_PERIODS = 12; // Show up to 12 periods (months/weeks/days)
    const MAX_COHORTS = 20; // Show up to 20 cohorts

    const limitedPeriods = sortedPeriods.slice(0, MAX_PERIODS);
    const cohortEntries = Object.entries(matrixData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(0, MAX_COHORTS);

    return (
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <div style={{ minWidth: 900, maxHeight: 500, overflow: "auto" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">
                  Cohort (Signup{" "}
                  {cohort_interval === "monthly" ? "Month" : "Period"})
                </TableHead>
                <TableHead className="text-center font-medium">Users</TableHead>
                {limitedPeriods.map((period) => (
                  <TableHead key={period} className="text-center font-medium">
                    {cohort_interval === "monthly"
                      ? `Month ${period}`
                      : `Period ${period}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortEntries.map(([cohortDate, data]) => {
                const cohortSize = cohortSizes[cohortDate] || 0;
                return (
                  <TableRow key={cohortDate}>
                    <TableCell className="font-medium">
                      {new Date(cohortDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {cohortSize}
                    </TableCell>
                    {limitedPeriods.map((period) => {
                      const value = data[period.toString()];
                      return (
                        <TableCell key={period} className="text-center">
                          {value !== undefined
                            ? formatValue(value, matrixType)
                            : ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {(sortedPeriods.length > MAX_PERIODS ||
          Object.keys(matrixData).length > MAX_COHORTS) && (
          <div className="text-xs text-muted-foreground mt-2">
            Showing first {MAX_COHORTS} cohorts and first {MAX_PERIODS} periods.
            Scroll to see more or refine your cohort interval.
          </div>
        )}
      </div>
    );
  };

  if (!data) {
    return null;
  }

  const {
    columns,
    head,
    total_revenue,
    unique_users,
    date_range,
    total_rows,
    analysis_type,
    analysis_metric,
    cohort_interval,
    note,
    cohort_analysis,
  } = data;

  // Error boundary for rendering
  try {
    return (
      <div className="space-y-4">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {analysis_type === "revenue"
                ? "Revenue Analysis"
                : analysis_type === "retention"
                ? "Retention Analysis"
                : "Analysis Results"}
            </CardTitle>
            {date_range?.start && date_range?.end && (
              <p className="text-sm text-muted-foreground">
                {`Date Range: ${new Date(
                  date_range.start
                ).toLocaleDateString()} - ${new Date(
                  date_range.end
                ).toLocaleDateString()}`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {total_rows && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {total_rows.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Rows
                  </div>
                </div>
              )}
              {unique_users && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {unique_users.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Unique Users
                  </div>
                </div>
              )}
              {total_revenue !== undefined && total_revenue !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    ₹{total_revenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Revenue
                  </div>
                </div>
              )}
              {cohort_interval && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary capitalize">
                    {cohort_interval}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cohort Interval
                  </div>
                </div>
              )}
            </div>
            {note && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">{note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cohort Analysis Matrices */}
        {cohort_analysis?.cohort_sizes && (
          <div className="space-y-4">
            {/* Retention Matrix */}
            {cohort_analysis?.retention_table && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Retention Analysis</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection("retention")}
                      className="h-8 w-8 p-0"
                    >
                      {expandedSections.retention ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expandedSections.retention && (
                  <CardContent>
                    {renderMatrixTable(
                      cohort_analysis.retention_table,
                      "retention",
                      cohort_analysis.cohort_sizes
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Revenue Matrix */}
            {cohort_analysis?.revenue_table && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Revenue Analysis</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection("revenue")}
                      className="h-8 w-8 p-0"
                    >
                      {expandedSections.revenue ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expandedSections.revenue && (
                  <CardContent>
                    {renderMatrixTable(
                      cohort_analysis.revenue_table,
                      "revenue",
                      cohort_analysis.cohort_sizes
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* ARPU Matrix */}
            {cohort_analysis?.arpu_table && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>ARPU (Average Revenue Per User)</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection("arpu")}
                      className="h-8 w-8 p-0"
                    >
                      {expandedSections.arpu ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expandedSections.arpu && (
                  <CardContent>
                    {renderMatrixTable(
                      cohort_analysis.arpu_table,
                      "arpu",
                      cohort_analysis.cohort_sizes
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* LTV Matrix */}
            {cohort_analysis?.ltv_table && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>LTV (Lifetime Value)</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection("ltv")}
                      className="h-8 w-8 p-0"
                    >
                      {expandedSections.ltv ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expandedSections.ltv && (
                  <CardContent>
                    {renderMatrixTable(
                      cohort_analysis.ltv_table,
                      "ltv",
                      cohort_analysis.cohort_sizes
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Data Preview */}
        {head && head.length > 0 && columns && (
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead
                          key={col}
                          className="font-medium text-muted-foreground"
                        >
                          {col.toUpperCase()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {head.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map((col) => (
                          <TableCell key={col}>
                            {col === "timestamp" && row[col]
                              ? new Date(row[col] as string).toLocaleString()
                              : row[col] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (err) {
    toast({
      title: "Error",
      description:
        err?.message || "An error occurred while rendering analysis results.",
      variant: "destructive",
    });
    return null;
  }
}
