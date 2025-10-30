# Cloudflare Workflows - Dependency Update Manager

Automated dependency management using Cloudflare Workflows.

## Features

- 🔄 Automatically triggers Dependabot updates
- ✅ Checks Worker health after deployments
- 📊 Monitors pending pull requests
- ⏰ Runs on schedule (Monday 9 AM UTC)

## Setup

### 1. Deploy the Workflow

```bash
cd integrations/cloudflare
wrangler deploy --config wrangler-workflow.toml
```

### 2. Add GitHub Token Secret

```bash
wrangler secret put GITHUB_TOKEN --config wrangler-workflow.toml
# Paste your GitHub Personal Access Token with repo permissions
```

### 3. Add Workflow Secret (optional)

```bash
wrangler secret put WORKFLOW_SECRET --config wrangler-workflow.toml
# Create a random secret for API authentication
```

## Usage

### Automatic (Cron Trigger)
Runs every Monday at 9 AM UTC automatically.

### Manual Trigger via API

```bash
curl -X POST https://fittrack-dependency-workflow.rehchu1.workers.dev \
  -H "Authorization: Bearer YOUR_WORKFLOW_SECRET" \
  -H "Content-Type: application/json"
```

### Check Workflow Status

```bash
curl https://fittrack-dependency-workflow.rehchu1.workers.dev/workflow/status/WORKFLOW_ID
```

## Workflow Steps

1. **Trigger Dependabot** - Initiates GitHub Dependabot workflow
2. **Wait** - 5-minute delay for PR creation
3. **Check PRs** - Lists open Dependabot pull requests  
4. **Verify Deployment** - Checks Worker health endpoint
5. **Generate Report** - Creates summary of updates

## Configuration

Edit `wrangler-workflow.toml` to customize:
- Schedule (cron trigger)
- GitHub repository
- Environment variables

## Monitoring

View workflow runs in Cloudflare Dashboard:
- Workers & Pages → Workflows → fittrack-dependency-workflow
