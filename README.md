# Local Multi-Agent System

A local multi-agent system running on Mac with GitHub Project integration for task management.

## Overview

This system allows you to:
- Define tasks in a **GitHub Project board**
- Assign tasks to different **local agents** (research, coding, writing)
- Run agents **locally on your Mac**
- Monitor agent work in **VS Code**
- Track progress **on GitHub**

## Architecture

```
GitHub Project Board
        ↓
Local Orchestrator
    ↓ ↓ ↓
Agents (Research, Coding, Writing)
        ↓
Local Files & Outputs
```

## Quick Start

### Prerequisites
- macOS
- GitHub account + Personal Access Token
- Node.js v25+
- GitHub CLI (`gh`)
- Git

### Initial Setup

1. **Clone this repository**
   ```bash
   git clone https://github.com/JaneTran/local-agent-system.git
   cd local-agent-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set GitHub token**
   ```bash
   export GITHUB_TOKEN="your_personal_access_token"
   ```

4. **Start orchestrator**
   ```bash
   npm run orchestrator
   ```

## Directory Structure

```
local-agent-system/
├── README.md                    # This file
├── .gitignore
├── package.json
│
├── config/                      # Configuration files
│   ├── agents.json              # Agent definitions
│   ├── orchestrator.json        # Orchestrator settings
│   └── github.json              # GitHub integration
│
├── agents/                      # Three local agents
│   ├── research/
│   │   ├── main.js
│   │   ├── config.js
│   │   └── output/
│   ├── coding/
│   │   ├── main.js
│   │   ├── config.js
│   │   └── output/
│   └── writing/
│       ├── main.js
│       ├── config.js
│       └── output/
│
├── orchestrator/                # Task orchestrator
│   ├── main.js                  # Main orchestrator loop
│   ├── github-api.js            # GitHub API wrapper
│   ├── agent-manager.js         # Agent launcher
│   ├── config.js
│   ├── logs/                    # Execution logs
│   └── config/
│
├── outputs/                     # Final task outputs
├── tasks/                       # Task metadata
└── docs/                        # Documentation
    └── ARCHITECTURE.md
```

## Usage

### Create a Task in GitHub Project

1. Open GitHub Project: https://github.com/JaneTran/local-agent-system/projects
2. Create a new task (Issue)
3. Set fields:
   - **Title**: Task description
   - **Agent**: research / coding / writing
   - **Status**: TODO
4. Save

### Orchestrator picks up the task

The orchestrator:
- Polls GitHub every 30 seconds
- Finds new TODO tasks
- Launches the appropriate agent
- Marks task as RUNNING
- Saves output
- Marks task as DONE (or FAILED)

### View Results

Results are saved in `outputs/` folder and linked back to GitHub task.

## Configuration

### agents.json
Defines available agents and their capabilities.

### orchestrator.json
Controls polling interval, GitHub connection, logging.

### github.json
GitHub authentication and repository info.

## Troubleshooting

### Token Issues
```bash
# Verify token
gh auth status
```

### Agent Not Running
- Check orchestrator logs: `tail orchestrator/logs/*.log`
- Verify agent is enabled in `config/agents.json`

### GitHub Connection Failed
- Check GITHUB_TOKEN environment variable
- Verify credentials: `gh auth login`

## Next Steps

1. Set up GitHub Project board
2. Configure agent roles
3. Create test tasks
4. Run orchestrator in background

## License

MIT

## Support

For issues or questions, create an issue in this repository.
