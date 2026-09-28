import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePublicResultQuery } from "../src/lib/tse/public-results";

const allowedQueries = [
  ["office=president&scope=br", { scope: "BR", scopeType: "country", office: "president" }],
  ["office=president&scope=pr", { scope: "PR", scopeType: "state", office: "president" }],
  ["office=governor&scope=pr", { scope: "PR", scopeType: "state", office: "governor" }],
  ["office=senator&scope=pr", { scope: "PR", scopeType: "state", office: "senator" }],
  ["office=federal-deputy&scope=pr", { scope: "PR", scopeType: "state", office: "federal-deputy" }],
  ["office=state-deputy&scope=pr", { scope: "PR", scopeType: "state", office: "state-deputy" }]
] as const;

test("defaults to the national presidential result", () => {
  assert.deepEqual(parsePublicResultQuery(new URLSearchParams()), {
    success: true,
    identity: { scope: "BR", scopeType: "country", office: "president" },
    isDefault: true
  });
});

for (const [query, identity] of allowedQueries) {
  test(`allows the cached result identity ${query}`, () => {
    assert.deepEqual(parsePublicResultQuery(new URLSearchParams(query)), {
      success: true,
      identity,
      isDefault: query === "office=president&scope=br"
    });
  });
}

test("rejects unknown query parameters", () => {
  assert.deepEqual(parsePublicResultQuery(new URLSearchParams("office=president&scope=br&url=https://example.com")), {
    success: false,
    code: "UNKNOWN_PARAMETER"
  });
});

test("rejects repeated query parameters", () => {
  assert.deepEqual(parsePublicResultQuery(new URLSearchParams("office=president&office=governor&scope=pr")), {
    success: false,
    code: "DUPLICATE_PARAMETER"
  });
});

test("requires office and scope together", () => {
  assert.deepEqual(parsePublicResultQuery(new URLSearchParams("office=president")), {
    success: false,
    code: "INCOMPLETE_QUERY"
  });
});

test("rejects result identities outside the public product matrix", () => {
  assert.deepEqual(parsePublicResultQuery(new URLSearchParams("office=governor&scope=br")), {
    success: false,
    code: "UNSUPPORTED_COMBINATION"
  });
});
