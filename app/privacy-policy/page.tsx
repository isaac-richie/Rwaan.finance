import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-20">
            <div className="mb-8">
                <Link href="/#footer">
                    <Button variant="ghost" className="mb-4">
                        ← Back to Home
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold">Privacy Policy</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Last Updated: February 13, 2026
                </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                <section>
                    <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
                    <p>
                        This Privacy Policy explains what information the RWAAN Staking Protocol (&quot;we,&quot; &quot;our,&quot; or &quot;the Protocol&quot;) collects and how it is used.
                    </p>
                    <p>
                        The Protocol is a set of smart contracts on BNB Chain. Staking activity — deposits, withdrawals, and referral links — is recorded permanently and publicly on that blockchain, independent of anything covered in this policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>

                    <h3 className="text-xl font-semibold text-foreground">2.1 Blockchain Data</h3>
                    <p>When you interact with the Protocol, the following information is recorded on the BNB Chain blockchain:</p>
                    <ul>
                        <li>Your wallet address</li>
                        <li>Transaction hashes and timestamps</li>
                        <li>Staking amounts and lock durations</li>
                        <li>Reward claims and withdrawals</li>
                        <li>Referral relationships (if applicable)</li>
                    </ul>
                    <p className="text-sm italic">
                        Note: This data is publicly accessible on the blockchain and cannot be deleted or modified by us.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">2.2 Technical Information</h3>
                    <p>We may collect technical information through our website interface:</p>
                    <ul>
                        <li>Browser type and version</li>
                        <li>Device information</li>
                        <li>IP address (anonymized when possible)</li>
                        <li>Usage patterns and interactions</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground">2.3 Information We Do NOT Collect</h3>
                    <p>We do not collect:</p>
                    <ul>
                        <li>Personal identification information (name, email, phone number)</li>
                        <li>Private keys or seed phrases</li>
                        <li>Banking or financial information</li>
                        <li>Biometric data</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">3. How We Use Information</h2>
                    <p>We use collected information to:</p>
                    <ul>
                        <li>Process and execute staking transactions</li>
                        <li>Calculate and distribute rewards</li>
                        <li>Improve the user interface and experience</li>
                        <li>Monitor and prevent fraudulent activity</li>
                        <li>Comply with legal obligations</li>
                        <li>Provide customer support</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">4. Third-Party Services</h2>
                    <p>Our Protocol may interact with the following third-party services:</p>

                    <h3 className="text-xl font-semibold text-foreground">4.1 RPC Providers</h3>
                    <p>
                        We use RPC providers to connect to the BNB Chain. These providers may log your IP address and transaction data.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.2 Wallet Providers</h3>
                    <p>
                        You connect to our Protocol using third-party wallet providers (e.g., MetaMask, WalletConnect). These providers have their own privacy policies.
                    </p>

                    <h3 className="text-xl font-semibold text-foreground">4.3 Blockchain Explorers</h3>
                    <p>
                        Transaction links may direct you to blockchain explorers (e.g., BscScan) which have their own data collection practices.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">5. Data Storage and Security</h2>
                    <p>
                        All staking data is stored on the BNB Chain blockchain, which is immutable and publicly accessible. We implement industry-standard security measures to protect any off-chain data:
                    </p>
                    <ul>
                        <li>Encrypted connections (HTTPS)</li>
                        <li>Secure smart contract architecture</li>
                        <li>Regular security audits</li>
                        <li>Limited data retention policies</li>
                    </ul>
                    <p className="font-semibold">
                        Important: You are responsible for securing your private keys and wallet credentials. We cannot recover lost or stolen private keys.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">6. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access blockchain data associated with your wallet address</li>
                        <li>Withdraw your staked tokens at any time (subject to lock-up periods)</li>
                        <li>Stop using the Protocol at any time</li>
                        <li>Request information about how your data is used</li>
                    </ul>
                    <p>
                        Note: Due to the decentralized nature of blockchain technology, we cannot delete or modify on-chain data.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">7. Cookies and Tracking</h2>
                    <p>
                        Our website may use essential cookies to improve functionality. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, though this may affect website functionality.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">8. International Users</h2>
                    <p>
                        The Protocol is accessible globally. By using the Protocol, you consent to the transfer and processing of data in jurisdictions where our services are hosted.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">9. Children&apos;s Privacy</h2>
                    <p>
                        The Protocol is not intended for users under the age of 18. We do not knowingly collect information from minors.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last Updated&quot; date. Continued use of the Protocol after changes constitutes acceptance of the updated policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-foreground">11. Contact Information</h2>
                    <p>
                        For questions or concerns about this Privacy Policy, please contact us through our official social media channels:
                    </p>
                    <ul>
                        <li>Twitter/X: <a href="https://x.com/RWAN_Official" target="_blank" rel="noreferrer" className="text-primary hover:underline">@RWAN_Official</a></li>
                        <li>Telegram: <a href="https://t.me/RWAN_Chat" target="_blank" rel="noreferrer" className="text-primary hover:underline">RWAN_Chat</a></li>
                    </ul>
                </section>

                <section className="border-t border-white/10 pt-8">
                    <p className="text-sm italic">
                        By using the RWAAN Staking Protocol, you acknowledge that you have read, understood, and agree to this Privacy Policy.
                    </p>
                </section>
            </div>
        </div>
    );
}
