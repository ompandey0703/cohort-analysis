import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUpload } from "@/hooks/useUpload";
import { useAnalysis, useAnalysisStatus } from "@/hooks/useAnalysis";
import { uploadService } from "@/services/api";
import { type AnalysisRequest } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

export function Sidebar() {
  // Data source type state
  const [dataSourceType, setDataSourceType] = useState<"csv" | "sql" | "db">(
    "csv"
  );
  const [dbUrl, setDbUrl] = useState("");
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");

  const [newColumn, setNewColumn] = useState("");
  const [cohortGrouping, setCohortGrouping] = useState("");
  const [eventColumn, setEventColumn] = useState("");
  const [userId, setUserId] = useState("");
  const [revenueColumn, setRevenueColumn] = useState("");
  const [cohortInterval, setCohortInterval] = useState("monthly");
  const [analysisMetric, setAnalysisMetric] = useState("retention");

  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tablesLoaded, setTablesLoaded] = useState(false);
  // Advanced preprocessing options (set all to true by default)
  const [dataCleaning, setDataCleaning] = useState(true);
  const [dataCleaningMethod, setDataCleaningMethod] = useState<
    "capping" | "remove"
  >("capping");
  const [nullHandling, setNullHandling] = useState(true);
  const [typeConversion, setTypeConversion] = useState(true);
  const [nullCategorical, setNullCategorical] = useState("most_frequent");
  const [nullNumerical, setNullNumerical] = useState("mean");
  const [llmInsights, setLlmInsights] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);

  // Use the upload hook which handles file uploads and columns
  const {
    file,
    response,
    isUploading,
    columns,
    uploadedFileName,
    handleFileChange,
    handleUpload,
    clearFile,
    setColumns, // <-- BUG: setColumns was missing from destructuring
  } = useUpload();

  // Use the analysis hook which handles analysis operations
  const {
    isAnalyzing,
    analysisResult,
    analysisError,
    runAnalysis,
    clearAnalysis,
  } = useAnalysis();
  // console.log(analysisResult);
  // Pass the analysis ID or relevant identifier if required by the hook

  // Show toast and/or download link when analysis is ready

  // Local state for user-selected columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Update selected columns when CSV columns are loaded
  useEffect(() => {
    if (columns.length > 0) {
      const autoSelect = columns.filter((col) =>
        ["user_id", "signup_date", "purchase_date"].includes(col.toLowerCase())
      );
      setSelectedColumns(autoSelect);

      const userIdCol = columns.find(
        (col) =>
          col.toLowerCase().includes("user_id") ||
          col.toLowerCase().includes("userid")
      );
      const signupCol = columns.find(
        (col) =>
          col.toLowerCase().includes("signup") ||
          col.toLowerCase().includes("register")
      );
      const purchaseCol = columns.find(
        (col) =>
          col.toLowerCase().includes("purchase") ||
          col.toLowerCase().includes("event")
      );

      if (userIdCol) setUserId(userIdCol);
      if (signupCol) setCohortGrouping(signupCol);
      if (purchaseCol) setEventColumn(purchaseCol);
    }
  }, [columns]);

  // Clear form when file changes
  useEffect(() => {
    if (!uploadedFileName) {
      setUserId("");
      setCohortGrouping("");
      setEventColumn("");
      setRevenueColumn("");
      setSelectedColumns([]);
      setColumns([]); // <-- BUG: columns were not cleared when file was cleared
    }
  }, [uploadedFileName, setColumns]);

  const addColumn = () => {
    if (newColumn.trim() && !selectedColumns.includes(newColumn.trim())) {
      setSelectedColumns([...selectedColumns, newColumn.trim()]);
      setNewColumn("");
    }
  };

  const removeColumn = (column: string) => {
    setSelectedColumns(selectedColumns.filter((c) => c !== column));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addColumn();
    }
  };

  const handleFileChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColumns([]);
    setUserId("");
    setCohortGrouping("");
    setEventColumn("");
    setRevenueColumn("");
    clearAnalysis();
    handleFileChange(e);
  };

  // Validation helper function
  const isFormValid = () => {
    if (dataSourceType === "csv") {
      const hasRequiredFields =
        uploadedFileName &&
        userId &&
        cohortGrouping &&
        eventColumn &&
        analysisMetric &&
        cohortInterval;
      const hasValidColumns =
        columns.includes(userId) &&
        columns.includes(cohortGrouping) &&
        columns.includes(eventColumn);
      const hasRevenueColumn =
        analysisMetric !== "revenue" ||
        (revenueColumn && columns.includes(revenueColumn));
      const hasSelectedColumns = selectedColumns.length > 0;
      return (
        hasRequiredFields &&
        hasValidColumns &&
        hasRevenueColumn &&
        hasSelectedColumns
      );
    }
    if (dataSourceType === "db") {
      return !!dbUrl && !!selectedTable;
    }
    return false;
  };

  const handleRunAnalysis = async () => {
    if (!isFormValid()) {
      alert(
        "Please fill in all required fields and select at least one column."
      );
      return;
    }

    const analysisData: AnalysisRequest = {
      dataSourceType,
      filename: uploadedFileName!,
      userId,
      cohortGrouping,
      eventColumn,
      revenueColumn: analysisMetric === "revenue" ? revenueColumn : undefined,
      analysisMetric,
      cohortInterval,
      columns: selectedColumns,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dbUrl: dataSourceType === "db" ? dbUrl : undefined,
      selectedTable: dataSourceType === "db" ? selectedTable : undefined,
      preprocessing: {
        dataCleaning: {
          remove: dataCleaningMethod === "remove",
          capping: dataCleaningMethod === "capping",
        },
        nullHandling: nullHandling
          ? {
              categorical: nullCategorical,
              numerical: nullNumerical,
            }
          : undefined,
        typeConversion,
      },
      // <-- add this property
    };

    await runAnalysis(analysisData);
  };

  const [dbSchemaLoaded, setDbSchemaLoaded] = useState(false);

  const handleFetchDbSchema = async () => {
    try {
      setDbSchemaLoaded(false);
      setAvailableTables([]);
      setColumns([]);
      const params: { dbUrl: string } = { dbUrl };
      const { tables, columns } = await uploadService.fetchSchema(params);
      setAvailableTables(tables || []);
      setColumns(columns || []);
      setDbSchemaLoaded(true);
      toast({
        title: "Success",
        description: "Tables and columns loaded.",
        variant: "default",
      });
    } catch (err) {
      setAvailableTables([]);
      setColumns([]);
      setDbSchemaLoaded(false);
      toast({
        title: "Error fetching schema",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Remove dbUrl and selectedTable from dependencies for DB mode
  useEffect(() => {
    if (dataSourceType === "csv" && uploadedFileName) {
      // Only auto-fetch for CSV
      const fetchSchema = async () => {
        try {
          const params = { filename: uploadedFileName };
          const { tables, columns } = await uploadService.fetchSchema(params);
          setAvailableTables(tables || []);
          setColumns(columns || []);
        } catch (err) {
          setAvailableTables([]);
          setColumns([]);
          toast({
            title: "Error fetching schema",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        }
      };
      fetchSchema();
    } else if (dataSourceType !== "csv") {
      setAvailableTables([]);
      setColumns([]);
    }
    // Only depend on dataSourceType and uploadedFileName for CSV
  }, [dataSourceType, uploadedFileName, setColumns]);

  // Fetch columns for selected table in DB mode
  useEffect(() => {
    if (dataSourceType === "db" && dbSchemaLoaded && selectedTable) {
      const fetchColumns = async () => {
        try {
          const { columns } = await uploadService.fetchSchema({
            dbUrl,
            table: selectedTable,
          });
          setColumns(columns || []);
        } catch (err) {
          setColumns([]);
          toast({
            title: "Error fetching columns",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        }
      };
      fetchColumns();
    }
    // Only run when these change
  }, [dataSourceType, dbSchemaLoaded, selectedTable, dbUrl, setColumns]);

  // Helper to guess datetime columns (simple heuristic: column name or sample value)
  function isDateTimeColumn(
    col: string,
    sampleRows: Record<string, unknown>[] = []
  ) {
    // Check by column name
    const lower = col.toLowerCase();
    if (
      lower.includes("date") ||
      lower.includes("time") ||
      lower.includes("timestamp") ||
      lower.includes("created_at") ||
      lower.includes("updated_at") ||
      lower === "createdat" ||
      lower === "updatedat" ||
      lower === "created" ||
      lower === "updated"
    ) {
      return true;
    }
    // Optionally, check sample values for ISO date/datetime strings
    for (const row of sampleRows) {
      const val = row?.[col];
      if (
        typeof val === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(val) // starts with YYYY-MM-DD
      ) {
        return true;
      }
    }
    return false;
  }

  // If you have sample data, pass it to isDateTimeColumn; otherwise, just use column names
  const dateTimeColumns = columns.filter((col) => isDateTimeColumn(col));

  const uniqueTables = Array.from(new Set(availableTables));

  return (
    <div className="w-96 border-r bg-muted/30 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Source Type Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Data Source Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={dataSourceType}
              onValueChange={(v) =>
                setDataSourceType(v as "csv" | "sql" | "db")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV Upload</SelectItem>
                <SelectItem value="db">Database URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CSV Upload */}
          {dataSourceType === "csv" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Upload CSV File <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChangeWrapper}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <Button
                  onClick={handleUpload}
                  className="w-full"
                  variant="outline"
                  disabled={!file || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
                {uploadedFileName && (
                  <div className="text-sm p-2 rounded-md bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <span>✓ File uploaded successfully</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={clearFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {response && !uploadedFileName && (
                  <div
                    className={`text-sm p-2 rounded-md border ${
                      response.includes("failed") || response.includes("error")
                        ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
                        : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                    }`}
                  >
                    {response}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Database URL */}
          {dataSourceType === "db" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Database URL <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="postgres://user:pass@host:port/db"
              />
              <Button
                className="w-full mt-4"
                size="lg"
                onClick={handleFetchDbSchema}
                disabled={!dbUrl}
              >
                Fetch Tables
              </Button>
              {dbSchemaLoaded && availableTables.length > 0 && (
                <div className="mt-2">
                  <Label className="text-xs">Select Table</Label>
                  <Select
                    value={selectedTable}
                    onValueChange={setSelectedTable}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTables.map((table) => (
                        <SelectItem key={table} value={table}>
                          {table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Available Columns (show after upload) */}
          {columns.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Columns</Label>
              <div className="max-h-32 overflow-y-auto p-2 border rounded-md bg-muted/50">
                <div className="flex flex-wrap gap-1">
                  {columns.map((column) => (
                    <Badge
                      key={column}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        if (!selectedColumns.includes(column)) {
                          setSelectedColumns([...selectedColumns, column]);
                        }
                      }}
                    >
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Column Names */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Selected Column Names <span className="text-destructive">*</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter column name"
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
                onKeyUp={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={addColumn} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedColumns.map((column) => (
                <Badge
                  key={column}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {column}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeColumn(column)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {/* User Identifier Column */}
          <div className="space-y-2">
            <Label htmlFor="user-id" className="text-sm font-medium">
              User Identifier Column <span className="text-destructive">*</span>
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user ID column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cohort Grouping Column */}
          <div className="space-y-2">
            <Label htmlFor="cohort-grouping" className="text-sm font-medium">
              Cohort Grouping Column (Datetime type){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select value={cohortGrouping} onValueChange={setCohortGrouping}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort grouping column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem
                    key={column}
                    value={column}
                    className={
                      dateTimeColumns.includes(column)
                        ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                        : ""
                    }
                  >
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Column */}
          <div className="space-y-2">
            <Label htmlFor="event-column" className="text-sm font-medium">
              Event Column (Datetime type){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select value={eventColumn} onValueChange={setEventColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select event column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem
                    key={column}
                    value={column}
                    className={
                      dateTimeColumns.includes(column)
                        ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                        : ""
                    }
                  >
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Analysis Metric <span className="text-destructive">*</span>
            </Label>
            <Select value={analysisMetric} onValueChange={setAnalysisMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retention">User Retention</SelectItem>
                <SelectItem value="revenue">Continuous</SelectItem>
                {/* <SelectItem value="engagement">Engagement</SelectItem> */}
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Column */}
          {analysisMetric === "revenue" && (
            <div className="space-y-2">
              <Label htmlFor="revenue-column" className="text-sm font-medium">
                Revenue Column <span className="text-destructive">*</span>
              </Label>
              <Select value={revenueColumn} onValueChange={setRevenueColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select revenue column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cohort Size Interval */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Cohort Size Interval <span className="text-destructive">*</span>
            </Label>
            <Select value={cohortInterval} onValueChange={setCohortInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="start-date"
                  className="text-xs text-muted-foreground"
                >
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="end-date"
                  className="text-xs text-muted-foreground"
                >
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Advanced Preprocessing Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Pre-processing Options
            </Label>
            <div className="space-y-2">
              {/* Data Cleaning Checkbox and Dropdown */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="data-cleaning"
                  checked={dataCleaning}
                  onCheckedChange={(checked) =>
                    setDataCleaning(checked === true)
                  }
                />
                <Label htmlFor="data-cleaning" className="text-sm">
                  Data Cleaning
                </Label>
                {dataCleaning && (
                  <Select
                    value={dataCleaningMethod}
                    onValueChange={(v) =>
                      setDataCleaningMethod(v as "capping" | "remove")
                    }
                  >
                    <SelectTrigger className="ml-2 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capping">Cap outliers (99%)</SelectItem>
                      <SelectItem value="remove">Remove outliers</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {/* Null Handling */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="null-handling"
                  checked={nullHandling}
                  onCheckedChange={(checked) =>
                    setNullHandling(checked === true)
                  }
                />
                <Label htmlFor="null-handling" className="text-sm">
                  Null Handling
                </Label>
              </div>
              {nullHandling && (
                <div className="pl-4 space-y-1">
                  <Label className="text-xs">Categorical</Label>
                  <Select
                    value={nullCategorical}
                    onValueChange={setNullCategorical}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most_frequent">
                        Most Frequent
                      </SelectItem>
                      <SelectItem value="constant">Constant</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">Numerical</Label>
                  <Select
                    value={nullNumerical}
                    onValueChange={setNullNumerical}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mean">Mean</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                      <SelectItem value="zero">Zero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Type Conversion */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-conversion"
                  checked={typeConversion}
                  onCheckedChange={(checked) =>
                    setTypeConversion(checked === true)
                  }
                />
                <Label htmlFor="type-conversion" className="text-sm">
                  Type Conversion
                </Label>
              </div>
            </div>
          </div>

          {/* LLM Insights Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="llm-insights"
              checked={llmInsights}
              onCheckedChange={(checked) => setLlmInsights(checked === true)}
            />
            <Label htmlFor="llm-insights" className="text-sm">
              LLM Insights (AI-generated summary)
            </Label>
          </div>

          {/* Run Analysis Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !isFormValid()}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {isAnalyzing ? "Running Analysis..." : "Run Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-xs text-muted-foreground">
        © 2023 Smart Data Platform. All rights reserved.
      </div>
    </div>
  );
}
