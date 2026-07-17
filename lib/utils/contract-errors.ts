import { BaseError } from "viem";

type ParsedContractError = {
  title: string;
  description: string;
};

const FALLBACK_ERROR: ParsedContractError = {
  title: "Transaction failed",
  description: "Contract error. Please try again or switch RPC/network.",
};

export function parseContractError(error: unknown): ParsedContractError {
  const message = extractErrorMessage(error).toLowerCase();

  if (message.includes("user rejected") || message.includes("user denied")) {
    return {
      title: "Transaction cancelled",
      description: "You cancelled the transaction in your wallet.",
    };
  }

  if (message.includes("wrong network") || message.includes("chain")) {
    return {
      title: "Wrong network",
      description: "Please switch your wallet to BNB Smart Chain and try again.",
    };
  }

  if (message.includes("amount too low")) {
    return {
      title: "Amount too low",
      description: "Amount is below the contract minimum stake.",
    };
  }

  if (message.includes("positions limit")) {
    return {
      title: "Position limit reached",
      description: "You reached the max open positions for this wallet.",
    };
  }

  if (message.includes("lock disabled") || message.includes("invalid lockid")) {
    return {
      title: "Plan unavailable",
      description: "This lock plan is no longer active. Refresh and choose another plan.",
    };
  }

  if (message.includes("insufficient allowance")) {
    return {
      title: "Allowance too low",
      description: "Approve a higher amount, then retry staking.",
    };
  }

  if (message.includes("insufficient balance")) {
    return {
      title: "Insufficient balance",
      description: "Your wallet balance is too low for this stake amount.",
    };
  }

  if (message.includes("paused")) {
    return {
      title: "Staking paused",
      description: "Contract is paused right now. Please try again later.",
    };
  }

  if (message.includes("429") || message.includes("too many requests")) {
    return {
      title: "RPC busy",
      description: "RPC is rate-limited. Please wait a moment and retry.",
    };
  }

  return FALLBACK_ERROR;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof BaseError) {
    return [error.shortMessage, error.message, ...error.metaMessages ?? []]
      .filter(Boolean)
      .join(" ");
  }
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}
