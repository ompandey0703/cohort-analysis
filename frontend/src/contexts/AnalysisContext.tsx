import React, { createContext, useState, ReactNode, useContext } from "react";
import { toast } from "@/components/ui/use-toast"; // <-- Add this import

// Define specific types for cohort analysis data
interface CohortTableData {
  [cohortGroup: string]: {
    [periodNumber: string]: number;
  };
}

interface CohortSizes {
  [cohortGroup: string]: number;
}

interface RowData {
  [key: string]: string | number | boolean | null;
}

export interface AnalysisData {
  total_rows?: number;
  columns?: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  unique_users?: number;
  total_revenue?: number;
  analysis_type?: string;
  analysis_metric?: string;
  cohort_interval?: string;
  head?: RowData[];
  note?: string;
  cohort_analysis?: {
    cohort_table?: CohortTableData;
    retention_table?: CohortTableData;
    cohort_sizes?: CohortSizes;
    revenue_table?: CohortTableData;
    arpu_table?: CohortTableData;
    ltv_table?: CohortTableData;
    charts?: {
      retention_heatmap?: string;
    };
  };
  insights?: string[];
}

export interface AnalysisApiResponse {
  data: AnalysisData;
  chart_data: { [key: string]: string };
  llm_observations?: string[] | null;
  job_id?: string | null; // <-- add this line
}

export interface AnalysisContextType {
  analysisData: AnalysisData | null;
  chartData: { [key: string]: string } | null;
  llmObservations: string[] | null;
  jobId: string | null; // <-- add this line
  setAnalysisApiResponse: (resp: AnalysisApiResponse | null) => void;
  isAnalysisComplete: boolean;
  clearAnalysis: () => void;
}

export const AnalysisContext = createContext<AnalysisContextType | undefined>(
  undefined
);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [chartData, setChartData] = useState<{ [key: string]: string } | null>(
    null
  );
  const [llmObservations, setLlmObservations] = useState<string[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null); // <-- add this line

  const isAnalysisComplete = analysisData !== null;

  const clearAnalysis = () => {
    setAnalysisData(null);
    setChartData(null);
    setLlmObservations(null);
    setJobId(null); // <-- add this line
  };

  const setAnalysisApiResponse = (resp: AnalysisApiResponse | null) => {
    if (resp) {
      setAnalysisData(resp.data);
      setChartData(resp.chart_data || null);
      setLlmObservations(resp.llm_observations ?? null);
      setJobId(resp.job_id ?? null); // <-- add this line
    } else {
      setAnalysisData(null);
      setChartData(null);
      setLlmObservations(null);
      setJobId(null); // <-- add this line
    }
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysisData,
        isAnalysisComplete,
        clearAnalysis,
        chartData,
        llmObservations,
        jobId, // <-- add this line
        setAnalysisApiResponse,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

// Custom hook for using the context safely
export function useAnalysisContext() {
  const context = useContext(AnalysisContext);
  if (!context) {
    toast({
      title: "Error",
      description: "useAnalysisContext must be used within an AnalysisProvider",
      variant: "destructive",
    });
    // Optionally, throw to halt execution if context is missing
    throw new Error(
      "useAnalysisContext must be used within an AnalysisProvider"
    );
  }
  return context;
}

// Usage example elsewhere:
// const { setAnalysisApiResponse } = useAnalysisContext();
// setAnalysisApiResponse(response); // response should have { data, chart_data, llm_observations }
