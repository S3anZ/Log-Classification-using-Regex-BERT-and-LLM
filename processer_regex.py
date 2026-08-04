import re
import json
from pathlib import Path
from typing import Optional, Dict, Any

class RegexProcessor:
    """Fast-Path Regex log pattern matcher."""

    def __init__(self, patterns_path: Optional[Path] = None):
        if patterns_path is None:
            patterns_path = Path(__file__).resolve().parent / 'training' / 'dataset' / 'log_patterns.json'
            
        self.patterns_path = patterns_path
        self.compiled_patterns = []
        self._load_patterns()

    def _load_patterns(self):
        if not self.patterns_path.exists():
            print(f"[RegexProcessor Warning] Patterns file not found at: {self.patterns_path}")
            return
            
        with open(self.patterns_path, 'r') as f:
            patterns_data = json.load(f)

        self.compiled_patterns = [
            {
                "cluster_id": p["cluster_id"],
                "source": p["source"],
                "log_level": p["log_level"],
                "template": p["template"],
                "regex": re.compile(p["regex_pattern"], flags=re.IGNORECASE)
            }
            for p in patterns_data
        ]
        print(f"[RegexProcessor] Successfully loaded {len(self.compiled_patterns)} regex rules.")

    def process(self, log_message: str) -> Optional[Dict[str, Any]]:
        """Matches a raw log string against compiled regex patterns.

        Returns match dictionary if matched, or None if unmatched.
        """
        for p in self.compiled_patterns:
            match = p['regex'].match(log_message)
            if match:
                return {
                    "matched": True,
                    "engine": "Regex Fast-Path",
                    "log_level": p["log_level"],
                    "source": p["source"],
                    "cluster_id": p["cluster_id"],
                    "template": p["template"],
                    "extracted_variables": match.groupdict()
                }
        return None
