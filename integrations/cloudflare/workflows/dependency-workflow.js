/**
 * Cloudflare Workflow: Dependency Update Manager
 * 
 * Automates dependency updates by:
 * 1. Triggering Dependabot workflow on GitHub
 * 2. Checking deployment status
 * 3. Verifying Worker health after updates
 * 
 * Runs: Every Monday at 9 AM UTC
 */

import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";

export class DependencyUpdateWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { GITHUB_TOKEN, GITHUB_REPO } = event.env;
    
    // Step 1: Trigger Dependabot workflow on GitHub
    const dependabotStatus = await step.do("trigger dependabot", async () => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/dependabot-auto-merge.yml/dispatches`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ref: "main" })
        }
      );
      
      return {
        triggered: response.ok,
        status: response.status
      };
    });

    // Step 2: Wait for Dependabot to create PRs (5 minute delay)
    await step.sleep("wait for dependabot", "5 minutes");

    // Step 3: Check pending Dependabot PRs
    const pendingPRs = await step.do("check pending PRs", async () => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&creator=dependabot[bot]`,
        {
          headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json"
          }
        }
      );
      
      const prs = await response.json();
      return {
        count: prs.length,
        prs: prs.map(pr => ({
          number: pr.number,
          title: pr.title,
          url: pr.html_url
        }))
      };
    });

    // Step 4: Check Worker deployment status
    const deploymentStatus = await step.do("check worker deployment", async () => {
      const response = await fetch("https://fittrack-pro-desktop.rehchu1.workers.dev/health");
      const health = await response.json();
      
      return {
        healthy: health.status === "ok",
        features: health.features,
        timestamp: health.timestamp
      };
    });

    // Step 5: Create summary report
    const report = await step.do("generate report", async () => {
      return {
        workflow: "Dependency Update Manager",
        runDate: new Date().toISOString(),
        dependabot: dependabotStatus,
        pendingUpdates: pendingPRs,
        workerStatus: deploymentStatus,
        success: deploymentStatus.healthy
      };
    });

    return report;
  }
}

// HTTP handler to manually trigger the workflow
export default {
  async fetch(request, env) {
    // Handle status checks
    const url = new URL(request.url);
    if (url.pathname.startsWith("/workflow/status/")) {
      const instanceId = url.pathname.split("/").pop();
      const instance = await env.DEPENDENCY_WORKFLOW.get(instanceId);
      const status = await instance.status();
      
      return new Response(JSON.stringify(status), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Trigger workflow
    if (request.method !== "POST") {
      return new Response("Method not allowed. Use POST to trigger workflow.", { 
        status: 405 
      });
    }

    // Verify authorization (optional)
    const authHeader = request.headers.get("Authorization");
    if (env.WORKFLOW_SECRET && authHeader !== `Bearer ${env.WORKFLOW_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      // Create and run workflow instance
      const instance = await env.DEPENDENCY_WORKFLOW.create();
      
      return new Response(JSON.stringify({
        success: true,
        workflowId: instance.id,
        message: "Dependency update workflow started",
        statusUrl: `${url.origin}/workflow/status/${instance.id}`
      }), {
        status: 202,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};