// minia2a-client — optional Nano (XNO) settlement scheme.
//
// The client's default settlement is USDC on Base via @x402/evm (ExactEvmScheme).
// This module adds an *optional, additive* feeless Nano (XNO) exact-permit2
// scheme (nano:mainnet) that sits beside it in @x402/fetch's `schemes` array.
//
// Reachability: a client-side scheme alone does not make the rail payable. The
// paid path starts from the 402 challenge the gateway returns — only an
// `accepts[]` entry whose `network` is `nano:mainnet` makes a Nano payment
// selectable. This module wires the client half so that, the moment a
// nano:mainnet accept is advertised (payTo a nano_/xrb_ account, asset the
// XNO family, scheme "exact"), an agent holding a Nano account can settle
// feelessly without an EVM wallet or Base onboarding.
//
// Conformance (stated up front, per the minia2a maintainer's guidance):
//   - payTo must parse as a Nano account of the same family as `network`
//     (nano:mainnet -> nano_ or xrb_ prefix); it is never an EVM address.
//   - scheme is the same "exact" identifier advertised today, so an existing
//     exact client can pick the nano:mainnet accept without a new scheme label.
//   - the Nano account's private seed is used only to sign locally; it is
//     never sent to minia2a or to any facilitator.

import { ExactNanoScheme } from "@x402nano/exact";
import { Helper } from "@x402nano/helper";

const NANO_RPC_URL = process.env.NANO_RPC_URL || "https://rpc.nano.to";

/**
 * Build the optional Nano (XNO) exact-permit2 settlement scheme.
 *
 * @param {object} [opts]
 * @param {string} [opts.seed] - Nano private seed (64 hex chars). Falls back to
 *   process.env.MINIA2A_NANO_SEED. Required to sign Nano send blocks.
 * @param {string} [opts.rpcUrl] - Nano RPC endpoint. Falls back to
 *   process.env.NANO_RPC_URL then https://rpc.nano.to.
 * @returns {{ network: "nano:mainnet", client: import("@x402nano/exact").ExactNanoScheme }}
 */
export function nanoScheme(opts = {}) {
  const seed = opts.seed || process.env.MINIA2A_NANO_SEED;
  if (!seed) {
    throw new Error(
      "Nano seed required — pass { seed } to nanoScheme() or set MINIA2A_NANO_SEED. " +
        "The Nano account signs feeless XNO payments locally; it is never sent to minia2a."
    );
  }
  const helper = new Helper({ NANO_RPC_URL: opts.rpcUrl || NANO_RPC_URL });
  helper.setNanoAccountPrivateKey(seed);
  return { network: "nano:mainnet", client: new ExactNanoScheme(helper) };
}

/**
 * True if the given 402 challenge advertises a payable nano:mainnet exact
 * accept, and that accept is self-consistent (payTo is a Nano account of the
 * same family as the network). The client uses this to decide whether a Nano
 * settlement is reachable for the endpoint being called.
 *
 * @param {object} [req] - A 402 Payment Required challenge ({accepts: [...]}).
 * @returns {boolean}
 */
export function hasNanoAccept(req) {
  const accepts = (req && req.accepts) || [];
  return accepts.some(
    (a) =>
      a &&
      a.network === "nano:mainnet" &&
      (String(a.payTo || "").startsWith("nano_") || String(a.payTo || "").startsWith("xrb_")) &&
      (!a.scheme || a.scheme === "exact")
  );
}
