import json
from pathlib import Path
from processer_classifier import LogClassifierOrchestrator

def main():
    print("=" * 85)
    print("  LIVE FASTAPI-READY LOG CLASSIFICATION PIPELINE TEST")
    print("=" * 85 + "\n")

    orchestrator = LogClassifierOrchestrator()

    test_logs = [
        "User authentication successful for UID 88412 from IP 192.168.1.99 via OAuth2",
        "FATAL: remaining connection slots are reserved for non-replication superuser connections",
        "PostgreSQL error: Connection reset by peer during transaction COMMIT",
        "High latency detected on Redis cluster node 10.0.0.12: average response time 1450ms",
        "CPU thermal throttling triggered at 98C on core 0: frequency reduced to 1.2GHz",
        "POST /api/v3/payments/charge HTTP/1.1 200 4120 88ms"
    ]

    summary_records = []
    detailed_llm_outputs = []

    print(f"Testing pipeline with {len(test_logs)} raw log lines...\n")

    for idx, raw_log in enumerate(test_logs, 1):
        result = orchestrator.classify(raw_log)
        cls = result["classification"]
        
        engine = cls['engine']
        level = cls['log_level']
        confidence = f"{cls.get('confidence_score', 1.0) * 100:.1f}%" if 'confidence_score' in cls else "100.0% (Regex)"
        
        has_llm = "Yes" if "llm_analysis" in cls else "No"
        if "llm_analysis" in cls:
            detailed_llm_outputs.append({
                "test_id": idx,
                "log_text": raw_log,
                "llm_analysis": cls["llm_analysis"]
            })
        
        summary_records.append({
            "test_id": idx,
            "log_text": raw_log[:45] + "..." if len(raw_log) > 45 else raw_log,
            "engine": engine,
            "level": level,
            "confidence": confidence,
            "has_llm": has_llm
        })

    # Print Summary Table
    print("=" * 85)
    print("  EXECUTIVE TEST RESULTS SUMMARY TABLE")
    print("=" * 85 + "\n")

    header = f"{'#':<3} | {'Raw Log Snippet':<45} | {'Engine Route':<24} | {'Level':<8} | {'Confidence':<10} | {'LLM Analysis':<12}"
    print(header)
    print("-" * len(header))

    for rec in summary_records:
        engine_short = "Regex Fast-Path" if "Regex" in rec['engine'] else "BERT ML Model"
        print(f"{rec['test_id']:<3} | {rec['log_text']:<45} | {engine_short:<24} | {rec['level']:<8} | {rec['confidence']:<10} | {rec['has_llm']:<12}")

    # Print Detailed LLM Analysis Explanations
    if detailed_llm_outputs:
        print("\n" + "=" * 85)
        print("  DETAILED LLM ROOT-CAUSE EXPLANATIONS (Low Confidence Triggered)")
        print("=" * 85)
        
        for item in detailed_llm_outputs:
            llm = item['llm_analysis']
            print(f"\n[Test #{item['test_id']}] Raw Log Input: \"{item['log_text']}\"")
            print(f"  Engine Mode        : {llm.get('engine', 'LLM Analysis')}")
            print(f"  Predicted Level    : {llm.get('log_level', 'WARNING')}")
            print(f"  Root Cause Diagnosis: {llm.get('explanation', 'N/A')}")
            print(f"  Recommended Action  : {llm.get('recommended_action', 'N/A')}")

    print("\n" + "=" * 85)
    print("  ALL PIPELINE TEST CASES COMPLETED SUCCESSFULLY!")
    print("=" * 85 + "\n")

if __name__ == '__main__':
    main()
