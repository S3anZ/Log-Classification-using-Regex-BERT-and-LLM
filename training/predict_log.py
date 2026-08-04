import re
import json
import joblib
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

class ProductionLogPipeline:
    """Production hybrid pipeline combining fast-path Regex and Joblib-exported BERT classifier."""
    
    def __init__(self):
        base_dir = Path(__file__).resolve().parent
        patterns_path = base_dir / 'dataset' / 'log_patterns.json'
        models_dir = base_dir.parent / 'models'
        clf_path = models_dir / 'log_classifier.joblib'
        le_path = models_dir / 'label_encoder.joblib'

        # 1. Load Regex Rules
        if patterns_path.exists():
            with open(patterns_path, 'r') as f:
                patterns_data = json.load(f)
            self.regex_patterns = [
                {
                    "cluster_id": p["cluster_id"],
                    "source": p["source"],
                    "log_level": p["log_level"],
                    "regex": re.compile(p["regex_pattern"], flags=re.IGNORECASE)
                }
                for p in patterns_data
            ]
        else:
            self.regex_patterns = []

        # 2. Load Joblib Exported Model & Label Encoder
        if not clf_path.exists() or not le_path.exists():
            raise FileNotFoundError("Exported joblib models not found in models/ directory. Run train_bert_classifier.py first.")
            
        self.clf = joblib.load(clf_path)
        self.label_encoder = joblib.load(le_path)

        # 3. Load Embedder
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')

    def predict(self, raw_log: str) -> dict:
        """Classifies an incoming log string using Regex Fast-Path with Joblib BERT Fallback."""
        # Stage 1: Fast-Path Regex Match (<0.05ms)
        for p in self.regex_patterns:
            match = p['regex'].match(raw_log)
            if match:
                return {
                    "method": "Regex Fast-Path (<0.05ms)",
                    "predicted_level": p["log_level"],
                    "source": p["source"],
                    "cluster_id": p["cluster_id"],
                    "extracted_vars": match.groupdict()
                }

        # Stage 2: Joblib Model + BERT Embedding Fallback
        embedding = self.embedder.encode([raw_log], normalize_embeddings=True)
        pred_index = self.clf.predict(embedding)[0]
        predicted_level = self.label_encoder.inverse_transform([pred_index])[0]
        probs = self.clf.predict_proba(embedding)[0]
        confidence = float(np.max(probs))

        return {
            "method": "BERT Fallback (Joblib Model)",
            "predicted_level": predicted_level,
            "confidence_score": round(confidence, 4),
            "source": "AI_Inference"
        }

def main():
    print("Initializing Production Log Pipeline (Loading Joblib Artifacts)...")
    pipeline = ProductionLogPipeline()
    print("Pipeline ready!\n")

    test_logs = [
        # Known log pattern (Should hit Regex Fast-Path)
        "User authentication successful for UID 99182 from IP 192.168.1.55 via OAuth2",
        
        # Completely new / unseen log pattern (Should hit Joblib BERT Fallback)
        "Critical memory heap exhaustion: OutOfMemoryError in garbage collection thread",
        "Connection refused by remote host 10.0.0.15 port 5432 after timeout 30000ms"
    ]

    print("=" * 80)
    print("  LIVE LOG INFERENCE DEMO")
    print("=" * 80)

    for raw_log in test_logs:
        result = pipeline.predict(raw_log)
        print(f"\n[Raw Input Log] : {raw_log}")
        print(f"[Engine Method]  : {result['method']}")
        print(f"[Predicted Level]: {result['predicted_level']}")
        if "confidence_score" in result:
            print(f"[Confidence]     : {result['confidence_score'] * 100:.2f}%")
        if "extracted_vars" in result and result["extracted_vars"]:
            print(f"[Extracted Vars] : {result['extracted_vars']}")

if __name__ == '__main__':
    main()
