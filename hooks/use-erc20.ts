import { useReadContract, useReadContracts, useWriteContract } from "wagmi";

import { erc20Abi } from "@/lib/contracts/erc20Abi";
import { RWAN_STAKING_ADDRESS } from "@/lib/utils/constants";

export function useTokenMetadata(tokenAddress?: `0x${string}`) {
  const results = useReadContracts({
    contracts: tokenAddress
      ? ([
        { address: tokenAddress, abi: erc20Abi, functionName: "name" },
        { address: tokenAddress, abi: erc20Abi, functionName: "symbol" },
        { address: tokenAddress, abi: erc20Abi, functionName: "decimals" },
      ] as const)
      : undefined,
  });

  return {
    name: results.data?.[0]?.result as string | undefined,
    symbol: results.data?.[1]?.result as string | undefined,
    decimals: results.data?.[2]?.result as number | undefined,
    isLoading: results.isLoading,
  };
}

export function useTokenBalance(
  tokenAddress?: `0x${string}`,
  account?: `0x${string}`
) {
  const hasParams = Boolean(tokenAddress && account);
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: hasParams ? [account!] : undefined,
    query: {
      enabled: hasParams,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
}

export function useTokenAllowance(
  tokenAddress?: `0x${string}`,
  owner?: `0x${string}`
) {
  const hasParams = Boolean(tokenAddress && owner);
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: hasParams ? [owner!, RWAN_STAKING_ADDRESS] : undefined,
    query: {
      enabled: hasParams,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
}

export function useApproveToken(tokenAddress?: `0x${string}`) {
  const { writeContractAsync, isPending } = useWriteContract();

  const approve = async (amount: bigint) => {
    if (!tokenAddress) throw new Error("Token address not available.");
    const result = await writeContractAsync?.({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [RWAN_STAKING_ADDRESS, amount],
    });
    return result;
  };

  return { approve, isPending };
}
