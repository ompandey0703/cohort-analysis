import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from datetime import datetime
from pathlib import Path
import pandas as pd
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ChartService:
    def __init__(self):
        self.static_dir = Path("static")
        self.charts_dir = self.static_dir / "charts"
        self.charts_dir.mkdir(parents=True, exist_ok=True)

    def generate_retention_heatmap(self, retention: pd.DataFrame, interval: str) -> str:
        """
        Generate retention heatmap and save as image file

        Parameters:
        retention: DataFrame with retention rates (numeric values 0-1)
        interval: Time interval for labeling

        Returns:
        URL path to the generated heatmap image
        """
        try:
            logger.info("Generating retention heatmap.")
            retention_plot = retention.copy()

            if retention_plot.empty:
                logger.warning("Retention DataFrame is empty. No heatmap generated.")
                return None

            if retention_plot.dtypes.iloc[0] == 'object':
                for col in retention_plot.columns:
                    for idx in retention_plot.index:
                        value = retention_plot.loc[idx, col]
                        if isinstance(value, str) and value.endswith('%'):
                            retention_plot.loc[idx, col] = float(value.replace('%', '')) / 100
                        elif value == "" or pd.isna(value):
                            retention_plot.loc[idx, col] = np.nan
                        elif isinstance(value, str):
                            try:
                                retention_plot.loc[idx, col] = float(value)
                            except:
                                retention_plot.loc[idx, col] = np.nan
                retention_plot = retention_plot.astype(float)

            max_cohorts = 15
            max_periods = 12

            if len(retention_plot) > max_cohorts:
                logger.info(f"Limiting cohorts to first {max_cohorts} for heatmap.")
                retention_plot = retention_plot.head(max_cohorts)

            if len(retention_plot.columns) > max_periods:
                logger.info(f"Limiting periods to first {max_periods} for heatmap.")
                retention_plot = retention_plot.iloc[:, :max_periods]

            if interval == 'daily':
                period_labels = [f"Day {i}" for i in retention_plot.columns]
            elif interval == 'weekly':
                period_labels = [f"Week {i}" for i in retention_plot.columns]
            elif interval == 'monthly':
                period_labels = [f"Month {i}" for i in retention_plot.columns]
            elif interval == 'quarterly':
                period_labels = [f"Quarter {i}" for i in retention_plot.columns]
            else:
                period_labels = [f"Period {i}" for i in retention_plot.columns]

            retention_plot.columns = period_labels

            if interval == 'daily':
                retention_plot.index = retention_plot.index.strftime('%Y-%m-%d')
            elif interval == 'weekly':
                retention_plot.index = retention_plot.index.strftime('%Y-W%U')
            elif interval in ['monthly', 'quarterly']:
                retention_plot.index = retention_plot.index.strftime('%Y-%m')

            plt.figure(figsize=(14, 8))
            mask = retention_plot.isna()
            sns.heatmap(
                retention_plot,
                annot=True,
                fmt=".1%",
                cmap="YlOrRd",
                cbar_kws={'label': 'Retention Rate'},
                mask=mask,
                linewidths=0.5,
                linecolor='white'
            )

            plt.title(f'{interval.title()} Cohort Retention Heatmap', fontsize=16, fontweight='bold')
            plt.xlabel(f'{interval.title()} Period', fontsize=12)
            plt.ylabel('Cohort', fontsize=12)
            plt.xticks(rotation=45)
            plt.yticks(rotation=0)
            plt.tight_layout()

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"retention_heatmap_{interval}_{timestamp}.png"
            filepath = self.charts_dir / filename

            plt.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='white')
            plt.close()

            logger.info(f"Retention heatmap saved to {filepath}")
            return f"/static/charts/{filename}"

        except Exception as e:
            logger.error(f"Error generating retention heatmap: {e}")
            plt.close()
            return None

# Global instance
chart_service = ChartService()
