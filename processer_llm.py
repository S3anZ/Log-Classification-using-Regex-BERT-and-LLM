import os
import json
import time
import urllib.request
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Automatically load .env file from project root
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

class LLMProcessor:
    """LLM Processor supporting Groq Cloud API, OpenAI, and Gemini with zero-dependency fallback."""

    def __init__(self, api_key: Optional[str] = None):
        self.provider = os.environ.get("LLM_PROVIDER", "groq").lower()
        
        # Resolve API Key based on provider or fallback
        if self.provider == "groq":
            self.api_key = api_key or os.environ.get("GROQ_API_KEY")
            self.model_name = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")
            self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        elif self.provider == "openai":
            self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
            self.model_name = os.environ.get("LLM_MODEL", "gpt-4o-mini")
            self.api_url = "https://api.openai.com/v1/chat/completions"
        else:
            self.api_key = api_key or os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("GEMINI_API_KEY")
            self.model_name = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")
            self.api_url = "https://api.groq.com/openai/v1/chat/completions"

        # Filter out empty or placeholder API keys
        if self.api_key and ("your_" in self.api_key or "gsk_" not in self.api_key and self.provider == "groq"):
            self.is_valid_key = False
        else:
            self.is_valid_key = bool(self.api_key and self.api_key.strip())

        if self.is_valid_key:
            print(f"[LLMProcessor] Initialized LLM Processor with active {self.provider.upper()} API Key (Model: '{self.model_name}').")
        else:
            print("[LLMProcessor] Initialized LLM Processor in Heuristic / Zero-Shot Mode (Paste valid GROQ_API_KEY into .env to enable live AI calls).")

    def process(self, log_message: str, current_predicted_level: str = "UNKNOWN", confidence_score: float = 0.0) -> Dict[str, Any]:
        """Provides AI-driven root-cause analysis and severity fallback for novel log entries using dynamic prompts."""
        if self.is_valid_key:
            analysis_summary = self._call_llm_api(log_message, current_predicted_level, confidence_score)
        else:
            analysis_summary = self._generate_heuristic_analysis(log_message)

        predicted_level = analysis_summary.get("log_level", current_predicted_level)
        if predicted_level == "UNKNOWN":
            predicted_level = "WARNING"

        return {
            "matched": True,
            "engine": f"LLM Deep Analysis ({self.provider.upper()} - {self.model_name})" if self.is_valid_key else "LLM Heuristic Analysis",
            "log_level": predicted_level,
            "explanation": analysis_summary.get("explanation", "Potential anomaly requiring root-cause inspection."),
            "recommended_action": analysis_summary.get("recommended_action", "Check service metrics and health logs."),
            "source": f"LLM_{self.provider.upper()}_Inference"
        }

    def _call_llm_api(self, log_message: str, current_predicted_level: str, confidence_score: float) -> Dict[str, str]:
        """Calls Groq / OpenAI API using dynamic context prompt with standard User-Agent header."""
        system_content = (
            "You are an expert Site Reliability Engineer (SRE) and Automated Log Diagnostics Engine. "
            "Analyze the input system log and produce a JSON response. "
            "CRITICAL DIRECTIVE: Return ONLY valid raw JSON matching the requested keys. "
            "DO NOT include any preamble, introductory text, conversational filler, or markdown code block wrappers (like ```json). "
            "Your output must begin with '{' and end with '}'."
        )

        user_content = (
            f"LOG MESSAGE: \"{log_message}\"\n"
            f"INITIAL BERT MODEL PREDICTION: {current_predicted_level} (Confidence: {confidence_score * 100:.1f}%)\n\n"
            "Analyze the root cause and return JSON with keys:\n"
            "- \"log_level\": Must be one of [\"INFO\", \"WARNING\", \"ERROR\", \"CRITICAL\", \"DEBUG\"]\n"
            "- \"explanation\": Concise 1-2 sentence root-cause diagnosis of why this log occurred.\n"
            "- \"recommended_action\": 1 immediate high-priority operational step for SREs."
        )

        max_retries = 3
        base_delay = 2

        for attempt in range(max_retries):
            try:
                # Include custom User-Agent header to prevent 403 Forbidden bot blocks by Cloudflare/Groq
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LogClassifierEngine/1.0"
                }
                payload = {
                    "model": self.model_name,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": user_content}
                    ],
                    "temperature": 0.1
                }
                req = urllib.request.Request(self.api_url, data=json.dumps(payload).encode('utf-8'), headers=headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    content = res_data['choices'][0]['message']['content'].strip()
                    
                    # Strip markdown block formatting if present
                    if content.startswith("```json"):
                        content = content[7:]
                    if content.startswith("```"):
                        content = content[3:]
                    if content.endswith("```"):
                        content = content[:-3]
                    content = content.strip()

                    return json.loads(content)
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"[LLMProcessor Warning] 429 Too Many Requests. Retrying in {delay} seconds...")
                    time.sleep(delay)
                    continue
                print(f"[LLMProcessor Warning] {self.provider.upper()} API Call failed ({e}). Falling back to heuristic analysis.")
                return self._generate_heuristic_analysis(log_message)
            except Exception as e:
                print(f"[LLMProcessor Warning] {self.provider.upper()} API Call failed ({e}). Falling back to heuristic analysis.")
                return self._generate_heuristic_analysis(log_message)

    def _generate_heuristic_analysis(self, log_message: str) -> Dict[str, str]:
        """Generates structured explanation for complex software/hardware logs."""
        log_lower = log_message.lower()
        if "panic" in log_lower or "fatal" in log_lower or "raid" in log_lower or "thermal" in log_lower:
            return {
                "log_level": "CRITICAL",
                "explanation": "Critical system hardware or kernel fault detected requiring urgent mitigation.",
                "recommended_action": "Inspect kernel syslog logs immediately and initiate failover cluster node."
            }
        elif "timeout" in log_lower or "connection" in log_lower or "denied" in log_lower or "refused" in log_lower:
            return {
                "log_level": "ERROR",
                "explanation": "Service communication latency or security access restriction encountered.",
                "recommended_action": "Check network security rules, API authentication keys, and service thread pools."
            }
        elif "latency" in log_lower or "usage" in log_lower or "memory" in log_lower or "spike" in log_lower:
            return {
                "log_level": "WARNING",
                "explanation": "High resource utilization or response latency threshold exceeded.",
                "recommended_action": "Monitor JVM heap / memory usage and inspect slow database query logs."
            }
        else:
            return {
                "log_level": "INFO",
                "explanation": "Unrecognized software log event requiring automatic template mining.",
                "recommended_action": "Monitor service metrics and queue log line for automatic template clustering."
            }
