import sys
from agents import (
    CoderAgent, QCAgent, MarketingAgent, LegalAgent, 
    PMAgent, DesignerAgent, DataAnalystAgent, ProjectManagerAgent,
    BusinessAnalystAgent, ResearcherAgent, SalesAgent, CSAgent
)
from llm import llm_service

def main():
    # Initialize all agents
    agents = {
        "/coder": CoderAgent(),
        "/qc": QCAgent(),
        "/marketing": MarketingAgent(),
        "/legal": LegalAgent(),
        "/pm": PMAgent(),
        "/designer": DesignerAgent(),
        "/data": DataAnalystAgent(),
        "/project": ProjectManagerAgent(),
        "/business": BusinessAnalystAgent(),
        "/research": ResearcherAgent(),
        "/sales": SalesAgent(),
        "/cs": CSAgent()
    }

    print("=== Startup Agency CLI ===")
    print("Available Commands:")
    for cmd in agents.keys():
        print(f"  {cmd} [task text]")
    print("  /all [task text] (Runs full orchestration - see .agent/workflows/all.md)")
    print("  /exit to quit")
    print("==========================")


    while True:
        try:
            line = input("\n> ").strip()
            if not line:
                continue
            
            if line.lower() == "/exit":
                break

            # Parse command
            parts = line.split(" ", 1)
            cmd = parts[0].lower()
            task = parts[1] if len(parts) > 1 else ""

            if cmd == "/all":
                if not task:
                    task = input("Enter task description for /all: ").strip()
                    if not task:
                        print("Error: /all requires a task description.")
                        continue
                
                print("\n--- Running Startup Sequence ---")
                
                # Dynamic Layer: Ask LLM which agents to run
                available_agents = "\n".join([f"{k}: {v.role} - {v.goal}" for k, v in agents.items()])
                orchestrator_prompt = f"""
                You are the Startup Agency Orchestrator. 
                Task: "{task}"
                
                Available Agents:
                {available_agents}
                
                Identify the specific agents needed for this task and the optimal order.
                Return ONLY a python list of strings keys, e.g. ["/research", "/marketing"].
                Do not include markdown formatting or explanations.
                If the task is complex or unclear, default to a robust sequence.
                """
                
                print("[Orchestrator] Analyzing task...")
                try:
                    plan_response = llm_service.get_response([{"role": "user", "content": orchestrator_prompt}])
                    # Clean up response to ensure it's a list
                    cleaned_plan = plan_response.strip().replace("```python", "").replace("```", "").strip()
                    sequence = eval(cleaned_plan)
                    if not isinstance(sequence, list):
                        raise ValueError("LLM did not return a list")
                    print(f"[Orchestrator] Plan: {sequence}")
                except Exception as e:
                    print(f"[Orchestrator] Error generating plan ({e}). Falling back to full sequence.")
                    # Fallback Order: PM -> Designer -> Coder -> QC -> Marketing -> Legal -> Data -> Project
                    sequence = ["/pm", "/designer", "/coder", "/qc", "/marketing", "/legal", "/data", "/project"]
                
                markdown_report = f"# Startup Project Report: {task}\n\n"
                context = f"Initial Task: {task}"
                
                for agent_cmd in sequence:
                    if agent_cmd not in agents:
                        print(f"Skipping unknown agent: {agent_cmd}")
                        continue
                        
                    agent = agents[agent_cmd]
                    print(f"\n[PHASE: {agent.name}]")
                    response = agent.process(context)
                    print(f"Response: {response[:100]}...") # Print preview
                    
                    markdown_report += f"## {agent.name} Phase\n\n"
                    markdown_report += f"{response}\n\n"
                    markdown_report += "---\n\n"
                    
                    context += f"\n\n--- {agent.name} Output ---\n{response}"
                
                # Save to markdown file to a specific path
                report_file = "startup_output.md"
                try:
                    with open(report_file, "w", encoding="utf-8") as f:
                        f.write(markdown_report)
                    print(f"\n[SUCCESS] Consolidated report saved to {report_file}")
                except Exception as e:
                    print(f"\n[ERROR] Failed to save report: {e}")
                
                print("\n--- Startup Sequence Completed ---")


            elif cmd in agents:
                if not task:
                    task = input(f"Enter task description for {cmd}: ").strip()
                    if not task:
                        print(f"Error: {cmd} requires a task description.")
                        continue
                
                agent = agents[cmd]
                response = agent.process(task)
                print(f"\n[{agent.name}]:\n{response}")

            
            else:
                print(f"Unknown command: {cmd}. Try /coder, /marketing, etc.")

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

    print("\nGoodbye!")

if __name__ == "__main__":
    main()
