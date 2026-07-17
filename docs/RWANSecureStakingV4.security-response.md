# RWAN V4 Security and Incident-Response Plan

## Purpose

This document records the current V4 behavior before security patches. It separates proven protections from known gaps and defines how operators should respond without placing principal at additional risk.

The executable evidence is in `test/RWANSecureStakingV4RiskScenarios.t.sol` and `test/RWANSecureStakingV4Audit.t.sol`.

## Assets and Security Invariants

Protected assets:

1. Active staking principal (`totalStaked`)
2. Staking reward reserve
3. Affiliate reward reserve
4. Rank reward reserve and already allocated rank rewards
5. Marketplace reserve and already allocated marketplace credits

Required invariants:

- Contract token balance must always cover `protectedTokenBalance(token)`.
- Administrative rescue must never transfer active principal.
- An allocated marketplace credit must never become treasury surplus.
- An allocated rank reward must never become treasury surplus.
- A position can be withdrawn only once and only by its recorded owner.
- Incident controls must preserve a principal-only user exit.
- Referral processing must remain bounded and cycle-free.
- No payout may consume a different accounting reserve.

## Trust Boundaries

| Role | Intended authority | Funds it can move | Main compromise risk |
| --- | --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | Grant and revoke every role | Indirectly all privileged paths | Complete governance takeover |
| `PAUSER_ROLE` | Global and selective incident stops | None directly | Freeze service or enable penalty-free emergency exits |
| `PARAMETER_ROLE` | Plans, rates, affiliate and rank configuration | None directly | Harmful economics, disabled plans, or incorrect user-rank refresh operations |
| `TREASURY_ROLE` | Withdraw unallocated reserves and recover surplus | Reward reserves and genuine surplus | Drain future reward capacity or misdirect rescued tokens |
| User | Manage only owned positions | Own principal and earned/allocated claims | Key compromise affects that user only |

Production roles should be separate multisigs. The deployer EOA should not retain roles. `DEFAULT_ADMIN_ROLE` should use the highest signing threshold; the emergency pauser should be faster but unable to move funds.

## Pause Matrix

| Operation | Global pause | Selective flag | Incident behavior |
| --- | --- | --- | --- |
| Stake | Blocked | `stakingPaused` | No new positions |
| Claim staking reward | Blocked | `claimsPaused` | Rewards cannot be claimed |
| Normal withdrawal | Blocked | `withdrawalsPaused` | If only claims are paused, principal withdrawal remains open and accrued rewards are preserved as claimable debt |
| Early withdrawal | Blocked | `withdrawalsPaused` | If only claims are paused, accrued rewards are preserved as claimable debt |
| Emergency withdrawal | Allowed | Requires `withdrawalsPaused` or global pause | Full recorded principal; no immediate reward; accrued reward debt remains claimable after claims resume; marketplace credit is released back to its reserve |
| Rank claim | Blocked | `rankRewardsPaused` | Rank distribution stops |
| Marketplace claim | Blocked | `claimsPaused` | Allocated credit remains protected |
| Fund a reserve | Allowed | None | Incident funding remains possible |
| Treasury reserve withdrawal | Blocked | None | Global pause freezes treasury outflows |
| ERC-20/native surplus rescue | Blocked | None | Rescue resumes after default admin resolves the incident and unpauses |
| Parameter changes | Blocked | None | Global pause freezes economic configuration |

The pause design prioritizes a principal-only escape hatch. Operators must understand that setting `withdrawalsPaused` also allows every user to bypass lock duration and early-withdrawal penalties through `emergencyWithdraw`.

## Fund Rescue Matrix

| Deposit type | Current recovery path | Safety condition | Current status |
| --- | --- | --- | --- |
| Unrelated ERC-20 sent by mistake | `recoverSurplusERC20` | `TREASURY_ROLE`; amount cannot exceed surplus | Recoverable |
| RWAN sent directly by mistake | `recoverSurplusERC20` | Only balance above all protected accounting can move | Recoverable if provably surplus |
| Active user principal | User `withdraw`, `withdrawEarly`, or `emergencyWithdraw` | Only position owner can exit | Not admin-rescuable by design |
| Unallocated staking/affiliate/rank/marketplace reserve | Reserve-specific treasury withdrawal | Cannot exceed that reserve bucket | Recoverable, but reduces payout capacity |
| Allocated rank reward | User rank claim | Included in protected balance | Treasury-protected |
| Allocated marketplace credit | Marketplace claim or settlement on position exit | Included in protected balance | Treasury-protected |
| Native BNB forced into contract | `recoverNative` | `TREASURY_ROLE`, nonzero recipient, sufficient balance, contract unpaused | Recoverable |
| NFT forced or transferred into contract | None | No ERC-721/ERC-1155 rescue function | Unsupported by design; no recovery path |
| Fee-on-transfer staking/reward token | Exact balance-delta validation rejects the transaction | Contract accounting is written only after an exact transfer | Rejected |
| Rebasing or behavior-changing token | No complete on-chain defense | Token behavior can change balances outside a staking call | Unsupported; validate RWAN implementation and governance |

For a mistaken direct RWAN transfer, operations must verify the transaction, sender, amount, and current surplus at the same finalized block. Rescue must go to the original sender, use a multisig transaction, and preserve an auditable incident record. A transfer is never attributable to a staking position unless it entered through `stake`.

## Incident Playbooks

### Suspected Contract Exploit

