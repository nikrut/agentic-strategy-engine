import { encodeFunctionData, type Address } from "viem";
import { TARGET_CHAIN_ID, type EncodedTrade, type TradeIntent } from "./types.js";

export const poolAbi = [
  {
    type: "function",
    name: "swapExactIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  }
] as const;

export const vaultAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    outputs: [{ name: "result", type: "bytes" }]
  }
] as const;

export function encodeTrade(intent: TradeIntent): EncodedTrade {
  if (intent.chainId !== TARGET_CHAIN_ID) throw new Error(`chainId must be ${TARGET_CHAIN_ID}`);
  if (intent.amountIn <= 0n || intent.minAmountOut <= 0n || intent.minAmountOut > intent.quotedAmountOut) {
    throw new Error("intent amounts are invalid");
  }
  if (intent.deadline <= BigInt(intent.createdAt)) throw new Error("intent deadline must follow creation time");
  const poolCalldata = encodeFunctionData({
    abi: poolAbi,
    functionName: "swapExactIn",
    args: [intent.tokenIn, intent.amountIn, intent.minAmountOut, intent.recipient, intent.deadline]
  });
  const vaultCalldata = encodeFunctionData({
    abi: vaultAbi,
    functionName: "execute",
    args: [intent.pool as Address, 0n, poolCalldata]
  });
  return { poolCalldata, vaultCalldata };
}
