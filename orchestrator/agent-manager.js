// Agent Manager - Loads and runs agents
import fs from 'fs';
import path from 'path';

export class AgentManager {
  constructor(configPath = './config/agents.json') {
    this.configPath = configPath;
    this.agents = this.loadAgents(configPath);
    this.loadRules();
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

  resolveFile(...segments) {
    for (const base of [process.cwd(), path.dirname(this.configPath), path.join(path.dirname(this.configPath), '..')]) {
      const full = path.resolve(base, ...segments);
      if (fs.existsSync(full)) return full;
    }
    return path.resolve(...segments);
  }

  readFileSafe(file) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
    return '';
  }

  // Load COMMON.md + per-agent AGENT.md so every run carries its DO & DON'T rules
  loadRules() {
    const commonFile = this.resolveFile('agents/COMMON.md');
    this.commonRules = this.readFileSafe(commonFile);
    for (const agent of this.agents) {
      const roleFile = this.resolveFile(agent.path || `agents/${agent.id}`, 'AGENT.md');
      const roleRules = this.readFileSafe(roleFile);
      agent.rules = [this.commonRules, roleRules].filter(Boolean).join('\n\n---\n\n');
    }
  }

  getRules(agentType) {
    return this.getAgentByType(agentType)?.rules || '';
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
      const rules = this.getRules(agentType);
      console.log(`🤖 Running agent: ${agent.name}`);
      console.log(`   Task: ${task.title}`);
      console.log(`   📜 Rules: ${rules ? 'DO & DON\'T loaded (' + rules.length + ' chars)' : 'none found'}`);
      
      // For now, simulate agent execution (rules travel with the task context)
      const result = {
        taskId: task.id,
        agent: agentType,
        status: 'completed',
        rulesApplied: Boolean(rules),
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
      hasRules: Boolean(a.rules),
      capabilities: a.capabilities
    }));
  }
}
