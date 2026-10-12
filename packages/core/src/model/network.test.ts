import { describe, expect, it } from "vitest";
import { NetworkCallSchema, NetworkSummarySchema } from "./network.js";
import {
  endpoint,
  fullCall,
  fullNetwork,
  listOf,
  minimalCall,
  minimalNetwork,
  textOfBytes,
  without,
} from "./samples.test-support.js";

describe("NetworkCallSchema", () => {
  it.each([
    ["only the required fields", minimalCall()],
    ["every optional field", fullCall()],
  ])("accepts a call with %s", (_label, input) => {
    expect(NetworkCallSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["host is missing", without(minimalCall(), "host")],
    ["startedAtMs is missing", without(minimalCall(), "startedAtMs")],
    ["status is not a number", { ...minimalCall(), status: "500" }],
    ["durationMs is negative", { ...minimalCall(), durationMs: -1 }],
    [
      "urlTemplate is over the default text cap",
      { ...minimalCall(), urlTemplate: textOfBytes(2049) },
    ],
    ["it has an unknown key", { ...minimalCall(), body: "{}" }],
  ])("rejects a call when %s", (_label, input) => {
    expect(NetworkCallSchema.safeParse(input).success).toBe(false);
  });
});

describe("NetworkSummarySchema", () => {
  it.each([
    ["only the required fields", minimalNetwork()],
    ["every optional field", fullNetwork()],
    [
      "endpoints and calls at their caps",
      { endpoints: listOf(200, endpoint()), calls: listOf(200, minimalCall()) },
    ],
  ])("accepts a summary with %s", (_label, input) => {
    expect(NetworkSummarySchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["endpoints is missing", {}],
    ["endpoints has more than 200 items", { endpoints: listOf(201, endpoint()) }],
    ["calls has more than 200 items", { endpoints: [], calls: listOf(201, minimalCall()) }],
    ["endpointsDropped is 0", { endpoints: [], endpointsDropped: 0 }],
    ["endpointsDropped is negative", { endpoints: [], endpointsDropped: -1 }],
    ["callsDropped is 0", { endpoints: [], callsDropped: 0 }],
    ["callsDropped is negative", { endpoints: [], callsDropped: -1 }],
    ["an endpoint count is not a number", { endpoints: [{ ...endpoint(), count: "2" }] }],
    [
      "an endpoint status count is negative",
      { endpoints: [{ ...endpoint(), statuses: { "200": -1 } }] },
    ],
    [
      "an endpoint status key is over the default text cap",
      { endpoints: [{ ...endpoint(), statuses: { [textOfBytes(2049)]: 1 } }] },
    ],
    ["an endpoint has no p95Ms", { endpoints: [without(endpoint(), "p95Ms")] }],
  ])("rejects a summary when %s", (_label, input) => {
    expect(NetworkSummarySchema.safeParse(input).success).toBe(false);
  });
});
