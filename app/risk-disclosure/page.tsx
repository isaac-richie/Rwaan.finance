import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function RiskDisclosurePage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-20">
            <div className="mb-8">
                <Link href="/#footer">
                    <Button variant="ghost" className="mb-4">
                        ← Back to Home
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    <h1 className="text-4xl font-bold">Risk Disclosure</h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    Last Updated: February 13, 2026
                </p>
            </div>

            <div className="mb-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm font-semibold text-yellow-500">
                    ⚠️ IMPORTANT: Please read this risk disclosure carefully before using the RWAAN Staking Protocol. Staking cryptocurrency involves significant risks, and you may lose some or all of your investment.
                </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                <section>
                    <h2 className="text-2xl font-semibold text-foreground">1. Smart Contract Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">1.1 Code Vulnerabilities</h3>
                    <p>
                        Despite rigorous development and testing, smart contracts may contain bugs, vulnerabilities, or unexpected behavior that could result in:
                    </p>
                    <ul>
                        <li>Loss of staked tokens</li>
                        <li>Inability to withdraw funds</li>
                        <li>Incorrect reward calculations</li>
                        <li>Contract exploitation by malicious actors</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">1.2 Immutability</h3>
                    <p>
                        Once deployed, smart contracts cannot be easily modified. If a vulnerability is discovered, it may not be possible to fix it without migrating to a new contract, which could be time-consuming or result in loss of funds.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">1.3 No Audits or Limited Audits</h3>
                    <p>
                        While we strive for security, our smart contracts may not have been formally audited by third-party security firms. Even audited contracts can have undiscovered vulnerabilities.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">2. Market and Price Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">2.1 Token Volatility</h3>
                    <p>
                        The value of $RWAAN tokens can fluctuate dramatically due to:
                    </p>
                    <ul>
                        <li>Market demand and supply</li>
                        <li>Broader cryptocurrency market conditions</li>
                        <li>Regulatory announcements</li>
                        <li>Technological developments</li>
                        <li>Community sentiment</li>
                    </ul>
                    <p className="font-semibold">
                        The value of your staked tokens may decrease significantly, potentially to zero.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">2.2 Reward Rate Changes</h3>
                    <p>
                        APR and reward rates are not guaranteed and may change at any time based on:
                    </p>
                    <ul>
                        <li>Total staked supply</li>
                        <li>Protocol parameters</li>
                        <li>Governance decisions</li>
                        <li>Economic conditions</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">3. Lock-Up Period Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">3.1 Illiquidity</h3>
                    <p>
                        When you stake tokens in a locked staking plan:
                    </p>
                    <ul>
                        <li>Your tokens are locked for a fixed period (30, 90, 180, or 365 days)</li>
                        <li>You cannot withdraw or sell these tokens during the lock period</li>
                        <li>You cannot access your funds even in emergencies</li>
                        <li>Early withdrawal may result in penalties or be impossible</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">3.2 Opportunity Cost</h3>
                    <p>
                        While your tokens are locked, you may miss out on:
                    </p>
                    <ul>
                        <li>More profitable investment opportunities</li>
                        <li>The ability to sell during price peaks</li>
                        <li>Participating in other DeFi protocols</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">4. Technical Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">4.1 Blockchain Network Risks</h3>
                    <p>
                        The BNB Chain may experience:
                    </p>
                    <ul>
                        <li>Network congestion causing delayed transactions</li>
                        <li>Hard forks or chain splits</li>
                        <li>Consensus failures</li>
                        <li>51% attacks (though unlikely)</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">4.2 Wallet and Key Management</h3>
                    <p>
                        You are solely responsible for:
                    </p>
                    <ul>
                        <li>Securing your private keys and seed phrases</li>
                        <li>Protecting your wallet from unauthorized access</li>
                        <li>Avoiding phishing and scam attempts</li>
                    </ul>
                    <p className="font-semibold text-red-500">
                        Lost or stolen private keys cannot be recovered. We cannot help you regain access to your wallet.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.3 Transaction Failures</h3>
                    <p>
                        Blockchain transactions may fail due to:
                    </p>
                    <ul>
                        <li>Insufficient gas fees</li>
                        <li>Network congestion</li>
                        <li>Smart contract revert conditions</li>
                        <li>Wallet connection issues</li>
                    </ul>
                    <p>
                        Failed transactions still consume gas fees, which are not refundable.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">5. Regulatory and Legal Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">5.1 Regulatory Uncertainty</h3>
                    <p>
                        Cryptocurrency regulations vary by jurisdiction and are evolving rapidly. Future regulations may:
                    </p>
                    <ul>
                        <li>Restrict or prohibit staking activities</li>
                        <li>Impose tax obligations</li>
                        <li>Require KYC/AML compliance</li>
                        <li>Limit access to the Protocol</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">5.2 Tax Implications</h3>
                    <p>
                        Staking rewards may be subject to taxation in your jurisdiction. You are responsible for:
                    </p>
                    <ul>
                        <li>Understanding your tax obligations</li>
                        <li>Reporting staking rewards as income</li>
                        <li>Paying applicable taxes</li>
                    </ul>
                    <p className="font-semibold">
                        We do not provide tax advice. Consult a qualified tax professional.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">5.3 Geographic Restrictions</h3>
                    <p>
                        The Protocol may not be available in certain jurisdictions. You are responsible for ensuring that your use of the Protocol complies with local laws.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">6. Protocol-Specific Risks</h2>

                    <h3 className="text-xl font-semibold text-foreground">6.1 Dependency on External Systems</h3>
                    <p>
                        The Protocol may depend on:
                    </p>
                    <ul>
                        <li>Price oracles for accurate market data</li>
                        <li>Third-party RPC providers</li>
                        <li>Wallet providers like MetaMask</li>
                    </ul>
                    <p>
                        Failures or compromises of these systems could affect the Protocol&apos;s functionality.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">6.2 Governance Risks</h3>
                    <p>
                        Protocol parameters may be changed through governance mechanisms. Changes could:
                    </p>
                    <ul>
                        <li>Reduce reward rates</li>
                        <li>Modify lock-up periods</li>
                        <li>Introduce new fees</li>
                        <li>Fundamentally alter the staking mechanism</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">6.3 No Deposit Insurance</h3>
                    <p className="font-semibold text-red-500">
                        Unlike traditional banking, cryptocurrency staking is not insured by any government agency. There is no FDIC or equivalent protection.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">7. No Guarantees</h2>
                    <p className="font-semibold">
                        The RWAAN Staking Protocol makes no guarantees about:
                    </p>
                    <ul>
                        <li>Future rewards or returns</li>
                        <li>Token price appreciation</li>
                        <li>Protocol availability or uptime</li>
                        <li>Ability to withdraw funds at any specific time</li>
                        <li>Protection against losses</li>
                    </ul>
                    <p className="font-semibold text-yellow-500">
                        Past performance is not indicative of future results. High APR does not guarantee profit.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">8. Your Responsibilities</h2>
                    <p>
                        By using the RWAAN Staking Protocol, you acknowledge that you:
                    </p>
                    <ul>
                        <li>Understand the risks outlined in this disclosure</li>
                        <li>Have sufficient knowledge of blockchain and cryptocurrency</li>
                        <li>Can afford to lose your entire investment</li>
                        <li>Are not relying on the Protocol for financial advice</li>
                        <li>Will conduct your own research (DYOR)</li>
                        <li>Accept full responsibility for your staking decisions</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">9. Disclaimer of Liability</h2>
                    <p className="font-semibold">
                        THE PROTOCOL IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL LIABILITY FOR ANY LOSSES OR DAMAGES ARISING FROM YOUR USE OF THE PROTOCOL.
                    </p>
                </section>

                <section className="border-t border-white/10 pt-8">
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
                        <p className="mb-4 font-semibold text-red-500">
                            ⚠️ FINAL WARNING
                        </p>
                        <p className="text-sm">
                            Cryptocurrency staking is high-risk. Only stake what you can afford to lose completely. If you do not understand these risks or are uncomfortable with them, DO NOT USE THE PROTOCOL.
                        </p>
                        <p className="mt-4 text-sm italic">
                            By proceeding to stake, you confirm that you have read, understood, and accepted all risks outlined in this disclosure.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
