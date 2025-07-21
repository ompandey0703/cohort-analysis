import { useEffect} from "react";
import { AnalysisResults } from "./analysis-results";
import { RetentionHeatmap } from "./retention-heatmap";
import { RetentionTrends } from "./retention-trends";
import { KeyObservations } from "./key-observations";
import { useAnalysisContext } from "@/hooks/useAnalysisContext";
import { useAnalysisStatus } from "@/hooks/useAnalysis";
import { Download } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export function MainContent() {
  const {
    analysisData,
    isAnalysisComplete,
    llmObservations,
    jobId,
  } = useAnalysisContext();

  // Poll for job status and download URL
  // console.log("jobId:", jobId);
  const { status, downloadUrl } = useAnalysisStatus(jobId);

  // Show toast when download is ready
  useEffect(() => {
    if (status === "ready" && downloadUrl) {
      toast({
        title: "Download Ready",
        description: (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Click here to download your results.
          </a>
        ),
        variant: "default",
        duration: 10000,
      });
    }
  }, [status, downloadUrl]);

  return (
    <div className="flex-1 p-6 space-y-6 relative">
      {/* Download button in top right when ready */}
      {status === "ready" && downloadUrl && (
        <div className="absolute top-6 right-6 z-20">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
            title="Download Results"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Results
          </a>
        </div>
      )}

      {/* Analysis Results - Only show when data is available */}
      {isAnalysisComplete && analysisData ? (
        <AnalysisResults data={analysisData} />
      ) : (
        <div className="text-center text-muted-foreground py-12">
          <div className="space-y-4">
            <div className="text-lg font-medium">No Analysis Results Yet</div>
            <p>Upload a CSV file and run analysis to see results here.</p>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40"></span>
              <span>Waiting for analysis...</span>
            </div>
          </div>
        </div>
      )}
      {/* Visualization Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Visualization</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RetentionHeatmap data={analysisData} />
          <RetentionTrends data={analysisData} />
        </div>
      </div>
      {/* Key Observations */}
      <KeyObservations data={llmObservations} />
      {/* Footer Links */}
      <div className="flex justify-end space-x-6 text-sm text-muted-foreground pt-6 border-t">
        <a href="#" className="hover:text-foreground transition-colors">
          Help
        </a>
        <a href="#" className="hover:text-foreground transition-colors">
          Documentation
        </a>
        <a href="#" className="hover:text-foreground transition-colors">
          Privacy Policy
        </a>
        <a href="#" className="hover:text-foreground transition-colors">
          Terms of Service
        </a>
      </div>
    </div>
  );
}
