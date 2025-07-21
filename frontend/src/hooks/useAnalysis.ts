import {
  uploadService,
  type AnalysisRequest,
  fetchAnalysisStatus,
} from "@/services/api";
import { useAnalysisContext } from "@/hooks/useAnalysisContext";
import { useEffect, useState, useRef } from "react";
import { AnalysisApiResponse } from "@/contexts/AnalysisContext";
import { toast } from "@/components/ui/use-toast"; // <-- Add this import

export const useAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const {
    setAnalysisApiResponse,
    clearAnalysis: clearContextAnalysis,
    analysisData,
    llmObservations,
    chartData,
  } = useAnalysisContext();
  const [insights, setInsights] = useState<string[]>([]);

  const runAnalysis = async (
    analysisData: AnalysisRequest
  ): Promise<boolean> => {
    // Validate required fields
    if (analysisData.dataSourceType === "csv" && !analysisData.filename) {
      toast({
        title: "Error",
        description: "Please upload a CSV file first.",
        variant: "destructive",
      });
      return false;
    }

    if (
      !analysisData.userId ||
      !analysisData.cohortGrouping ||
      !analysisData.eventColumn ||
      !analysisData.analysisMetric ||
      !analysisData.cohortInterval
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }

    // Validate revenue column if revenue analysis is selected
    if (
      analysisData.analysisMetric === "revenue" &&
      !analysisData.revenueColumn
    ) {
      toast({
        title: "Error",
        description: "Please specify the revenue column for revenue analysis.",
        variant: "destructive",
      });
      return false;
    }

    // Validate date range if provided
    if (analysisData.startDate && analysisData.endDate) {
      const startDate = new Date(analysisData.startDate);
      const endDate = new Date(analysisData.endDate);

      if (startDate >= endDate) {
        toast({
          title: "Error",
          description: "Start date must be before end date.",
          variant: "destructive",
        });
        return false;
      }
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await uploadService.runAnalysis(analysisData);
      setAnalysisApiResponse(result as AnalysisApiResponse);

      return true;
    } catch (error: unknown) {
      console.error("Analysis error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Analysis failed";
      setAnalysisError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    clearContextAnalysis(); // Clear context data
    setAnalysisError(null);
    setInsights([]);
  };

  return {
    isAnalyzing,
    analysisResult: analysisData,
    chartData,
    llmObservations,
    analysisError,
    runAnalysis,
    clearAnalysis,
    insights,
  };
};

export function useAnalysisStatus(jobId: string | null) {
  const [status, setStatus] = useState<
    "processing" | "ready" | "failed" | null
  >(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        const data = await fetchAnalysisStatus(jobId);
        // Ensure status is one of the allowed values
        if (
          data.status === "processing" ||
          data.status === "ready" ||
          data.status === "failed"
        ) {
          setStatus(data.status);
        } else {
          setStatus(null);
        }
        setDownloadUrl(data.download_url);
        if (data.status === "ready") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        setStatus("failed");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    // Start polling every 3 seconds
    intervalRef.current = setInterval(fetchStatus, 3000);
    // Fetch immediately
    fetchStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);
  console.log(status, downloadUrl);

  return { status, downloadUrl };
}
