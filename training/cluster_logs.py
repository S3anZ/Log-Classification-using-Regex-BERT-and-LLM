import re
from pathlib import Path
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN

def preprocess_log(message: str) -> str:
    """Preprocess log message by masking dynamic variables (IPs, numbers, UUIDs, paths) with case-insensitivity."""
    # Replace IP addresses
    msg = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '<IP>', message, flags=re.IGNORECASE)
    # Replace UUIDs
    msg = re.sub(r'\b[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\b', '<UUID>', msg, flags=re.IGNORECASE)
    # Replace Hex / Hashes
    msg = re.sub(r'\b0x[0-9a-fA-F]+\b', '<HEX>', msg, flags=re.IGNORECASE)
    # Replace numbers
    msg = re.sub(r'\d+', '<NUM>', msg, flags=re.IGNORECASE)
    return msg

def main():
    # 1. Load synthetic logs dataset
    dataset_path = Path(__file__).parent / 'dataset' / 'synthetic_logs.csv'
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} log messages from '{dataset_path.name}'.\n")

    # Preprocess messages for template embedding
    raw_messages = df['message'].tolist()
    processed_messages = [preprocess_log(m) for m in raw_messages]

    # 2. Load SentenceTransformer model
    model_name = 'all-MiniLM-L6-v2'
    print(f"Loading SentenceTransformer model ('{model_name}')...")
    model = SentenceTransformer(model_name)

    # 3. Generate embeddings on preprocessed log messages
    print("Generating log embeddings...")
    embeddings = model.encode(processed_messages, show_progress_bar=True, normalize_embeddings=True)

    # 4. Perform DBSCAN Clustering
    eps = 0.45
    min_samples = 2
    print(f"\nClustering with DBSCAN (eps={eps}, min_samples={min_samples}, metric='cosine')...")
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine')
    cluster_labels = clustering.fit_predict(embeddings)

    # Attach cluster assignments to DataFrame
    df['cluster_id'] = cluster_labels
    df['processed_message'] = processed_messages

    # 5. Analyze & Display Results
    num_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
    num_noise = list(cluster_labels).count(-1)

    print("\n" + "=" * 65)
    print(f"Clustering Summary: {num_clusters} Clusters Found, {num_noise} Outliers/Anomalies (-1)")
    print("=" * 65 + "\n")

    # Save output to CSV
    output_path = Path(__file__).parent / 'dataset' / 'clustered_logs.csv'
    df.to_csv(output_path, index=False)
    print(f"Clustered results saved to: {output_path}")

if __name__ == '__main__':
    main()
