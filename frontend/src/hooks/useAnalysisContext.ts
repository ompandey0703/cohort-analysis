import { useContext } from "react";
import { AnalysisContext } from "@/contexts/AnalysisContext";

export const useAnalysisContext = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error(
      "useAnalysisContext must be used within an AnalysisProvider"
    );
  }
  return context;
};
