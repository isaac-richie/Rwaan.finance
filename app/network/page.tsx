import { NetworkDashboard } from "@/components/network-dashboard";

export const metadata = {
  title: "My Network — $RWAAN Staking",
  description: "Your downline, team stake breakdown, and rank progress.",
};

export default function NetworkPage() {
  return <NetworkDashboard />;
}
