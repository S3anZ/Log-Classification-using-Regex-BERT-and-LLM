import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def main():
    print("=" * 70)
    print("  LOG CLASSIFICATION PIPELINE: BERT EMBEDDINGS + LOGISTIC REGRESSION")
    print("=" * 70 + "\n")

    # 1. Load datasets
    non_regex_path = Path(__file__).parent / 'dataset' / 'df_non_regex.csv'
    full_dataset_path = Path(__file__).parent / 'dataset' / 'synthetic_logs.csv'

    if non_regex_path.exists():
        df_non_regex = pd.read_csv(non_regex_path)
        print(f"Loaded {len(df_non_regex)} unmatched logs from 'df_non_regex.csv'.")
    else:
        df_non_regex = pd.DataFrame()

    df = pd.read_csv(full_dataset_path)
    print(f"Loaded {len(df)} total logs from 'synthetic_logs.csv' for training.\n")

    # 2. Extract features and target labels
    messages = df['message'].tolist()
    labels = df['label'].tolist()

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(labels)

    # 3. Generate BERT Embeddings
    model_name = 'all-MiniLM-L6-v2'
    print(f"Generating 384-dim BERT embeddings with '{model_name}'...")
    embedder = SentenceTransformer(model_name)
    X = embedder.encode(messages, show_progress_bar=True, normalize_embeddings=True)

    print(f"Embedding matrix shape X: {X.shape} (N_samples: {X.shape[0]}, Dim: {X.shape[1]})\n")

    # 4. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    # 5. Train Logistic Regression Classifier
    print("Training Logistic Regression classifier on BERT embeddings...")
    clf = LogisticRegression(max_iter=1000, random_state=42)
    clf.fit(X_train, y_train)

    # 6. Evaluate Model Performance
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    target_names = label_encoder.classes_

    print("\n" + "=" * 70)
    print(f"MODEL EVALUATION RESULTS (Accuracy: {acc * 100:.1f}%):")
    print("=" * 70)
    print(classification_report(y_test, y_pred, target_names=target_names))

    # 7. Export Trained Model & Label Encoder using Joblib
    model_dir = Path(__file__).resolve().parent.parent / 'models'
    model_dir.mkdir(exist_ok=True)
    
    clf_path = model_dir / 'log_classifier.joblib'
    le_path = model_dir / 'label_encoder.joblib'
    
    joblib.dump(clf, clf_path)
    joblib.dump(label_encoder, le_path)
    
    print("=" * 70)
    print(f" Exported trained classifier to  : {clf_path}")
    print(f" Exported label encoder to      : {le_path}")
    print("=" * 70 + "\n")

    # 8. Test Prediction on Unmatched Non-Regex Logs
    if not df_non_regex.empty:
        print("=" * 70)
        print("TESTING INFERENCE ON UNMATCHED NON-REGEX LOGS (df_non_regex):")
        print("=" * 70)
        
        non_regex_messages = df_non_regex['message'].tolist()
        non_regex_X = embedder.encode(non_regex_messages, normalize_embeddings=True)
        non_regex_preds = clf.predict(non_regex_X)
        predicted_labels = label_encoder.inverse_transform(non_regex_preds)
        
        df_non_regex['predicted_label'] = predicted_labels
        
        for idx, row in df_non_regex.head(10).iterrows():
            print(f"\n[Raw Log]      : {row['message']}")
            print(f"[Actual Level] : {row['label']}")
            print(f"[BERT Pred]    : {row['predicted_label']}")

if __name__ == '__main__':
    main()
