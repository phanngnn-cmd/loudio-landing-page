from typing import List, Dict, Any, Optional
import os
from openai import OpenAI
# import google.generativeai as genai
from config import Config

class LLMService:
    def __init__(self):
        self.api_key = Config.OPENAI_API_KEY
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            print("Warning: OPENAI_API_KEY not found.")
            self.client = None

    def get_response(self, messages: List[Dict[str, str]], model: str = Config.DEFAULT_MODEL) -> str:
        """
        Get a simple text response from the LLM.
        messages format: [{"role": "user", "content": "hello"}, ...]
        """
        if not self.client:
           # Mock response for demo purposes
           last_user_msg = messages[-1]['content'] if messages else "No input"
           return f"[MOCK RESPOSE] processing: {last_user_msg[:20]}..."

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error calling LLM: {str(e)}"

# Singleton instance
llm_service = LLMService()
