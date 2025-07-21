import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: false,
});

export interface UploadResponse {
  filename: string;
  message: string;
}

export interface ColumnsResponse {
  columns: string[];
}

export interface AnalysisRequest {
  filename: string;
  userId: string;
  cohortGrouping: string;
  eventColumn: string;
  revenueColumn?: string;
  analysisMetric: string;
  cohortInterval: string;
  columns: string[];
  startDate?: string;
  endDate?: string;
  dataSourceType?: "csv" | "sql" | "db";
  dbUrl?: string;
  selectedTable?: string;
  preprocessing?: {
    dataCleaning: {
      remove: boolean;
      capping: boolean;
    };
    nullHandling?:
      | boolean
      | {
          categorical: string;
          numerical: string;
        };
    typeConversion: boolean;
  };
}

export const uploadService = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    console.log(formData);

    try {
      const response = await apiClient.post("/upload", formData, {
        headers: {
          accept: "application/json",
          // Let browser set Content-Type with boundary
        },
      });

      return response.data;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ERR_NETWORK"
      ) {
        throw new Error("Network error - check if server is running");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const err = error as {
          response?: { data?: { detail?: string }; statusText?: string };
        };
        throw new Error(
          `Upload failed: ${
            err.response?.data?.detail || err.response?.statusText
          }`
        );
      } else {
        throw new Error("Upload failed - connection error");
      }
    }
  },

  runAnalysis: async (analysisData: AnalysisRequest): Promise<unknown> => {
    try {
      console.log("Sending analysis request:", analysisData);
      const response = await apiClient.post("/analysis", analysisData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(`Analysis response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      console.error("Analysis API error:", error);
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as {
          response?: {
            data?: { detail?: string | Array<{ msg: string; type: string }> };
            statusText?: string;
            status?: number;
          };
        };

        // Handle validation errors
        if (
          err.response?.status === 422 &&
          Array.isArray(err.response.data?.detail)
        ) {
          const validationErrors = err.response.data.detail
            .map((e) => e.msg)
            .join(", ");
          throw new Error(`Validation failed: ${validationErrors}`);
        }

        throw new Error(
          `Analysis failed: ${
            err.response?.data?.detail || err.response?.statusText
          }`
        );
      } else {
        throw new Error("Analysis failed - connection error");
      }
    }
  },

  fetchSchema: async (params: {
    filename?: string;
    dbUrl?: string;
    table?: string;
  }): Promise<{ tables: string[]; columns: string[] }> => {
    const search = new URLSearchParams();
    if (params.filename) search.append("filename", params.filename);
    if (params.dbUrl) search.append("db_url", params.dbUrl);
    if (params.table) search.append("table", params.table);
    const res = await apiClient.get(`/schema?${search.toString()}`);
    console.log(res);
    return {
      tables: res.data.tables || [],
      columns: res.data.columns || [],
    };
  },
};

export const fetchAnalysisStatus = async (
  jobId: string
): Promise<{ status: string; download_url: string }> => {
  const res = await apiClient.get(`/analysis-status?job_id=${jobId}`);
  return res.data; // { status, download_url }
};
