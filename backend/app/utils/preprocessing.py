# Preprocessing logic
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any
from app.utils.logger import get_logger

logger = get_logger(__name__)

def remove_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.DataFrame:
    """Remove outliers from numerical columns using Z-score."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        col_zscore = (df[col] - df[col].mean()) / df[col].std()
        df = df[(np.abs(col_zscore) < z_thresh) | (df[col].isnull())]
    logger.info(f"Outliers removed from columns: {list(numeric_cols)}")
    return df

def impute_categorical(df: pd.DataFrame, strategy: str = "most_frequent") -> pd.DataFrame:
    """Impute missing values in categorical columns."""
    cat_cols = df.select_dtypes(include=["object", "category"]).columns
    for col in cat_cols:
        if strategy == "most_frequent":
            fill_value = df[col].mode().iloc[0] if not df[col].mode().empty else "Unknown"
        elif strategy == "constant":
            fill_value = "Unknown"
        elif strategy == "unknown":
            fill_value = "Unknown"
        else:
            fill_value = "Unknown"
        df[col] = df[col].fillna(fill_value)
        logger.info(f"Imputed missing values in categorical column '{col}' with strategy '{strategy}' and value '{fill_value}'")
    return df

def impute_numerical(df: pd.DataFrame, strategy: str = "mean") -> pd.DataFrame:
    """Impute missing values in numerical columns."""
    num_cols = df.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        if strategy == "mean":
            fill_value = df[col].mean()
        elif strategy == "median":
            fill_value = df[col].median()
        elif strategy == "zero":
            fill_value = 0
        else:
            fill_value = df[col].mean()
        df[col] = df[col].fillna(fill_value)
        logger.info(f"Imputed missing values in numerical column '{col}' with strategy '{strategy}' and value '{fill_value}'")
    return df

def convert_types(df: pd.DataFrame) -> pd.DataFrame:
    """Convert columns to appropriate types (e.g., dates, numerics) based on heuristics."""
    for col in df.columns:
        col_lower = col.lower()
        # Try datetime conversion only for likely date columns
        if any(x in col_lower for x in ["date", "time", "timestamp"]):
            try:
                df[col] = pd.to_datetime(df[col], errors='raise')
                logger.info(f"Converted column '{col}' to datetime.")
                continue
            except Exception:
                logger.info(f"Column '{col}' could not be converted to datetime.")
        # Try numeric conversion for columns not already numeric and not likely dates
        if not pd.api.types.is_numeric_dtype(df[col]):
            try:
                df[col] = pd.to_numeric(df[col], errors='raise')
                logger.info(f"Converted column '{col}' to numeric.")
            except Exception:
                logger.info(f"Column '{col}' could not be converted to numeric.")
    return df

def preprocess_dataframe(
    df: pd.DataFrame,
    preprocessing: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """Apply preprocessing steps to the DataFrame based on config."""
    logger.info(f"Preprocessing config: {preprocessing}")
    if not preprocessing:
        return df

    # Data cleaning (remove outliers)
    if preprocessing.get("dataCleaning"):
        logger.info("Starting outlier removal.")
        df = remove_outliers(df)

    # Null handling
    null_handling = preprocessing.get("nullHandling")
    if isinstance(null_handling, dict):
        cat_strategy = null_handling.get("categorical", "most_frequent")
        num_strategy = null_handling.get("numerical", "mean")
        logger.info(f"Imputing categorical columns with strategy '{cat_strategy}' and numerical columns with strategy '{num_strategy}'.")
        df = impute_categorical(df, strategy=cat_strategy)
        df = impute_numerical(df, strategy=num_strategy)
    elif null_handling:
        logger.info("Imputing all columns with default strategies.")
        df = impute_categorical(df)
        df = impute_numerical(df)

    # Type conversion
    if preprocessing.get("typeConversion"):
        logger.info("Starting type conversion for columns.")
        df = convert_types(df)

    logger.info("Preprocessing complete.")
    return df