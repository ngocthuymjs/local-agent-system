// Local Agent Orchestrator - Main Entry Point (Phase 6: GitHub polling)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentManager } from './agent-manager.js';
import { GitHubAPI } from './github-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export class Orchestrator {
  constructor(options = {}) {
    this.config = options.config || this.loadConfig();
    const agentsConfigPath = options.agentsConfigPath
      || path.join(PROJECT_ROOT, 'config/agents.json');
    this.agentManager = options.agentManager || new AgentManager(agentsConfigPath);
    const token = options.token || process.env.GITHUB_TOKEN || null;
    this.githubAPI = options.githubAPI || new GitHubAPI(token, {
      owner: this.config.github?.owner,
      repo: this.config.github?.repo,
    });
    this.isRunning = false;
    this.pollTimer = null;
    this.processedTasks = new Set();
  }

  loadConfig() {
    const candidates = [
      './config/orchestrator.json',
      path.join(PROJECT_ROOT, 'config/orchestrator.json'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
      } catch (error) {
        console.error('Error loading config:', error.message);
      }
    }
    return { polling: { enabled: false }, logging: { level: 'info' } };
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  logToFile(message) {
    const logDir = this.config.logging?.logDir?.startsWith('.')
      ? path.join(PROJECT_ROOT, this.config.logging.logDir)
      : (this.config.logging?.logDir || path.join(PROJECT_ROOT, 'orchestrator/logs'));
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

    // Phase 6: start polling loop when enabled
    if (this.config.polling?.enabled) {
      if (this.githubAPI?.isConfigured?.()) {
        this.log('info', '⏳ Polling GitHub for TODO tasks...');
        await this.pollOnce();
        this.startPollingLoop();
      } else {
        this.log('warn', '⚠️ Polling enabled but GITHUB_TOKEN missing. Set export GITHUB_TOKEN=... ');
        this.logToFile('Polling enabled but GitHub token missing');
      }
    } else {
      this.log('info', '💤 Polling disabled. Run orchestrator with polling enabled to start monitoring tasks');
    }
  }

  saveTaskMeta(task, result, status) {
    try {
      const tasksDir = path.join(PROJECT_ROOT, 'tasks');
      if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
      const file = path.join(tasksDir, `task-${task.number ?? task.id}.json`);
      fs.writeFileSync(file, JSON.stringify({
        ...task,
        processedStatus: status,
        result: result?.output || result || null,
        processedAt: new Date().toISOString(),
      }, null, 2));
    } catch (e) {
      console.error('Error saving task meta:', e.message);
    }
  }

  saveOutput(task, result) {
    try {
      const outDir = path.join(PROJECT_ROOT, 'outputs');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `task-${task.number ?? task.id}-${task.agent}.md`);
      const content = `# ${task.title}\n\n- Agent: ${task.agent}\n- Task: #${task.number ?? task.id}\n- Date: ${new Date().toISOString()}\n\n## Result\n\n${result?.output?.message || JSON.stringify(result, null, 2)}\n`;
      fs.writeFileSync(file, content);
      return file;
    } catch (e) {
      console.error('Error saving output:', e.message);
      return null;
    }
  }

  async processTask(task) {
    const taskId = task.number ?? task.id;
    if (!task.agent) {
      this.log('warn', `Skip task #${taskId}: no agent assigned`);
      return null;
    }
    this.log('info', `▶️ Processing task #${taskId}: ${task.title} [${task.agent}]`);
    this.logToFile(`RUNNING task #${taskId} (${task.agent}): ${task.title}`);
    await this.githubAPI?.updateTaskStatus?.(taskId, 'RUNNING');

    try {
      const result = await this.agentManager.runAgent(task.agent, task);
      if (!result) throw new Error(`Agent ${task.agent} returned no result`);

      const outFile = this.saveOutput(task, result);
      this.saveTaskMeta(task, result, 'REVIEW');
      this.logToFile(`REVIEW task #${taskId} -> ${outFile}`);

      await this.githubAPI?.postResult?.(taskId, result);
      await this.githubAPI?.updateTaskStatus?.(taskId, 'REVIEW');

      this.processedTasks.add(taskId);
      console.log(`   ✅ Done #${taskId} -> ${outFile}`);
      return { ...result, status: 'completed', outputFile: outFile };
    } catch (error) {
      console.error(`Task #${taskId} FAILED:`, error.message);
      this.logToFile(`FAILED task #${taskId}: ${error.message}`);
      this.saveTaskMeta(task, { error: error.message }, 'FAILED');
      await this.githubAPI?.updateTaskStatus?.(taskId, 'FAILED');
      return { taskId, agent: task.agent, status: 'failed', error: error.message };
    }
  }

  async pollOnce() {
    if (!this.githubAPI?.isConfigured?.()) return [];
    try {
      const tasks = await this.githubAPI.getTodoTasks();
      const fresh = tasks.filter(t => !this.processedTasks.has(t.number ?? t.id));
      if (fresh.length === 0) {
        this.log('info', 'No new TODO tasks');
        return [];
      }
      this.log('info', `Found ${fresh.length} TODO task(s)`);
      const results = [];
      for (const task of fresh) {
        results.push(await this.processTask(task));
      }
      return results;
    } catch (error) {
      console.error('Poll error:', error.message);
      this.logToFile(`Poll error: ${error.message}`);
      return [];
    }
  }

  startPollingLoop() {
    const intervalSec = this.config.polling?.intervalSeconds || 30;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      if (this.isRunning) this.pollOnce();
    }, intervalSec * 1000);
    // Don't keep Node alive only for polling in test/simulate mode
    if (this.pollTimer.unref) this.pollTimer.unref();
    this.log('info', `🔁 Polling every ${intervalSec}s`);
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
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.isRunning = false;
    this.log('info', 'Orchestrator stopped');
    this.logToFile('Orchestrator stopped');
  }
}

// Main - only auto-run when executed directly, not when imported in tests
async function main() {
  const orchestrator = new Orchestrator();

  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });

  try {
    await orchestrator.start();

    // If polling with real GitHub token: keep running. Otherwise run simulation.
    const pollingActive = orchestrator.config.polling?.enabled && orchestrator.githubAPI?.isConfigured?.();
    if (!pollingActive) {
      await orchestrator.simulateTask();
    }

    console.log('\n✅ Orchestrator ready for tasks');
    if (pollingActive) {
      console.log('   🔁 Polling GitHub... Press Ctrl+C to stop\n');
    } else {
      console.log('   Next steps:');
      console.log('   1. Create tasks in GitHub Project');
      console.log('   2. export GITHUB_TOKEN=your_token');
      console.log('   3. Re-run orchestrator to start monitoring\n');
    }
  } catch (error) {
    console.error('Fatal error:', error);
    orchestrator.logToFile(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  main();
}
