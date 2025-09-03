#!/usr/bin/env python3
import os
import re

def parse_readme():
    readme_path = '/var/www/instructions/README.md'
    
    if not os.path.exists(readme_path):
        return None
    
    with open(readme_path, 'r') as f:
        content = f.read()
    
    agents = {
        'Development & Architecture': [],
        'Language Specialists': [],
        'Infrastructure & Operations': [],
        'Quality & Security': [],
        'Data & AI': [],
        'Specialized Domains': [],
        'Documentation': [],
        'Business & Marketing': [],
        'SEO & Content Optimization': []
    }
    
    current_category = None
    
    for line in content.split('\n'):
        if line.startswith('### ') and not line.startswith('### 🚀'):
            for cat in agents.keys():
                if cat in line:
                    current_category = cat
                    break
        
        elif current_category and line.strip().startswith('- **['):
            agent_match = re.match(r'- \*\*\[([^\]]+)\]\([^\)]+\)\*\* - (.+)', line.strip())
            if agent_match:
                agent_name = agent_match.group(1)
                agent_desc = agent_match.group(2)
                agents[current_category].append((agent_name, agent_desc))
    
    return agents

def display_agents():
    agents = parse_readme()
    
    if not agents:
        print("Unable to load agent information.")
        return
    
    print("\n📚 Available Claude Code Agents (75 total)\n")
    print("=" * 80)
    
    for category, agent_list in agents.items():
        if agent_list:
            print(f"\n### {category}")
            print("-" * 40)
            for agent_name, agent_desc in agent_list:
                print(f"  • {agent_name:30} {agent_desc[:70]}")
                if len(agent_desc) > 70:
                    remaining = agent_desc[70:]
                    while remaining:
                        print(f"    {' ':30} {remaining[:70]}")
                        remaining = remaining[70:]
    
    print("\n" + "=" * 80)
    print("\n💡 Usage: Mention an agent by name or let Claude auto-select based on context")
    print("   Example: 'Use code-reviewer to check my changes'")
    print("\n📦 Model Distribution:")
    print("   • 🚀 Haiku (fast): 16 agents")
    print("   • ⚡ Sonnet (balanced): 44 agents")
    print("   • 🧠 Opus (powerful): 15 agents")
    print()

if __name__ == "__main__":
    display_agents()
