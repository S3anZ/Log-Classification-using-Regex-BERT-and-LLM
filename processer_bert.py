import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
from sentence_transformers import SentenceTransformer

class BERTProcessor:
    """BERT Embedding + Joblib Logistic Regression log classifier."""

    def __init__(self, models_dir: Optional[Path] = None):
        if models_dir is None:
            models_dir = Path(__file__).resolve().parent / 'models'
            
        self.clf_path = models_dir / 'log_classifier.joblib'
        self.le_path = models_dir / 'label_encoder.joblib'
        
        self.clf = None
        self.label_encoder = None
        self.embedder = None
        self._load_model()

    def _load_model(self):
        if not self.clf_path.exists() or not self.le_path.exists():
            raise FileNotFoundError(
                f"[BERTProcessor Error] Joblib artifacts not found in '{self.clf_path.parent}'. "
                "Run train_bert_classifier.py first."
            )
            
        print(f"[BERTProcessor] Loading Joblib artifacts from '{self.clf_path.parent}'...")
        self.clf = joblib.load(self.clf_path)
        self.label_encoder = joblib.load(self.le_path)
        
        print("[BERTProcessor] Loading SentenceTransformer 'all-MiniLM-L6-v2'...")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        print("[BERTProcessor] Engine ready.")

    def process(self, log_message: str) -> Dict[str, Any]:
        """Generates BERT vector embedding and predicts log level + confidence score."""
        embedding = self.embedder.encode([log_message], normalize_embeddings=True)
        pred_index = self.clf.predict(embedding)[0]
        predicted_level = self.label_encoder.inverse_transform([pred_index])[0]
        probs = self.clf.predict_proba(embedding)[0]
        confidence = float(np.max(probs))

        return {
            "matched": True,
            "engine": "BERT Embedding + Logistic Regression",
            "log_level": predicted_level,
            "confidence_score": round(confidence, 4),
            "source": "AI_BERT_Inference"
        }
