// Agent rules tests - DO & DON'T instructions for agents (TDD)
// Run: node --test orchestrator/agent-rules.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Agent rules - DO & DON\'T files', () => {
  it('COMMON.md and per-agent AGENT.md files exist', () => {
    assert.ok(fs.existsSync('agents/COMMON.md'), 'agents/COMMON.md should exist');
    for (const id of ['research', 'coding', 'writing']) {
      assert.ok(
        fs.existsSync(`agents/${id}/AGENT.md`),
        `agents/${id}/AGENT.md should exist`
      );
    }
  });

  it('AgentManager loads guardrails for every agent', async () => {
    const { AgentManager } = await import('./agent-manager.js');
    const mgr = new AgentManager();
    for (const id of ['research', 'coding', 'writing']) {
      const rules = mgr.getRules(id);
      assert.ok(rules && rules.length > 50, `${id} should have rules loaded`);
      assert.ok(rules.includes("DON'T"), `${id} rules should contain DON'T section`);
      assert.ok(rules.includes('GITHUB_TOKEN'), `${id} rules should warn about secrets`);
    }
  });

  it('Role-specific rules differ per agent', async () => {
    const { AgentManager } = await import('./agent-manager.js');
    const mgr = new AgentManager();
    assert.ok(mgr.getRules('research').toLowerCase().includes('source'), 'research rules mention sources');
    assert.ok(mgr.getRules('coding').toLowerCase().includes('test'), 'coding rules mention tests');
    assert.ok(mgr.getRules('writing').toLowerCase().includes('fact'), 'writing rules mention facts');
  });

  it('getRules returns empty for unknown agent', async () => {
    const { AgentManager } = await import('./agent-manager.js');
    const mgr = new AgentManager();
    assert.equal(mgr.getRules('unknown-agent'), '');
  });

  it('listAgents reports hasRules for all agents', async () => {
    const { AgentManager } = await import('./agent-manager.js');
    const mgr = new AgentManager();
    for (const a of mgr.listAgents()) {
      assert.equal(a.hasRules, true, `${a.id} should have hasRules=true`);
    }
  });

  it('runAgent applies rules and reports it in result', async () => {
    const { AgentManager } = await import('./agent-manager.js');
    const mgr = new AgentManager();
    const result = await mgr.runAgent('research', { id: 1, title: 'Test task' });
    assert.ok(result, 'runAgent should return a result');
    assert.equal(result.rulesApplied, true, 'result should flag rulesApplied');
  });
});
