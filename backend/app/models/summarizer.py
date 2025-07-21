from pydantic import BaseModel

class SummarizeRequest(BaseModel):
    analysis_results: dict  # Pass the cohort analysis results object

class SummarizeResponse(BaseModel):
    insights: list
