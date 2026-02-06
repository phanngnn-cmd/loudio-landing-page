from agents import (
    CoderAgent, QCAgent, MarketingAgent, LegalAgent, 
    PMAgent, DesignerAgent, DataAnalystAgent, ProjectManagerAgent,
    BusinessAnalystAgent, ResearcherAgent, SalesAgent, CSAgent, MusicCuratorAgent
)

def test_agents():
    roles = [
        CoderAgent(), QCAgent(), MarketingAgent(), LegalAgent(),
        PMAgent(), DesignerAgent(), DataAnalystAgent(), ProjectManagerAgent(),
        BusinessAnalystAgent(), ResearcherAgent(), SalesAgent(), CSAgent(), MusicCuratorAgent()
    ]
    
    print("Testing 13 Roles (Mock Mode):")
    for agent in roles:
        print(f"Testing {agent.name}...")
        res = agent.process("Initial test task")
        print(f"Result: {res}\n")

if __name__ == "__main__":
    test_agents()
