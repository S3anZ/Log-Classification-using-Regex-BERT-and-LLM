import re
import json
from pathlib import Path
import pandas as pd

def generate_regex_from_template(template_str: str) -> str:
    """Converts a masked log template into a precise Regex pattern with unique named capture groups."""
    token_pattern = re.compile(r'(<IP>|<UUID>|<HEX>|<NUM>)', flags=re.IGNORECASE)
    parts = token_pattern.split(template_str)
    
    regex_parts = []
    ip_counter = 1
    uuid_counter = 1
    hex_counter = 1
    num_counter = 1
    
    for part in parts:
        part_upper = part.upper()
        if part_upper == '<IP>':
            regex_parts.append(rf'(?P<ip_{ip_counter}>(?:\d{{1,3}}\.){{3}}\d{{1,3}})')
            ip_counter += 1
        elif part_upper == '<UUID>':
            regex_parts.append(rf'(?P<uuid_{uuid_counter}>[0-9a-fA-F]{{8}}-(?:[0-9a-fA-F]{{4}}-){{3}}[0-9a-fA-F]{{12}})')
            uuid_counter += 1
        elif part_upper == '<HEX>':
            regex_parts.append(rf'(?P<hex_{hex_counter}>0x[0-9a-fA-F]+)')
            hex_counter += 1
        elif part_upper == '<NUM>':
            regex_parts.append(rf'(?P<num_{num_counter}>\d+)')
            num_counter += 1
        else:
            regex_parts.append(re.escape(part))
            
    return r"(?i)^" + "".join(regex_parts) + r"$"

def extract_cluster_patterns(clustered_csv_path: Path):
    """Reads clustered logs and extracts compiled Regex patterns for each cluster."""
    df = pd.read_csv(clustered_csv_path)
    
    patterns = []
    valid_clusters = df[df['cluster_id'] != -1]
    
    for cluster_id, group in valid_clusters.groupby('cluster_id'):
        template = group['processed_message'].mode()[0]
        regex_str = generate_regex_from_template(template)
        
        compiled_regex = re.compile(regex_str, flags=re.IGNORECASE)
        matched_count = sum(1 for msg in group['message'] if compiled_regex.match(msg))
        match_accuracy = (matched_count / len(group)) * 100
        
        pattern_entry = {
            "cluster_id": int(cluster_id),
            "source": group['source'].iloc[0],
            "log_level": group['log_level'].iloc[0],
            "sample_log": group['message'].iloc[0],
            "template": template,
            "regex_pattern": regex_str,
            "case_insensitive": True,
            "matched_count": matched_count,
            "total_cluster_logs": len(group),
            "match_accuracy_pct": round(match_accuracy, 1)
        }
        patterns.append(pattern_entry)
        
    return patterns

def main():
    csv_path = Path(__file__).parent / 'dataset' / 'clustered_logs.csv'
    if not csv_path.exists():
        raise FileNotFoundError(f"Clustered logs file not found at {csv_path}. Run cluster_logs.py first.")
        
    patterns = extract_cluster_patterns(csv_path)
    
    print("\n" + "=" * 80)
    print(f"  EXTRACTED LOG TEMPLATES & CASE-INSENSITIVE REGEX PATTERNS ({len(patterns)} Clusters)")
    print("=" * 80)
    
    for p in patterns[:10]:
        print(f"\n[Cluster {p['cluster_id']}] Source: {p['source']} | Level: {p['log_level']} | Accuracy: {p['match_accuracy_pct']}%")
        print(f"  Human Template : {p['template']}")
        print(f"  Generated Regex: {p['regex_pattern']}")
        print(f"  Sample Raw Log : {p['sample_log']}")

    if len(patterns) > 10:
        print(f"\n... (+ {len(patterns) - 10} more clusters generated)")

    # Save patterns to JSON file
    output_json = Path(__file__).parent / 'dataset' / 'log_patterns.json'
    with open(output_json, 'w') as f:
        json.dump(patterns, f, indent=2)
        
    print("\n" + "=" * 80)
    print(f" Saved {len(patterns)} regex patterns to: dataset/log_patterns.json")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
