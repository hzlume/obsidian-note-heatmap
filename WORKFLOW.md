---
# ============================================================
# WORKFLOW.md — Symphony workflow for obsidian-note-heatmap
# Linear Project: https://linear.app/hzlume/project/obsidian-note-heatmap-abe68530571f
# ============================================================

tracker:
  kind: linear
  # Project slug extracted from URL: obsidian-note-heatmap-{slugId}
  project_slug: "obsidian-note-heatmap-abe68530571f"
  active_states:
    - Todo
    - In Progress
    - Rework
  terminal_states:
    - Done
    - Canceled
    - Duplicate
    - Merging

polling:
  interval_ms: 5000

server:
  port: 4000

workspace:
  root: /workspaces

hooks:
  after_create: |
    # Clone the obsidian-note-heatmap repository via SSH
    eval "$(ssh-agent -s)"
    ssh-add /secrets/id_rsa 2>/dev/null || true
    git clone git@github.com:hzlume/obsidian-note-heatmap.git .
    # Install Node.js dependencies
    npm install
    # Verify the build works
    npm run build 2>/dev/null || echo "Build command not available, continuing..."
    # Configure git identity for commits
    git config user.email "codex@symphony.local"
    git config user.name "Codex Agent"
  before_remove: |
    echo "Cleaning up workspace..."

agent:
  max_concurrent_agents: 3
  max_turns: 30

codex:
  command: codex --config shell_environment_policy.inherit=all app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
---

You are working on Linear ticket `{{ issue.identifier }}`

{% if attempt %}
Continuation context:
- This is retry attempt #{{ attempt }} because the ticket is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed investigation or validation unless needed.
- Do not end the turn while the issue remains in an active state unless blocked by missing permissions/secrets.
{% endif %}

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

---

## Project: obsidian-note-heatmap

An **Obsidian plugin** (TypeScript) that displays note editing frequency as a GitHub-style heatmap.

### Tech Stack
- Language: **TypeScript**
- Build: `npm run build` → `esbuild` bundler → `main.js`
- Plugin entry: `main.ts` (extends Obsidian `Plugin` class)
- Key files: `main.ts`, `manifest.json`, `styles.css`, `package.json`

### Development Conventions
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **Branch naming**: `codex/<issue-identifier>-<short-description>` (e.g., `codex/HZL-42-fix-heatmap-render`)
- **PR title**: Mirror the issue title
- **Build verification**: Always run `npm run build` before committing to ensure TypeScript compiles

### Workflow Instructions

1. This is an **unattended orchestration session**. Never ask a human to perform follow-up actions.
2. Only stop early for a **true blocker** (missing required auth/permissions/secrets). If blocked, record it in the workpad and move the issue to the blocked state.
3. Final message must report **completed actions and blockers only**. Do not include "next steps for user".
4. Work only in the provided repository copy. Do not touch any other path.

## Prerequisite: Linear MCP or `linear_graphql` tool is available

The agent should be able to talk to Linear, either via a configured Linear MCP server or injected `linear_graphql` tool.

## Default Posture

- Start by determining the ticket's current status, then follow the matching flow for that status.
- Open the tracking workpad comment at the start and keep it up to date before doing new implementation work.
- Spend extra effort up front on planning and verification design before implementation.
- Reproduce first: always confirm the current behavior/issue signal before changing code.
- Keep ticket metadata current (state, checklist, acceptance criteria, links).
- Treat a single persistent Linear comment as the source of truth for progress.
- Use that single workpad comment for all progress and handoff notes; do not post separate "done"/summary comments.
- When meaningful out-of-scope improvements are discovered, file a separate Linear issue instead of expanding scope.

## Status Map

- `Backlog` → out of scope; do not modify.
- `Todo` → queued; immediately transition to `In Progress` before active work.
  - Special case: if a PR is already attached, treat as feedback/rework loop.
- `In Progress` → implementation actively underway.
- `In Review` → PR is attached and validated; waiting on human approval and human to merge.
- `Rework` → reviewer requested changes; planning + implementation required.
- `Merging` → human is merging the PR; terminal state for agent.
- `Done` → terminal state; no further action required.

## Step 0: Determine current ticket state and route

1. Fetch the issue by explicit ticket ID.
2. Read the current state.
3. Route to the matching flow:
   - `Backlog` → do not modify; stop and wait for human to move it to `Todo`.
   - `Todo` → immediately move to `In Progress`, ensure bootstrap workpad comment exists, then start execution.
   - `In Progress` → continue execution from current scratchpad comment.
   - `In Review` → wait and poll for decision/review updates.
   - `Rework` → run rework flow addressing reviewer feedback.
   - `Merging`, `Done` → do nothing and shut down.

## Step 1: Start/continue execution (Todo or In Progress)

1. Find or create a single persistent scratchpad comment for the issue:
   - Search existing comments for `## Codex Workpad` marker.
   - If found, reuse it. If not found, create one.
2. Create a new branch: `git checkout -b codex/{{ issue.identifier | lower }}-<short-slug>`
3. Analyze the issue requirements:
   - Read relevant TypeScript source files
   - Understand the Obsidian plugin API patterns used
   - Plan the implementation
4. Implement the changes:
   - Make focused, well-structured changes
   - Follow existing code style
   - Add comments where intent is non-obvious
5. Verify the build: `npm run build`
6. Commit with conventional commit message
7. Push the branch: `git push -u origin HEAD`
8. Create a PR via GitHub CLI:
   ```
   gh pr create --title "{{ issue.title }}" --body "Closes <Linear Issue URL>" --base main
   ```
9. Update Linear issue to `In Review` state
10. Post PR link in workpad comment

## Step 2: Rework (if status is Rework)

1. Read all PR review comments carefully
2. Update workpad with planned changes
3. Implement requested changes
4. Re-verify build
5. Push updates to the existing branch
6. Reply to each review comment with resolution
7. Move issue back to `In Review`
