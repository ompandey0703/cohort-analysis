import os
from dotenv import load_dotenv
load_dotenv()
import requests
from typing import List
from app.utils.logger import get_logger

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
logger = get_logger(__name__)

def build_prompt(analysis_results: dict) -> str:
    return (
        "You are a data analyst. Given the following cohort analysis results, "
        "draw 3 to 5 key observations or insights (go to 5 only if the dataset is sufficient). "
        "Be concise and focus on actionable findings. Do not print anything else just the points and try to make it one or two liner. "
        "Here is the data (truncated to fit within 6000 tokens):\n"
        f"{analysis_results}\n"
        "List the insights as bullet points."
    )

def get_llm_insights(analysis_results: dict) -> List[str]:
    if not GROQ_API_KEY:
        logger.error("GROQ API key not configured")
        raise RuntimeError("GROQ API key not configured")
    # Truncate the analysis_results to fit within 6000 tokens (approx 24000 chars)
    import json
    max_chars = 23500  # ~6000 tokens
    analysis_json = json.dumps(analysis_results)
    if len(analysis_json) > max_chars:
        analysis_json = analysis_json[:max_chars] + "...(truncated)"
    prompt = build_prompt(analysis_json)
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 512,
        "temperature": 0.7
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    logger.info("Sending request to GROQ API for LLM insights.")
    response = requests.post(GROQ_API_URL, json=payload, headers=headers)
    if response.status_code != 200:
        logger.error(f"GROQ API error: {response.text}")
        raise RuntimeError(f"GROQ API error: {response.text}")
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    insights = [line.strip("-• ") for line in content.splitlines() if line]
    logger.info("LLM insights received successfully.")
    return insights
