import pandas as pd
from typing import Dict, Any, Optional
from pathlib import Path
from app.utils.preprocessing import preprocess_dataframe
from app.chart_generation import chart_service
from app.utils.logger import get_logger


logger = get_logger(__name__)

class CohortAnalysisService:
    """Service for performing cohort analysis with different time intervals"""

    def __init__(self):
        # Create static directory for storing charts
        self.static_dir = Path("static")
        self.charts_dir = self.static_dir / "charts"
        self.charts_dir.mkdir(parents=True, exist_ok=True)

    def perform_cohort_analysis(
        self,
        df: pd.DataFrame,
        user_id_col: str,
        cohort_grouping_col: str,
        event_col: str,
        interval: str = 'monthly',
        revenue_col: Optional[str] = None,
        preprocessing: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        logger.info("Starting cohort analysis.")
        # Apply preprocessing if config is provided
        df = preprocess_dataframe(df, preprocessing.dict() if hasattr(preprocessing, "dict") else preprocessing)

        # Create a copy and rename columns for consistency with notebook
        df_analysis = df.copy()

        # Validate input data
        if df_analysis.empty:
            logger.error("Input DataFrame is empty")
            raise ValueError("Input DataFrame is empty")

        if user_id_col not in df_analysis.columns:
            logger.error(f"User ID column '{user_id_col}' not found in data")
            raise ValueError(f"User ID column '{user_id_col}' not found in data")

        if cohort_grouping_col not in df_analysis.columns:
            logger.error(f"Cohort grouping column '{cohort_grouping_col}' not found in data")
            raise ValueError(f"Cohort grouping column '{cohort_grouping_col}' not found in data")

        if event_col not in df_analysis.columns:
            logger.error(f"Event column '{event_col}' not found in data")
            raise ValueError(f"Event column '{event_col}' not found in data")

        # Handle different column mappings to avoid duplicate key issues
        column_mapping = {user_id_col: 'CustomerID'}

        # If cohort and event columns are the same, use one mapping
        if cohort_grouping_col == event_col:
            column_mapping[cohort_grouping_col] = 'InvoiceDate'
        else:
            # If they're different, we need to handle them separately
            column_mapping[cohort_grouping_col] = 'CohortDate'
            column_mapping[event_col] = 'EventDate'

        df_analysis = df_analysis.rename(columns=column_mapping)

        # Validate that the rename worked correctly
        if 'CustomerID' not in df_analysis.columns:
            logger.error(f"Failed to create CustomerID column. Available columns: {df_analysis.columns.tolist()}")
            raise ValueError(f"Failed to create CustomerID column. Available columns: {df_analysis.columns.tolist()}")

        # Convert date columns to datetime
        try:
            if 'InvoiceDate' in df_analysis.columns:
                df_analysis['InvoiceDate'] = pd.to_datetime(df_analysis['InvoiceDate'], errors='coerce')
            else:
                df_analysis['CohortDate'] = pd.to_datetime(df_analysis['CohortDate'], errors='coerce')
                df_analysis['EventDate'] = pd.to_datetime(df_analysis['EventDate'], errors='coerce')
                # For analysis, we'll use EventDate as InvoiceDate for consistency
                df_analysis['InvoiceDate'] = df_analysis['EventDate']
        except Exception as e:
            logger.error(f"Error converting dates to datetime: {str(e)}")
            raise ValueError(f"Error converting dates to datetime: {str(e)}")

        # Perform cohort analysis based on interval
        try:
            if interval == 'daily':
                if cohort_grouping_col == event_col:
                    df_analysis['CohortPeriod'] = df_analysis.groupby('CustomerID')['InvoiceDate'].transform('min').dt.date
                else:
                    df_analysis['CohortPeriod'] = df_analysis['CohortDate'].dt.date
                df_analysis['ActivityPeriod'] = df_analysis['InvoiceDate'].dt.date
                df_clean = df_analysis.dropna(subset=['CohortPeriod', 'ActivityPeriod'])
                df_clean['CohortPeriod'] = pd.to_datetime(df_clean['CohortPeriod'])
                df_clean['ActivityPeriod'] = pd.to_datetime(df_clean['ActivityPeriod'])
                df_clean['PeriodIndex'] = (df_clean['ActivityPeriod'] - df_clean['CohortPeriod']).dt.days

            elif interval == 'weekly':
                if cohort_grouping_col == event_col:
                    df_analysis['CohortPeriod'] = df_analysis.groupby('CustomerID')['InvoiceDate'].transform('min').dt.to_period('W').dt.start_time
                else:
                    df_analysis['CohortPeriod'] = df_analysis['CohortDate'].dt.to_period('W').dt.start_time
                df_analysis['ActivityPeriod'] = df_analysis['InvoiceDate'].dt.to_period('W').dt.start_time
                df_clean = df_analysis.dropna(subset=['CohortPeriod', 'ActivityPeriod'])
                df_clean['PeriodIndex'] = ((df_clean['ActivityPeriod'] - df_clean['CohortPeriod']).dt.days / 7).astype(int)

            elif interval == 'monthly':
                if cohort_grouping_col == event_col:
                    df_analysis['CohortPeriod'] = df_analysis.groupby('CustomerID')['InvoiceDate'].transform('min').dt.to_period('M')
                else:
                    df_analysis['CohortPeriod'] = df_analysis['CohortDate'].dt.to_period('M')
                df_analysis['ActivityPeriod'] = df_analysis['InvoiceDate'].dt.to_period('M')
                df_clean = df_analysis.dropna(subset=['CohortPeriod', 'ActivityPeriod'])
                df_clean['PeriodIndex'] = (df_clean['ActivityPeriod'] - df_clean['CohortPeriod']).apply(lambda x: x.n)

            elif interval == 'quarterly':
                if cohort_grouping_col == event_col:
                    df_analysis['CohortPeriod'] = df_analysis.groupby('CustomerID')['InvoiceDate'].transform('min').dt.to_period('Q')
                else:
                    df_analysis['CohortPeriod'] = df_analysis['CohortDate'].dt.to_period('Q')
                df_analysis['ActivityPeriod'] = df_analysis['InvoiceDate'].dt.to_period('Q')
                df_clean = df_analysis.dropna(subset=['CohortPeriod', 'ActivityPeriod'])
                df_clean['PeriodIndex'] = (df_clean['ActivityPeriod'] - df_clean['CohortPeriod']).apply(lambda x: x.n)
            
            elif interval == 'yearly':
                if cohort_grouping_col == event_col:
                    df_analysis['CohortPeriod'] = df_analysis.groupby('CustomerID')['InvoiceDate'].transform('min').dt.to_period('Y')
                else:
                    df_analysis['CohortPeriod'] = df_analysis['CohortDate'].dt.to_period('Y')
                df_analysis['ActivityPeriod'] = df_analysis['InvoiceDate'].dt.to_period('Y')
                df_clean = df_analysis.dropna(subset=['CohortPeriod', 'ActivityPeriod'])
                df_clean['PeriodIndex'] = (df_clean['ActivityPeriod'] - df_clean['CohortPeriod']).apply(lambda x: x.n)

            else:
                logger.error("Interval must be 'daily', 'weekly', 'monthly', 'quarterly' or 'yearly'")
                raise ValueError("Interval must be 'daily', 'weekly', 'monthly', 'quarterly' or 'yearly'")

        except Exception as e:
            logger.error(f"Error during {interval} cohort calculation: {str(e)}")
            raise ValueError(f"Error during {interval} cohort calculation: {str(e)}")

        if df_clean.empty:
            logger.error("No valid data after cleaning. Please check your data quality and date formats.")
            raise ValueError("No valid data after cleaning. Please check your data quality and date formats.")

        if 'CustomerID' not in df_clean.columns:
            logger.error("CustomerID column missing after data processing.")
            raise ValueError("CustomerID column missing after data processing.")

        df_clean = df_clean[df_clean['PeriodIndex'] >= 0]
        df_clean = df_clean.drop_duplicates(subset=['CustomerID', 'CohortPeriod', 'PeriodIndex'])

        cohort_data = df_clean.groupby(['CohortPeriod', 'PeriodIndex'])['CustomerID'].nunique().reset_index()

        if cohort_data.empty:
            logger.error("No cohort data generated. Please check your data and ensure it has valid dates and user IDs.")
            raise ValueError("No cohort data generated. Please check your data and ensure it has valid dates and user IDs.")

        try:
            cohort_pivot = cohort_data.pivot_table(
                index='CohortPeriod',
                columns='PeriodIndex',
                values='CustomerID',
                aggfunc='sum',
                fill_value=0
            )
        except ValueError as e:
            if "duplicate" in str(e).lower():
                logger.warning("Duplicate keys found in cohort_data, aggregating before pivot.")
                cohort_data_agg = cohort_data.groupby(['CohortPeriod', 'PeriodIndex'])['CustomerID'].sum().reset_index()
                cohort_pivot = cohort_data_agg.pivot_table(
                    index='CohortPeriod',
                    columns='PeriodIndex',
                    values='CustomerID',
                    aggfunc='first',
                    fill_value=0
                )
            else:
                logger.error(f"Error creating pivot table: {str(e)}. Data shape: {cohort_data.shape}, Columns: {cohort_data.columns.tolist()}")
                raise ValueError(f"Error creating pivot table: {str(e)}. Data shape: {cohort_data.shape}, Columns: {cohort_data.columns.tolist()}")

        if cohort_pivot.empty:
            logger.error("Pivot table is empty. No cohort analysis data could be generated.")
            raise ValueError("Pivot table is empty. No cohort analysis data could be generated.")

        if cohort_pivot.empty or cohort_pivot.shape[1] == 0:
            logger.error("No cohort data found. Please check your data and column selections.")
            raise ValueError("No cohort data found. Please check your data and column selections.")

        if 0 not in cohort_pivot.columns:
            logger.error("No period 0 data found. This indicates no users in their first period.")
            raise ValueError("No period 0 data found. This indicates no users in their first period.")

        cohort_sizes = cohort_pivot[0]
        retention = cohort_pivot.divide(cohort_sizes, axis=0)

        revenue_table = None
        if revenue_col and revenue_col in df.columns:
            try:
                df_clean[revenue_col] = pd.to_numeric(df_clean[revenue_col], errors='coerce')
                df_revenue = df_clean.dropna(subset=[revenue_col])
                if df_revenue.empty:
                    logger.warning(f"No valid revenue data found in column '{revenue_col}'")
                    raise ValueError(f"No valid revenue data found in column '{revenue_col}'")
                revenue_data = df_revenue.groupby(['CohortPeriod', 'PeriodIndex'])[revenue_col].sum().reset_index()
                if revenue_data.empty:
                    logger.warning("No revenue data could be aggregated")
                    raise ValueError("No revenue data could be aggregated")
                revenue_table = revenue_data.pivot_table(
                    index='CohortPeriod',
                    columns='PeriodIndex',
                    values=revenue_col,
                    aggfunc='sum',
                    fill_value=0
                )
            except ValueError as e:
                if "duplicate" in str(e).lower():
                    logger.warning("Duplicate keys found in revenue_data, aggregating before pivot.")
                    revenue_data_agg = revenue_data.groupby(['CohortPeriod', 'PeriodIndex'])[revenue_col].sum().reset_index()
                    revenue_table = revenue_data_agg.pivot_table(
                        index='CohortPeriod',
                        columns='PeriodIndex',
                        values=revenue_col,
                        aggfunc='first',
                        fill_value=0
                    )
                else:
                    logger.warning(f"Revenue analysis skipped due to error: {str(e)}")
                    revenue_table = None
            except Exception as e:
                logger.error(f"Unexpected error in revenue analysis: {str(e)}")
                revenue_table = None

        totalRows = df.shape[0]
        total_revenue = None
        if revenue_col and revenue_col in df.columns:
            try:
                total_revenue = pd.to_numeric(df[revenue_col], errors='coerce').sum()
            except Exception as e:
                logger.warning(f"Could not calculate total revenue: {str(e)}")
                total_revenue = None

        logger.info(f"Total rows after preprocessing: {totalRows}")
        result = self._format_results(totalRows, retention, cohort_sizes, interval, revenue_table, cohort_pivot)

        heatmap_url = chart_service.generate_retention_heatmap(retention, interval)
        result['charts'] = {'retention_heatmap': heatmap_url}
        result['total_revenue'] = float(total_revenue) if total_revenue is not None else None  # <-- add total_revenue to result
        logger.info("Cohort analysis completed successfully.")
        return result

    def _format_results(self, totalRows: int, retention: pd.DataFrame, cohort_sizes: pd.Series, interval: str, revenue_table: Optional[pd.DataFrame] = None, cohort_pivot: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        retention_dict = {}
        cohort_sizes_dict = {}

        for cohort in retention.index:
            if interval == 'daily':
                cohort_name = cohort.strftime('%Y-%m-%d') if hasattr(cohort, 'strftime') else str(cohort)
            elif interval == 'weekly':
                # cohort is a Period object, get its start_time and format as ISO date or custom string
                if hasattr(cohort, 'start_time'):
                    cohort_name = cohort.start_time.strftime('%Y-%m-%d')
                else:
                    cohort_name = str(cohort)
            elif interval in ['monthly', 'quarterly']:
                cohort_name = cohort.strftime('%Y-%m') if hasattr(cohort, 'strftime') else str(cohort)
            else:
                cohort_name = str(cohort)

            retention_dict[cohort_name] = {}
            for period in retention.columns:
                retention_rate = retention.loc[cohort, period]
                if not pd.isna(retention_rate) and retention_rate > 0:
                    retention_dict[cohort_name][str(period)] = float(retention_rate)
            cohort_sizes_dict[cohort_name] = int(cohort_sizes[cohort])

        revenue_dict = None
        arpu_dict = None
        ltv_dict = None

        if revenue_table is not None:
            revenue_dict = {}
            arpu_dict = {}
            ltv_dict = {}
            cohorts_to_process = cohort_pivot.index if cohort_pivot is not None else revenue_table.index
            for cohort in cohorts_to_process:
                if interval == 'daily':
                    cohort_name = cohort.strftime('%Y-%m-%d') if hasattr(cohort, 'strftime') else str(cohort)
                elif interval == 'weekly':
                    cohort_name = cohort.strftime('%Y-W%U') if hasattr(cohort, 'strftime') else str(cohort)
                elif interval in ['monthly', 'quarterly']:
                    cohort_name = cohort.strftime('%Y-%m') if hasattr(cohort, 'strftime') else str(cohort)
                else:
                    cohort_name = str(cohort)
                revenue_dict[cohort_name] = {}
                arpu_dict[cohort_name] = {}
                ltv_dict[cohort_name] = {}
                cumulative_revenue = 0
                periods_to_process = cohort_pivot.columns if cohort_pivot is not None else revenue_table.columns
                for period in periods_to_process:
                    if cohort in revenue_table.index and period in revenue_table.columns:
                        revenue_value = revenue_table.loc[cohort, period]
                    else:
                        revenue_value = 0
                    revenue_dict[cohort_name][str(period)] = round(float(revenue_value), 2)
                    if cohort_pivot is not None and cohort in cohort_pivot.index and period in cohort_pivot.columns:
                        user_count = cohort_pivot.loc[cohort, period]
                        if user_count > 0:
                            arpu_value = revenue_value / user_count
                            arpu_dict[cohort_name][str(period)] = round(float(arpu_value), 2)
                        else:
                            arpu_dict[cohort_name][str(period)] = 0.0
                    else:
                        arpu_dict[cohort_name][str(period)] = 0.0
                    cumulative_revenue += revenue_value
                    ltv_dict[cohort_name][str(period)] = round(float(cumulative_revenue), 2)

        result = {
            'totalRows': totalRows,
            'retention_table': retention_dict,
            'cohort_sizes': cohort_sizes_dict,
            'interval': interval,
            'analysis_type': 'retention'
        }
        if revenue_dict:
            result['revenue_table'] = revenue_dict
            result['analysis_type'] = 'revenue'
        if arpu_dict:
            result['arpu_table'] = arpu_dict
        if ltv_dict:
            result['ltv_table'] = ltv_dict
        return result

# Create global instance
cohort_service = CohortAnalysisService()

