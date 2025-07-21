from pydantic import BaseModel
from typing import Optional, List, Union, Literal

class NullHandlingOptions(BaseModel):
    categorical: Optional[str] = None
    numerical: Optional[str] = None

class DataCleaningOptions(BaseModel):
    remove: bool
    capping: bool

class PreprocessingOptions(BaseModel):
    dataCleaning: Optional[Union[bool, DataCleaningOptions]] = None
    nullHandling: Optional[Union[bool, NullHandlingOptions]] = None
    typeConversion: bool

class AnalysisRequest(BaseModel):
    filename: Optional[str]
    userId: str
    cohortGrouping: str
    eventColumn: str
    revenueColumn: Optional[str] = None
    analysisMetric: str
    cohortInterval: str
    columns: List[str]
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    preprocessing: Optional[PreprocessingOptions] = None

    # Add frontend-only fields as optional
    dataSourceType: Literal["csv", "sql", "db"] = None
    dbUrl: Optional[str] = None
    selectedTable: Optional[str] = None
    llm_insights: bool = True
