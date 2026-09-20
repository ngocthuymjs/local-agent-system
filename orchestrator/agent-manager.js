// Agent Manager - Loads and runs agents
import fs from 'fs';
import path from 'path';

export class AgentManager {
  constructor(configPath = './config/agents.json') {
    this.agents = this.loadAgents(configPath);
  }

  loadAgents(configPath) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.agents;
    } catch (error) {
      console.error('Error loading agents config:', error);
      return [];
    }
  }

  getAgentByType(agentType) {
    return this.agents.find(agent => agent.id === agentType);
  }

  async runAgent(agentType, task) {
    const agent = this.getAgentByType(agentType);
    if (!agent) {
      console.error(`Agent ${agentType} not found`);
      return null;
    }

    if (!agent.enabled) {
      console.warn(`Agent ${agentType} is disabled`);
      return null;
    }

    try {
      console.log(`🤖 Running agent: ${agent.name}`);
      console.log(`   Task: ${task.title}`);
      
      // For now, simulate agent execution
      const result = {
        taskId: task.id,
        agent: agentType,
        status: 'completed',
        output: {
          message: `[${agent.name}] Processed: ${task.title}`,
          timestamp: new Date().toISOString()
        }
      };

      return result;
    } catch (error) {
      console.error(`Error running agent ${agentType}:`, error);
      return null;
    }
  }

  listAgents() {
    return this.agents.map(a => ({
      id: a.id,
      name: a.name,
      enabled: a.enabled,
      capabilities: a.capabilities
    }));
  }
}
