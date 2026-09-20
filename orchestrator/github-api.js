// GitHub API wrapper
import { Octokit } = require('@octokit/rest');

export class GitHubAPI {
  constructor(token) {
    this.octokit = new Octokit({
      auth: token
    });
    this.owner = 'ngocthuymjs';
    this.repo = 'local-agent-system';
  }

  async getTasks(status = 'open') {
    try {
      const issues = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: status,
        labels: 'task'
      });
      return issues.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async updateTaskStatus(issueNumber, status) {
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: `**Status:** ${status}`
      });
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }
}
