import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AnalysisData } from "@/contexts/AnalysisContext";
import { toast } from "@/components/ui/use-toast"; // <-- Add this import

interface RetentionHeatmapProps {
  data?: AnalysisData;
}

export function RetentionHeatmap({ data }: RetentionHeatmapProps) {
  // Check if we have heatmap data from the backend
  console.log("RetentionHeatmap data:", data);
  const heatmapUrl = data?.cohort_analysis?.charts?.retention_heatmap;

  if (!heatmapUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retention Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Run analysis to generate retention heatmap</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Backend URL for the API
  const apiBaseUrl = "http://localhost:8000"; // Adjust based on your backend URL
  const fullImageUrl = `${apiBaseUrl}${heatmapUrl}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          {/* Scrollable container for the heatmap image */}
          <div className="overflow-y-auto max-h-[400px] max-w-full border rounded-lg bg-white dark:bg-background dark:border-muted">
            <img
              src={fullImageUrl}
              alt="Retention Heatmap"
              className="w-full h-auto min-w-[800px]"
              style={{
                maxWidth: "none",
              }}
              onError={(e) => {
                toast({
                  title: "Error",
                  description: "Failed to load heatmap image.",
                  variant: "destructive",
                });
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="flex items-center justify-center h-48 text-muted-foreground">
                    <p>Failed to load heatmap image</p>
                  </div>
                `;
              }}
            />
          </div>

          {/* Additional info about the heatmap */}
          <div className="mt-3 text-xs text-muted-foreground">
            <p>
              Retention rates shown as percentages. Darker colors indicate
              higher retention.
            </p>
            {data?.cohort_interval && (
              <p className="mt-1">Analysis interval: {data.cohort_interval}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
