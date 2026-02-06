import os
from typing import List, Dict, Optional
from llm import llm_service

class Agent:
    def __init__(self, name: str, role: str, goal: str, workflow_file: Optional[str] = None):
        self.name = name
        self.role = role
        self.goal = goal
        self.memory: List[Dict[str, str]] = []
        self.workflow_instructions = ""
        
        if workflow_file:
            self._load_workflow(workflow_file)

    def _load_workflow(self, filename: str):
        filepath = os.path.join(".agent", "workflows", filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    self.workflow_instructions = f.read()
            except Exception as e:
                print(f"Warning: Could not read workflow file {filepath}: {e}")
        else:
            print(f"Warning: Workflow file {filepath} not found.")

    def system_prompt(self) -> str:
        prompt = f"You are {self.name}, a {self.role}. Your goal is: {self.goal}. Respond concisely and professionally."
        if self.workflow_instructions:
            prompt += f"\n\nFOLLOW THESE DETAILED WORKFLOW INSTRUCTIONS:\n{self.workflow_instructions}"
        return prompt

    def process(self, task: str) -> str:
        print(f"[{self.name}] Processing task...")
        self.memory.append({"role": "user", "content": task})
        messages = [{"role": "system", "content": self.system_prompt()}] + self.memory
        response = llm_service.get_response(messages)
        self.memory.append({"role": "assistant", "content": response})
        return response

class CoderAgent(Agent):
    def __init__(self):
        super().__init__("Coder", "Senior Software Engineer", "Write clean, efficient code and technical documentation.", "coder.md")

class QCAgent(Agent):
    def __init__(self):
        super().__init__("QC", "Quality Control Engineer", "Test code for bugs, verify requirements, and ensure high quality standards.", "qc.md")

class MarketingAgent(Agent):
    def __init__(self):
        super().__init__("Marketing", "Growth & Marketing Strategist", "Create marketing plans, research target audiences, and design growth strategies.", "marketing.md")

class LegalAgent(Agent):
    def __init__(self):
        super().__init__("Legal", "Startup Legal Counsel", "Provide guidance on compliance, contracts, and regulatory issues for startups.", "legal.md")

class PMAgent(Agent):
    def __init__(self):
        super().__init__("PM", "Product Manager", "Define product vision, gather requirements, and prioritize features based on user needs.", "pm.md")

class DesignerAgent(Agent):
    def __init__(self):
        super().__init__("Designer", "UI/UX Designer", "Design beautiful, intuitive interfaces and ensure a premium user experience.", "designer.md")

class DataAnalystAgent(Agent):
    def __init__(self):
        super().__init__("Data Analyst", "Market & Data Researcher", "Analyze market data, provide insights, and research industry trends.", "data.md")

class ProjectManagerAgent(Agent):
    def __init__(self):
        super().__init__("Project Manager", "Operations & Delivery Lead", "Coordinate tasks, manage timelines, and ensure project milestones are met.", "project.md")

class BusinessAnalystAgent(Agent):
    def __init__(self):
        super().__init__("Business Analyst", "Business Analyst", "Analyze business processes, SWOT, and gather requirements.", "business_analyst.md")

class ResearcherAgent(Agent):
    def __init__(self):
        super().__init__("Researcher", "Deep Dive Researcher", "Conduct deep research, competitor analysis, and find information.", "researcher.md")

class SalesAgent(Agent):
    def __init__(self):
        super().__init__("Sales", "Sales Representative", "Draft sales copy, pitches, and handle objections.", "sales.md")

class CSAgent(Agent):
    def __init__(self):
        super().__init__("CS", "Customer Support Specialist", "Handle customer inquiries, create FAQs, and draft support responses.", "cs.md")


class MusicCuratorAgent(Agent):
    def __init__(self):
        super().__init__("Music Curator", "World-Class Music Curator", "Curate vibrant, brand-aligned playlists with a mix of global and local hits.", "music_curator.md")
