// Local Agent Orchestrator - Main Entry Point
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentManager } from './agent-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Orchestrator {
  constructor() {
    this.config = this.loadConfig();
    this.agentManager = new AgentManager('./config/agents.json');
    this.isRunning = false;
  }

  loadConfig() {
    try {
      const config = JSON.parse(
        fs.readFileSync('./config/orchestrator.json', 'utf8')
      );
      return config;
    } catch (error) {
      console.error('Error loading config:', error);
      return { polling: { enabled: false }, logging: { level: 'info' } };
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  logToFile(message) {
    const logDir = this.config.logging?.logDir || './orchestrator/logs';
    const logFile = path.join(logDir, 'orchestrator.log');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  }

  async start() {
    this.log('info', '🤖 Orchestrator starting...');
    this.logToFile('Orchestrator started');

    console.log('\n📋 Available Agents:');
    const agents = this.agentManager.listAgents();
    agents.forEach(agent => {
      const status = agent.enabled ? '✅' : '❌';
      console.log(`  ${status} ${agent.name} (${agent.id})`);
      console.log(`     Capabilities: ${agent.capabilities.join(', ')}`);
    });

    console.log('\n⚙️  Configuration:');
    console.log(`  GitHub Owner: ${this.config.github?.owner || 'N/A'}`);
    console.log(`  GitHub Repo: ${this.config.github?.repo || 'N/A'}`);
    console.log(`  Polling Enabled: ${this.config.polling?.enabled || false}`);
    console.log(`  Poll Interval: ${this.config.polling?.intervalSeconds || 'N/A'}s`);

    this.isRunning = true;
    this.log('info', '✅ Orchestrator ready');
    this.logToFile('Orchestrator initialized successfully');

    // TODO: Start polling loop when GitHub API integration is ready
    if (this.config.polling?.enabled) {
      this.log('info', '⏳ Polling enabled but not yet implemented');
      this.logToFile('Polling mode requested but not yet implemented');
    } else {
      this.log('info', '💤 Polling disabled. Run orchestrator with polling enabled to start monitoring tasks');
    }
  }

  async simulateTask() {
    // Simulate running a task
    const mockTask = {
      id: 1,
      title: 'Research: Find top AI companies',
      agent: 'research',
      status: 'TODO'
    };

    console.log('\n🧪 Running simulation...');
    console.log(`   Task: ${mockTask.title}`);
    console.log(`   Agent: ${mockTask.agent}`);

    const result = await this.agentManager.runAgent(
      mockTask.agent,
      mockTask
    );

    if (result) {
      console.log(`   Result: ${result.output.message}`);
      this.logToFile(`Task ${mockTask.id} completed by ${mockTask.agent}`);
    }
  }

  async stop() {
    this.isRunning = false;
    this.log('info', 'Orchestrator stopped');
    this.logToFile('Orchestrator stopped');
  }
}

// Main
async function main() {
  const orchestrator = new Orchestrator();

  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });

  try {
    await orchestrator.start();
    
    // Run a test simulation
    await orchestrator.simulateTask();
    
    console.log('\n✅ Orchestrator ready for tasks');
    console.log('   Next steps:');
    console.log('   1. Create tasks in GitHub Project');
    console.log('   2. Enable polling in config/orchestrator.json');
    console.log('   3. Re-run orchestrator to start monitoring\n');
  } catch (error) {
    console.error('Fatal error:', error);
    orchestrator.logToFile(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
