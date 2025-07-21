import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface KeyObservationsProps {
  data?: string[] | null;
}

export function KeyObservations({ data }: KeyObservationsProps) {
  try {
    const insights = data;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Key Observations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            {insights && insights.length > 0 ? (
              insights.map((insight, idx) => {
                const cleaned = insight.replace(/^\*\s*/, "");
                const parts = cleaned.split(":");
                return (
                  <div
                    key={idx}
                    className={`border-l-4 pl-4 border-chart-${(idx % 3) + 1}`}
                  >
                    <p className="font-medium text-foreground">
                      {parts.length > 1 ? cleaned : insight}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-muted-foreground">
                No insights available for this analysis.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  } catch (err) {
    toast({
      title: "Error",
      description:
        err?.message || "An error occurred while rendering key observations.",
      variant: "destructive",
    });
    return null;
  }
}