1. Guardian globally pauses the contract.
2. Frontend disables all transaction buttons except a clearly labeled emergency principal exit.
3. Record the incident block, balances, protected balances, reserves, allocations, active principal, and role holders.
4. Default-admin multisig revokes any suspected compromised role.
5. Do not withdraw reserves unless movement is required to prevent an identified loss; reserve removal can destroy users' reward capacity.
6. Reproduce the exploit against a fork at the incident block.
7. Verify `emergencyWithdraw` with a small controlled position before recommending broad use.
8. Resume only after a patched build, regression suite, external review, and multisig approval. If code safety is uncertain, deploy a replacement and migrate.

### Compromised Pauser

- Revoke `PAUSER_ROLE` using the default-admin multisig.
- A pauser cannot rescue tokens or modify parameters unless it also holds those roles.
- Review whether users used penalty-free emergency exits while withdrawals were paused.
- Rotate signers and guardian infrastructure before restoring normal state.

### Compromised Treasury

- Global pause immediately stops treasury reserve withdrawals and rescue operations.
- Default-admin multisig must revoke `TREASURY_ROLE` immediately.
- Snapshot every reserve and transfer made by the compromised account.
- Principal should remain protected by surplus accounting, but unallocated reward reserves can be withdrawn.
- Re-fund depleted reserves before claims resume; any clipped amount remains recorded as unpaid position debt.

### Compromised Parameter Admin

- Pause globally, then revoke `PARAMETER_ROLE`.
- Snapshot every plan, marketplace benefit, affiliate level, cap, rank, minimum, and emission budget.
- Existing positions preserve unlock time and reward rate. Existing rank members preserve their snapshotted weight until the admin explicitly refreshes them with `setUserRank`.
- Restore configuration from an approved manifest through the multisig.

### RWAN Token Incident

- Pause globally and stop frontend approvals immediately.
- Determine whether the token can blacklist, rebase, charge transfer fees, pause transfers, or be upgraded by an external administrator.
- Contract pause cannot protect funds from privileged behavior inside the token itself.
- If token transfers are unsafe, do not instruct users to emergency-withdraw until the token behavior is understood.

### Empty or Insolvent Reward Reserve

- Pause claims while reserve coverage is investigated. The patched logic preserves unpaid accrual as position debt when payment is zero or clipped.
- Fund the correct reserve and reconcile expected liabilities.
- Do not unpause until reserve coverage and the emission limiter have been checked.

## Patch Status and Residual Risks

| Severity | Finding | Impact |
| --- | --- | --- |
| Resolved | Exact transfer validation rejects fee-on-transfer staking and funding | Principal/reserve accounting is not written for a short transfer |
| Resolved | Per-position unpaid reward debt survives reserve and emission clipping | Users can claim the remainder after reserves/emission capacity recover |
| Resolved | Rank weight is snapshotted per user | Config changes affect future/refreshed assignments without corrupting aggregate weight |
| Resolved | Affiliate depth initializes to zero and payout loop checks array length | Empty initial configuration cannot break claims |
| Resolved | Global pause blocks treasury withdrawals, rescue, and parameter changes | Incident lockdown freezes privileged economic outflows and edits |
| Resolved | Withdrawals checkpoint rewards while claims are paused | Principal exits do not erase accrued rewards |
| Resolved | Native BNB rescue is treasury-gated and pause-aware | Forced BNB can be recovered after incident clearance |
| Accepted | No NFT rescue function | NFTs are unsupported and should not be sent to the staking contract |
| Residual | Upgradeable, rebasing, blacklistable, or behavior-changing RWAN token | External token governance can still affect solvency or exits |
| Residual | Default-admin compromise | Admin can grant itself every operational role; multisig separation remains mandatory |

## Monitoring and Alerts

Alert immediately on:

- Any role grant, role revoke, or role-admin change
- Global or selective pause changes
- Reserve withdrawal or surplus rescue
- Plan, duration, rate, penalty, marketplace, affiliate, rank, or emission changes
- Protected balance approaching actual token balance
- Any state where actual balance is below protected balance
- Affiliate or staking reserve exhaustion
- Rank allocated rewards approaching available balance
- Unusual spikes in emergency withdrawals
- Direct token transfers that do not correspond to funding or staking events

Monitoring must read both contract accounting and the actual token balance. Event monitoring alone cannot detect a rebase, fee-on-transfer deficit, or forced token transfer.

## Deployment Gates

V4 is not deployment-ready until:

1. Every High and Medium finding above is fixed or explicitly accepted by a multisig-signed risk decision.
2. Unit, aggressive, fuzz, invariant, static-analysis, and fork tests pass after patches.
3. The exact deployed RWAN token is tested for standard transfer semantics and administrative controls.
4. Role separation and role-renunciation transactions are rehearsed.
5. The frontend explains emergency behavior, preserved reward debt, and rank snapshot refreshes accurately.
6. Reserve funding and solvency monitoring are live before staking opens.
7. An independent external audit reviews the final bytecode-bound source and deployment configuration.

## Patched Test Evidence

The post-patch regression run completed with:

- 56 V4 tests passing across unit, aggressive, audit, risk-scenario, property-fuzz, fuzz, and invariant suites
- 13 dedicated incident and fund-rescue scenarios
- 2,048 randomized fuzz cases across eight properties
- Nine invariants with 128,000 handler calls each (1,152,000 total calls)
- Zero invariant reverts
- Aderyn scan of patched V4 only: zero High findings and ten Low detector categories

The former vulnerability proofs were converted into regression tests that assert corrected behavior. NFT recovery remains intentionally out of scope.
