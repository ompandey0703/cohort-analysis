import pandas as pd
import zipfile
import os
import uuid

def save_tables_to_csvs(tables: dict, output_dir: str) -> list:
    """
    Save multiple DataFrames to CSV files.
    :param tables: dict of {table_name: DataFrame}
    :param output_dir: directory to save CSVs
    :return: list of CSV file paths
    """
    os.makedirs(output_dir, exist_ok=True)
    csv_paths = []
    for table_name, df in tables.items():
        csv_path = os.path.join(output_dir, f"{table_name}.csv")
        df.to_csv(csv_path, index=False)
        csv_paths.append(csv_path)
    return csv_paths

def create_zip_with_csvs_and_heatmap(csv_file_paths, heatmap_file_path):
    """
    Create a zip file containing given CSVs and a heatmap image.
    The zip file is saved in the 'results' folder with a random name.
    Returns the zip file path.
    """
    os.makedirs("results", exist_ok=True)
    random_name = f"{uuid.uuid4().hex}.zip"
    zip_output_path = os.path.join("results", random_name)
    with zipfile.ZipFile(zip_output_path, 'w') as zipf:
        for csv_path in csv_file_paths:
            arcname = os.path.basename(csv_path)
            zipf.write(csv_path, arcname)
        if heatmap_file_path:
            # Convert static URL to real file path if needed
            if heatmap_file_path.startswith("/static/"):
                # The static directory is at backend_new/static/...
                # So we go up two levels from this file (app/utils/) to backend_new/
                base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                static_path = os.path.join(base_dir, heatmap_file_path.lstrip("/"))
                static_path = os.path.normpath(static_path)
            else:
                static_path = heatmap_file_path
            if os.path.exists(static_path):
                arcname = os.path.basename(static_path)
                zipf.write(static_path, arcname)
    return zip_output_path

# Example usage:
# Suppose you have 3 tables as pandas DataFrames:
# tables = {
#     "users": users_df,
#     "orders": orders_df,
#     "products": products_df
# }
# output_dir = "output_csvs"
# csv_paths = save_tables_to_csvs(tables, output_dir)
# heatmap_path = "retention_heatmap.png"
# zip_path = create_zip_with_csvs_and_heatmap(csv_paths, heatmap_path)