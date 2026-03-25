import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../src/server.js";

test("createServer registers the expected tools in order", async () => {
  const server = createServer();
  const client = new Client({
    name: "beacon-mcp-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.listTools();

    assert.deepEqual(
      result.tools.map((tool) => tool.name),
      [
        "get_weather",
        "get_commute",
        "get_emails",
        "get_calendar_events",
        "get_fineapp_audit_updates",
        "get_morning_brief",
      ],
    );

    const morningBriefTool = result.tools.find(
      (tool) => tool.name === "get_morning_brief",
    );

    assert.ok(morningBriefTool);
    assert.equal(
      morningBriefTool.description,
      "Get a morning briefing with optional overrides for weather, commute, email, calendar, and FineApp filters",
    );
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
});

test("createServer exposes resources and resource templates", async () => {
  const server = createServer();
  const client = new Client({
    name: "beacon-mcp-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const [resourcesResult, templatesResult] = await Promise.all([
      client.listResources(),
      client.listResourceTemplates(),
    ]);

    assert.ok(
      resourcesResult.resources.some(
        (resource) => resource.uri === "beacon://server/info",
      ),
    );
    assert.ok(
      resourcesResult.resources.some(
        (resource) => resource.uri === "beacon://tools/get_emails",
      ),
    );

    assert.ok(
      templatesResult.resourceTemplates.some(
        (template) => template.uriTemplate === "beacon://tools/{name}",
      ),
    );

    const serverInfo = await client.readResource({
      uri: "beacon://server/info",
    });
    const toolInfo = await client.readResource({
      uri: "beacon://tools/get_emails",
    });

    assert.match(serverInfo.contents[0].text ?? "", /"name": "beacon-mcp"/);
    assert.match(toolInfo.contents[0].text ?? "", /"name": "get_emails"/);
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
});
