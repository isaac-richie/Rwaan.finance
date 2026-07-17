import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-20">
            <div className="mb-8">
                <Link href="/#footer">
                    <Button variant="ghost" className="mb-4">
                        ← Back to Home
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold">Terms of Service</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Last Updated: February 13, 2026
                </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                <section>
                    <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using the RWAAN Staking Protocol (the &quot;Protocol&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the Protocol.
                    </p>
                    <p className="font-semibold">
                        These Terms constitute a legally binding agreement between you and the Protocol operators.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">2. Eligibility</h2>

                    <h3 className="text-xl font-semibold text-foreground">2.1 Age Requirement</h3>
                    <p>
                        You must be at least 18 years old (or the age of legal majority in your jurisdiction) to use the Protocol.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">2.2 Legal Capacity</h3>
                    <p>
                        You must have the legal capacity to enter into binding contracts in your jurisdiction.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">2.3 Compliance with Laws</h3>
                    <p>
                        You are responsible for ensuring that your use of the Protocol complies with all applicable laws, regulations, and ordinances in your jurisdiction. You may not use the Protocol if doing so is prohibited in your country or region.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">2.4 Restricted Jurisdictions</h3>
                    <p>
                        Users from certain jurisdictions may be restricted from using the Protocol. It is your responsibility to determine whether you are permitted to use the Protocol based on your location.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">3. Description of Services</h2>
                    <p>
                        The RWAAN Staking Protocol is a decentralized staking platform built on the BNB Chain that allows users to:
                    </p>
                    <ul>
                        <li>Stake $RWAAN tokens in flexible or locked staking plans</li>
                        <li>Earn staking rewards based on APR and lock duration</li>
                        <li>Claim accumulated rewards</li>
                        <li>Withdraw staked tokens (subject to lock-up periods)</li>
                        <li>Participate in referral programs</li>
                    </ul>
                    <p className="font-semibold">
                        The Protocol is provided on a non-custodial basis. You retain full control and custody of your tokens at all times through your wallet.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">4. User Responsibilities</h2>

                    <h3 className="text-xl font-semibold text-foreground">4.1 Wallet Security</h3>
                    <p>
                        You are solely responsible for:
                    </p>
                    <ul>
                        <li>Maintaining the security of your private keys and seed phrases</li>
                        <li>Protecting your wallet from unauthorized access</li>
                        <li>All activity conducted through your wallet</li>
                    </ul>
                    <p className="font-semibold text-red-500">
                        We cannot recover lost private keys or reverse unauthorized transactions.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.2 Accuracy of Information</h3>
                    <p>
                        You are responsible for ensuring that all information you provide is accurate and up-to-date.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.3 Transaction Verification</h3>
                    <p>
                        You must verify all transaction details before confirming any transaction. Once confirmed on the blockchain, transactions are irreversible.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.4 Due Diligence</h3>
                    <p>
                        You must conduct your own research (DYOR) and understand the risks before staking. We do not provide investment, financial, or legal advice.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">5. Prohibited Activities</h2>
                    <p>
                        You agree NOT to:
                    </p>
                    <ul>
                        <li>Use the Protocol for any illegal or unauthorized purpose</li>
                        <li>Violate any laws in your jurisdiction</li>
                        <li>Attempt to exploit, manipulate, or abuse the Protocol</li>
                        <li>Interfere with or disrupt the Protocol&apos;s operation</li>
                        <li>Reverse engineer, decompile, or disassemble the Protocol</li>
                        <li>Use automated tools (bots) without authorization</li>
                        <li>Engage in wash trading, market manipulation, or fraudulent activities</li>
                        <li>Impersonate another person or entity</li>
                        <li>Transmit viruses, malware, or harmful code</li>
                        <li>Violate any intellectual property rights</li>
                    </ul>
                    <p className="font-semibold">
                        Violation of these prohibitions may result in immediate termination of your access to the Protocol.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">6. Fees and Gas Costs</h2>

                    <h3 className="text-xl font-semibold text-foreground">6.1 Gas Fees</h3>
                    <p>
                        All blockchain transactions require payment of gas fees to the BNB Chain network. These fees are:
                    </p>
                    <ul>
                        <li>Paid directly to network validators, not to the Protocol</li>
                        <li>Variable based on network congestion</li>
                        <li>Non-refundable, even if a transaction fails</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">6.2 Protocol Fees</h3>
                    <p>
                        The Protocol may charge fees for certain operations. All fees will be clearly displayed before you confirm a transaction.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">7. Intellectual Property</h2>

                    <h3 className="text-xl font-semibold text-foreground">7.1 Protocol Ownership</h3>
                    <p>
                        All intellectual property rights in the Protocol, including but not limited to trademarks, logos, text, graphics, and code, are owned by the Protocol operators or our licensors.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">7.2 Limited License</h3>
                    <p>
                        We grant you a limited, non-exclusive, non-transferable license to access and use the Protocol for its intended purpose. This license does not include any right to:
                    </p>
                    <ul>
                        <li>Modify or create derivative works</li>
                        <li>Distribute or sublicense the Protocol</li>
                        <li>Use the Protocol for commercial purposes beyond staking</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">7.3 Open Source Components</h3>
                    <p>
                        Certain components of the Protocol may be licensed under open source licenses, which are subject to their respective terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">8. Disclaimers</h2>

                    <h3 className="text-xl font-semibold text-foreground">8.1 &quot;AS IS&quot; Provision</h3>
                    <p className="font-semibold">
                        THE PROTOCOL IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">8.2 No Investment Advice</h3>
                    <p>
                        We do not provide investment, financial, tax, or legal advice. Nothing in the Protocol should be construed as such advice.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">8.3 No Guarantees</h3>
                    <p>
                        We make no guarantees about:
                    </p>
                    <ul>
                        <li>The Protocol&apos;s availability, uptime, or performance</li>
                        <li>Future rewards or returns</li>
                        <li>Token price or value</li>
                        <li>Absence of errors, bugs, or vulnerabilities</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">8.4 Third-Party Services</h3>
                    <p>
                        The Protocol may integrate with third-party services (wallets, RPC providers, oracles). We are not responsible for the performance, security, or reliability of these services.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">9. Limitation of Liability</h2>
                    <p className="font-semibold">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PROTOCOL OPERATORS, DEVELOPERS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY:
                    </p>
                    <ul>
                        <li>Indirect, incidental, special, consequential, or punitive damages</li>
                        <li>Loss of profits, revenue, data, or use</li>
                        <li>Loss or theft of tokens or funds</li>
                        <li>Smart contract vulnerabilities or exploits</li>
                        <li>Transaction failures or delays</li>
                        <li>Network congestion or downtime</li>
                        <li>Regulatory action or changes in law</li>
                    </ul>
                    <p className="font-semibold">
                        IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT OF FEES YOU PAID TO THE PROTOCOL IN THE PRECEDING 12 MONTHS, IF ANY.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">10. Indemnification</h2>
                    <p>
                        You agree to indemnify, defend, and hold harmless the Protocol operators, developers, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
                    </p>
                    <ul>
                        <li>Your use or misuse of the Protocol</li>
                        <li>Your violation of these Terms</li>
                        <li>Your violation of any laws or regulations</li>
                        <li>Your infringement of any third-party rights</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">11. Force Majeure</h2>
                    <p>
                        We shall not be liable for any failure or delay in performance due to events beyond our reasonable control, including but not limited to:
                    </p>
                    <ul>
                        <li>Natural disasters</li>
                        <li>War, terrorism, or civil unrest</li>
                        <li>Government actions or regulatory changes</li>
                        <li>Blockchain network failures</li>
                        <li>Cyberattacks or security breaches</li>
                        <li>Internet or power outages</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">12. Modification of Terms</h2>
                    <p>
                        We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated &quot;Last Updated&quot; date.
                    </p>
                    <p className="font-semibold">
                        Your continued use of the Protocol after changes are posted constitutes your acceptance of the modified Terms.
                    </p>
                    <p>
                        Material changes will be communicated through our official channels. It is your responsibility to review these Terms regularly.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">13. Termination</h2>

                    <h3 className="text-xl font-semibold text-foreground">13.1 Termination by You</h3>
                    <p>
                        You may stop using the Protocol at any time. However, you remain bound by these Terms with respect to your prior use.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">13.2 Termination by Us</h3>
                    <p>
                        We reserve the right to restrict, suspend, or terminate your access to the Protocol at any time for any reason, including violation of these Terms.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">13.3 Effect of Termination</h3>
                    <p>
                        Due to the decentralized nature of the Protocol, termination of access does not affect already-staked tokens or rewards, which remain subject to smart contract rules.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">14. Governing Law and Dispute Resolution</h2>

                    <h3 className="text-xl font-semibold text-foreground">14.1 Governing Law</h3>
                    <p>
                        These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">14.2 Arbitration</h3>
                    <p>
                        Any dispute arising from these Terms or your use of the Protocol shall be resolved through binding arbitration, rather than in court, except where prohibited by law.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">14.3 Class Action Waiver</h3>
                    <p>
                        You agree to resolve disputes on an individual basis and waive any right to participate in class action lawsuits or class-wide arbitration.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">15. Severability</h2>
                    <p>
                        If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">16. Entire Agreement</h2>
                    <p>
                        These Terms, together with the Privacy Policy and Risk Disclosure, constitute the entire agreement between you and the Protocol operators regarding your use of the Protocol.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">17. Contact Information</h2>
                    <p>
                        For questions about these Terms, please contact us through our official channels:
                    </p>
                    <ul>
                        <li>Twitter/X: <a href="https://x.com/RWAN_Official" target="_blank" rel="noreferrer" className="text-primary hover:underline">@RWAN_Official</a></li>
                        <li>Telegram: <a href="https://t.me/RWAN_Chat" target="_blank" rel="noreferrer" className="text-primary hover:underline">RWAN_Chat</a></li>
                    </ul>
                </section>

                <section className="border-t border-white/10 pt-8">
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-6">
                        <p className="mb-4 font-semibold text-foreground">
                            Acknowledgment
                        </p>
                        <p className="text-sm">
                            By using the RWAAN Staking Protocol, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                        </p>
                        <p className="mt-4 text-xs italic">
                            If you do not agree to these Terms, you must immediately discontinue use of the Protocol.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
