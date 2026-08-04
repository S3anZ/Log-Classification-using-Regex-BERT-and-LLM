import json
from pathlib import Path
import pandas as pd
from typing import Dict, Any, List, Union
from processer_regex import RegexProcessor
from processer_bert import BERTProcessor
from processer_llm import LLMProcessor

class LogClassifierOrchestrator:
    """Main Orchestrator combining Regex, BERT, and LLM Processors into a single API-ready pipeline."""

    def __init__(self):
        print("=" * 70)
        print("  INITIALIZING LOG CLASSIFIER ORCHESTRATOR")
        print("=" * 70)
        self.regex_proc = RegexProcessor()
        self.bert_proc = BERTProcessor()
        self.llm_proc = LLMProcessor()
        print("=" * 70)
        print("  ALL PROCESSORS LOADED SUCCESSFULLY & READY FOR FASTAPI")
        print("=" * 70 + "\n")

    def classify(self, log_input: Union[str, List[str]]) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """Classifies a single log string or batch of log strings through the 3-stage pipeline."""
        if isinstance(log_input, list):
            return [self._classify_single(msg) for msg in log_input]
        return self._classify_single(log_input)

    def _classify_single(self, log_message: str) -> Dict[str, Any]:
        # Stage 1: Fast-Path Regex Match (<0.05ms)
        regex_result = self.regex_proc.process(log_message)
        if regex_result is not None:
            return {
                "raw_log": log_message,
                "status": "success",
                "classification": regex_result
            }

        # Stage 2: BERT Embedding + Joblib Model Inference (~10ms)
        bert_result = self.bert_proc.process(log_message)
        
        # Stage 3: Low Confidence / Anomaly Explanation via LLM
        if bert_result["confidence_score"] < 0.35:
            llm_result = self.llm_proc.process(
                log_message,
                current_predicted_level=bert_result["log_level"],
                confidence_score=bert_result["confidence_score"]
            )
            bert_result["llm_analysis"] = llm_result
            bert_result["engine"] = llm_result.get("engine", "LLM Deep Analysis")
            bert_result["log_level"] = llm_result.get("log_level", bert_result["log_level"])

        return {
            "raw_log": log_message,
            "status": "success",
            "classification": bert_result
        }

def classify_dataset(input_csv_path: Path, output_csv_path: Path):
    """Processes an entire CSV log dataset and exports the full classified output to output.csv."""
    if not input_csv_path.exists():
        raise FileNotFoundError(f"Input dataset not found at {input_csv_path}")

    orchestrator = LogClassifierOrchestrator()
    df = pd.read_csv(input_csv_path)
    
    print(f"Processing batch classification for {len(df)} log entries from '{input_csv_path.name}'...\n")

    output_rows = []
    
    for idx, row in df.iterrows():
        log_msg = str(row['message'])
        res = orchestrator.classify(log_msg)
        cls = res['classification']
        
        row_dict = row.to_dict()
        row_dict['predicted_level'] = cls.get('log_level', 'UNKNOWN')
        row_dict['engine_route'] = cls.get('engine', 'N/A')
        row_dict['confidence_score'] = cls.get('confidence_score', 1.0)
        row_dict['extracted_variables'] = json.dumps(cls.get('extracted_variables', {})) if 'extracted_variables' in cls else ''
        
        if 'llm_analysis' in cls:
            llm = cls['llm_analysis']
            row_dict['llm_explanation'] = llm.get('explanation', '')
            row_dict['llm_recommended_action'] = llm.get('recommended_action', '')
        else:
            row_dict['llm_explanation'] = ''
            row_dict['llm_recommended_action'] = ''
            
        output_rows.append(row_dict)

    output_df = pd.DataFrame(output_rows)
    output_df.to_csv(output_csv_path, index=False)
    
    print("=" * 80)
    print(f" SUCCESS: Classified dataset saved to '{output_csv_path.name}'")
    print(f" File Location: {output_csv_path}")
    print("=" * 80 + "\n")

def main():
    root_dir = Path(__file__).resolve().parent
    input_csv = root_dir / 'training' / 'dataset' / 'synthetic_logs.csv'
    output_csv = root_dir / 'output.csv'

    classify_dataset(input_csv, output_csv)

if __name__ == '__main__':
    main()
