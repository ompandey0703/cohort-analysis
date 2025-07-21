import pandas as pd

# Use safe_iso to avoid AttributeError
def safe_iso(val):
    if pd.isnull(val):
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)