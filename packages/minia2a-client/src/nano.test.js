// Tests for the optional feeless Nano (XNO) settlement scheme in minia2a-client.
// Run with: node --test src/nano.test.js  (or `npm test`)
import { test } from "node:test";
import assert from "node:assert/strict";
import { nanoScheme, hasNanoAccept } from "./nano.js";
import { createClient } from "./index.js";

// A throwaway Nano seed (64 hex chars) for local-only signing tests. Never a
// real balance; used purely to construct a scheme without touching the network.
const TEST_NANO_SEED = "aaaa".repeat(16); // 64 hex chars, all 'a'

test("nanoScheme returns a nano:mainnet exact scheme", () => {
  const scheme = nanoScheme({ seed: TEST_NANO_SEED, rpcUrl: "https://rpc.nano.to" });
  assert.equal(scheme.network, "nano:mainnet");
  assert.equal(scheme.client.scheme, "exact");
  assert.equal(typeof scheme.client.createPaymentPayload, "function");
});

test("nanoScheme requires a seed", () => {
  // No seed, no MINIA2A_NANO_SEED set in this test process -> throws.
  assert.throws(() => nanoScheme({ rpcUrl: "https://rpc.nano.to" }), /Nano seed required/);
});

test("hasNanoAccept is true for a self-consistent nano:mainnet accept", () => {
  const req = {
    accepts: [
      {
        scheme: "exact",
        network: "nano:mainnet",
        payTo: "nano_1jwwcrj9ps8rqi9rbpmw39mrar7ush7r1tibs9qhwwt146yi6m118rpmhru1",
        amount: "12920000000000000000000",
        maxTimeoutSeconds: 120,
      },
    ],
  };
  assert.equal(hasNanoAccept(req), true);
});

test("hasNanoAccept is false when no nano:mainnet accept is advertised", () => {
  const req = {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        payTo: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "500000",
        maxTimeoutSeconds: 120,
      },
    ],
  };
  assert.equal(hasNanoAccept(req), false);
});

test("hasNanoAccept rejects an EVM payTo under a nano:mainnet network (family mismatch)", () => {
  const req = {
    accepts: [
      {
        scheme: "exact",
        network: "nano:mainnet",
        payTo: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // EVM address -> not Nano
        amount: "500000",
        maxTimeoutSeconds: 120,
      },
    ],
  };
  assert.equal(hasNanoAccept(req), false);
});

test("createClient accepts the optional nano config without breaking the Base default", () => {
  const EVM_KEY = "0x" + "11".repeat(32); // local-only EVM key for construction
  const client = createClient(EVM_KEY, { nano: { seed: TEST_NANO_SEED, rpcUrl: "https://rpc.nano.to" }, });
  assert.equal(typeof client.call, "function");
  assert.equal(typeof client.address, "string");
});
