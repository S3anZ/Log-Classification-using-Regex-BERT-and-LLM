import re
import json
from pathlib import Path
import pandas as pd

def classify_logs_with_patterns(dataset_path: Path, patterns_json_path: Path):
    """Splits raw log dataset into df_regex (matched via regex) and df_non_regex (unmatched for BERT fallback)."""
    df = pd.read_csv(dataset_path)
    
    with open(patterns_json_path, 'r') as f:
        patterns = json.load(f)
        
    # Compile all regex patterns with IGNORECASE flag
    compiled_patterns = [
        {
            "cluster_id": p["cluster_id"],
            "source": p["source"],
            "log_level": p["log_level"],
            "regex": re.compile(p["regex_pattern"], flags=re.IGNORECASE)
        }
        for p in patterns
    ]
    
    regex_matched_rows = []
    non_regex_rows = []
    
    for idx, row in df.iterrows():
        msg = row['message']
        matched = False
        
        for p in compiled_patterns:
            match = p['regex'].match(msg)
            if match:
                row_data = row.to_dict()
                row_data['matched_cluster_id'] = p['cluster_id']
                row_data['regex_matched_level'] = p['log_level']
                row_data['extracted_variables'] = json.dumps(match.groupdict())
                regex_matched_rows.append(row_data)
                matched = True
                break
                
        if not matched:
            non_regex_rows.append(row.to_dict())
            
    df_regex = pd.DataFrame(regex_matched_rows) if regex_matched_rows else pd.DataFrame(columns=df.columns)
    df_non_regex = pd.DataFrame(non_regex_rows) if non_regex_rows else pd.DataFrame(columns=df.columns)
    
    return df_regex, df_non_regex

def main():
    dataset_path = Path(__file__).parent / 'dataset' / 'synthetic_logs.csv'
    patterns_path = Path(__file__).parent / 'dataset' / 'log_patterns.json'
    
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")
    if not patterns_path.exists():
        raise FileNotFoundError(f"Patterns JSON not found at {patterns_path}. Run extract_patterns.py first.")
        
    print(f"Classifying logs from '{dataset_path.name}' using '{patterns_path.name}'...\n")
    df_regex, df_non_regex = classify_logs_with_patterns(dataset_path, patterns_path)
    
    total_logs = len(df_regex) + len(df_non_regex)
    regex_pct = round((len(df_regex) / total_logs) * 100, 1) if total_logs > 0 else 0
    non_regex_pct = round((len(df_non_regex) / total_logs) * 100, 1) if total_logs > 0 else 0
    
    print("=" * 70)
    print(f"CLASSIFICATION SPLIT SUMMARY:")
    print(f"  Total Input Logs           : {total_logs}")
    print(f"  df_regex (Matched Instant) : {len(df_regex)} logs ({regex_pct}%)")
    print(f"  df_non_regex (BERT Queue)  : {len(df_non_regex)} logs ({non_regex_pct}%)")
    print("=" * 70 + "\n")
    
    # Save outputs to CSV files
    out_dir = Path(__file__).parent / 'dataset'
    df_regex.to_csv(out_dir / 'df_regex.csv', index=False)
    df_non_regex.to_csv(out_dir / 'df_non_regex.csv', index=False)
    
    print(f"Saved matched logs to : {out_dir / 'df_regex.csv'}")
    print(f"Saved BERT queue logs to : {out_dir / 'df_non_regex.csv'}\n")

if __name__ == '__main__':
    main()
