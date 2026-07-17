"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { Copy, ExternalLink, LogOut, Wallet, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAddress } from "@/lib/utils/format";
import { useToast } from "@/components/ui/use-toast";

export function WalletButton() {
  const { login, logout } = usePrivy();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const walletAddress = useMemo(() => {
    if (isConnected && address) return address;
    return null;
  }, [address, isConnected]);

  const shortAddress = walletAddress ? formatAddress(walletAddress) : null;

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const handleDisconnect = () => {
    logout();
  };

  if (!walletAddress) {
    return (
      <Button
        onClick={login}
        className="gap-2 h-10 px-4 text-[13px] font-semibold sm:px-5"
      >
        <Wallet className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gap-2 h-10 px-3.5 text-[13px] font-medium sm:px-4 border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F3BA2F]/10">
            <Wallet className="h-3 w-3 text-[#F3BA2F]" />
          </span>
          <span className="font-mono text-white/70">{shortAddress ?? "Wallet"}</span>
          <ChevronDown className="h-3 w-3 text-white/25" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 border-white/[0.06] bg-[hsl(225_20%_6%)] backdrop-blur-xl">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.15em] text-white/30 font-medium">
          Connected Wallet
        </DropdownMenuLabel>

        <div className="px-3 py-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1.5">
              Address
            </div>
            <code className="text-[11px] font-mono text-white/60 break-all leading-relaxed">
              {walletAddress}
            </code>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-white/[0.04]" />

        <DropdownMenuItem onClick={copyAddress} className="gap-3 cursor-pointer text-white/50 hover:text-white/80">
          <Copy className="h-3.5 w-3.5" />
          <span className="text-[13px]">Copy address</span>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={`https://bscscan.com/address/${walletAddress}`}
            target="_blank"
            rel="noreferrer"
            className="gap-3 cursor-pointer text-white/50 hover:text-white/80"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="text-[13px]">View on BSCScan</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.04]" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="gap-3 cursor-pointer text-red-400/70 focus:text-red-400 focus:bg-red-500/[0.06]"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-[13px]">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
