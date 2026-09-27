// GitHub API wrapper - Phase 6: polling integration
import { Octokit } from '@octokit/rest';

const VALID_AGENTS = ['research', 'coding', 'writing'];

export class GitHubAPI {
  constructor(token, overrides = {}) {
    this.token = token || process.env.GITHUB_TOKEN || null;
    this.owner = overrides.owner || process.env.GITHUB_OWNER || 'ngocthuymjs';
    this.repo = overrides.repo || process.env.GITHUB_REPO || 'local-agent-system';
    if (this.token) {
      this.octokit = new Octokit({ auth: this.token });
    } else {
      this.octokit = null;
    }
  }

  isConfigured() {
    return !!this.octokit;
  }

  parseAgentFromLabels(labels = []) {
    for (const label of labels) {
      const name = (label?.name || label || '').toString().trim().toLowerCase();
      // supports: "research", "agent:research", "agent=research", "agent-research"
      const m = name.match(/^agent\s*[:=\-]\s*(research|coding|writing)$/);
      if (m) return m[1];
      if (VALID_AGENTS.includes(name)) return name;
    }
    return null;
  }

  normalizeIssue(issue) {
    const labels = issue.labels || [];
    return {
      id: issue.number,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      labels: labels.map(l => (typeof l === 'string' ? l : l.name)),
      agent: this.parseAgentFromLabels(labels),
      status: 'TODO',
      url: issue.html_url || '',
    };
  }

  async getTasks(status = 'open') {
    if (!this.isConfigured()) return [];
    try {
      const issues = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: status,
        labels: 'task',
      });
      return issues.data;
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      return [];
    }
  }

  // Phase 6: fetch open TODO tasks assigned to an agent
  async getTodoTasks() {
    const issues = await this.getTasks('open');
    return issues
      .map(issue => this.normalizeIssue(issue))
      .filter(task => task.agent !== null);
  }

  // Alias kept for CONTEXT.md naming
  async getTodayTasks() {
    return this.getTodoTasks();
  }

  async updateTaskStatus(issueNumber, status) {
    if (!this.isConfigured()) {
      console.warn('GitHub token missing: skip updateTaskStatus');
      return false;
    }
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: `**Status:** ${status}`,
      });
      return true;
    } catch (error) {
      console.error('Error updating task:', error.message);
      return false;
    }
  }

  async postResult(issueNumber, result) {
    if (!this.isConfigured()) {
      console.warn('GitHub token missing: skip postResult');
      return false;
    }
    const message =
      result?.output?.message || result?.message || JSON.stringify(result, null, 2);
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: `**Result from ${result?.agent || 'agent'}:**\n\n${message}`,
      });
      return true;
    } catch (error) {
      console.error('Error posting result:', error.message);
      return false;
    }
  }
}
