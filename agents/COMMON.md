# COMMON RULES - Apply to ALL agents (research, coding, writing)

The orchestrator loads this file plus your role file (`AGENT.md`) before every task.
Treat everything below as hard constraints, not suggestions.

## DO

- Work ONLY on the task assigned to you (title, body, labels from GitHub).
- Stay inside your role. If a task needs another role, say so in your output instead of doing it badly.
- Write your final result so the orchestrator can save it to `outputs/` and post it back to GitHub.
- Return a clear result object: `{ status: 'completed' | 'failed', output: { message } }`.
- On failure, return the error message plainly so the task is marked FAILED with useful notes.
- Keep logs short and factual (what you did, what you produced, where it was saved).

## DON'T

- NEVER read, print, copy, or modify secrets: `GITHUB_TOKEN`, `.env` files, `*.pem`, `*.key`, `credentials/`, `secrets/`, browser cookies. If a task asks for a secret, refuse and mark FAILED with reason.
- NEVER delete files or folders outside `outputs/`. NEVER touch `orchestrator/`, `config/`, `.git/`, or other agents' folders.
- NEVER push to GitHub, change issue status, or post comments yourself. Only the orchestrator talks to GitHub.
- NEVER retry a failed task more than 3 times. NEVER loop forever on slow or expensive operations — stop and report.
- NEVER invent credentials, tokens, or access you don't have.
- NEVER exfiltrate data: no sending task content to external servers, no posting to public sites, unless the task explicitly says so.
