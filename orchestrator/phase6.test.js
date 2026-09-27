// Phase 6 tests - GitHub Integration (TDD)
// Run: node --test orchestrator/phase6.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 6 - GitHub Integration', () => {
  it('GitHubAPI module loads without syntax error', async () => {
    const mod = await import('./github-api.js');
    assert.ok(mod.GitHubAPI, 'GitHubAPI class should be exported');
  });

  it('GitHubAPI.parseAgentFromLabels detects agent type', async () => {
    const { GitHubAPI } = await import('./github-api.js');
    const api = new GitHubAPI('fake-token-for-test', { owner: 'test', repo: 'test' });
    assert.equal(api.parseAgentFromLabels([{ name: 'task' }, { name: 'agent:research' }]), 'research');
    assert.equal(api.parseAgentFromLabels([{ name: 'task' }, { name: 'agent=coding' }]), 'coding');
    assert.equal(api.parseAgentFromLabels([{ name: 'task' }, { name: 'writing' }]), 'writing');
    assert.equal(api.parseAgentFromLabels([{ name: 'task' }]), null);
  });

  it('GitHubAPI.getTodoTasks normalizes GitHub issues', async () => {
    const { GitHubAPI } = await import('./github-api.js');
    const api = new GitHubAPI('fake-token-for-test', { owner: 'test', repo: 'test' });
    // Mock octokit
    api.octokit = {
      issues: {
        listForRepo: async () => ({
          data: [
            { number: 1, title: 'Research 10 AI companies', body: 'do research', labels: [{ name: 'task' }, { name: 'agent:research' }], state: 'open' },
            { number: 2, title: 'Random issue', body: '', labels: [{ name: 'bug' }], state: 'open' },
          ]
        })
      }
    };
    const tasks = await api.getTodoTasks();
    assert.equal(tasks.length, 1, 'should filter only tasks with agent label');
    assert.equal(tasks[0].number, 1);
    assert.equal(tasks[0].agent, 'research');
    assert.equal(tasks[0].title, 'Research 10 AI companies');
  });

  it('GitHubAPI.updateTaskStatus posts a comment', async () => {
    const { GitHubAPI } = await import('./github-api.js');
    const api = new GitHubAPI('fake-token-for-test', { owner: 'test', repo: 'test' });
    let called = null;
    api.octokit = {
      issues: {
        createComment: async (args) => { called = args; return { data: {} }; }
      }
    };
    const ok = await api.updateTaskStatus(1, 'RUNNING');
    assert.equal(ok, true);
    assert.ok(called.body.includes('RUNNING'));
    assert.equal(called.issue_number, 1);
  });

  it('GitHubAPI.postResult posts result comment', async () => {
    const { GitHubAPI } = await import('./github-api.js');
    const api = new GitHubAPI('fake-token-for-test', { owner: 'test', repo: 'test' });
    let called = null;
    api.octokit = {
      issues: {
        createComment: async (args) => { called = args; return { data: {} }; }
      }
    };
    const ok = await api.postResult(5, { output: { message: 'hello result' } });
    assert.equal(ok, true);
    assert.ok(called.body.includes('hello result'));
  });

  it('Orchestrator.processTask runs agent and saves output locally', async () => {
    const { Orchestrator } = await import('./main.js');
    const orch = new Orchestrator({ skipConfigLoad: true });
    // stub agentManager
    orch.agentManager = {
      runAgent: async (agentType, task) => ({
        taskId: task.id ?? task.number,
        agent: agentType,
        status: 'completed',
        output: { message: `[${agentType}] Processed: ${task.title}`, timestamp: new Date().toISOString() }
      })
    };
    // stub github api (no network)
    orch.githubAPI = {
      updateTaskStatus: async () => true,
      postResult: async () => true
    };
    const task = { id: 99, number: 99, title: 'Test task research', agent: 'research', status: 'TODO' };
    const result = await orch.processTask(task);
    assert.ok(result, 'processTask should return a result');
    assert.equal(result.status, 'completed');
  });
});
