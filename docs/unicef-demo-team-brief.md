# Galeon x UNICEF Demo Team Brief

## The objective

The evaluation team should leave believing three things:

1. Galeon is a functioning, open-source protocol whose live product matches its repository.
2. The team understands the limits of privacy, compliance, and humanitarian deployment.
3. UNICEF funding would validate the missing institutional layer: a credible ASP operating model, a sufficiently active approved deposit set, and a partner-run delivery workflow.

This is a technical evaluation, not a general investor pitch. The scoring is weighted toward the functioning product, repository alignment, proposal consistency, and how the team works together.

## Galeon in one sentence

Galeon is open-source privacy and compliance infrastructure for humanitarian programs that choose public-chain settlement: stealth addresses reduce receiver linkability, a ZK pool breaks the public deposit-to-withdrawal link, and an ASP is designed to control which deposits may use private withdrawal.

Galeon is not a donation platform, an enrollment system, a mobile-money replacement, a cash-out network, or proof that assistance reached an eligible person.

## Why privacy is a safety issue

The emotional center of Galeon is not privacy as convenience. In conflict-affected and otherwise high-risk settings, payment metadata can reveal relationships, routines, recipients, and communities. A public transaction graph can therefore become a protection risk even when no civil name is written on-chain.

Mateo owns this sentence in the opening:

> We built Galeon because, in high-risk settings, financial visibility is not abstract. A payment trail can expose relationships, routines, and communities. We treat privacy as part of safety while preserving the accountability humanitarian programs require.

Carlos should translate that motivation into precise technical boundaries: Ports reduce receiver linkability; the pool breaks the public deposit-to-withdrawal link; neither layer hides every address, amount, timing pattern, device, network record, or partner-held record. Fabio should connect the same point to partner safeguarding and operational controls.

Evidence available for Q&A, not all for the main deck:

- UNICEF's responsible-data work warns that group data can put entire communities, such as residents of a village, at risk: <https://www.unicef.org/innocenti/reports/responsible-group-data-children>
- UNICEF reports that HOPE has supported humanitarian cash transfers to more than 3.4 million crisis-affected families, showing the scale at which beneficiary-data controls must operate: <https://www.unicef.org/hope-hct/about>
- The 2022 ICRC breach compromised information concerning more than 515,000 highly vulnerable people, and the ICRC identified possible public disclosure as a protection risk: <https://www.icrc.org/en/document/sophisticated-cyber-attack-targets-red-cross-red-crescent-data-500000-people>

Strict boundaries:

- Do not claim that a public blockchain caused a kidnapping or other act of violence. We do not have evidence for that causal claim.
- Do not identify or recount a personal victim's story in the deck, repository, or Q&A without Mateo's explicit decision and appropriate consent.
- Do not use casualty or kidnapping counts as emotional leverage. They establish that conflict exists, not that Galeon would have prevented an incident.
- Do not say Galeon guarantees physical safety. It reduces specific forms of public linkability and must be combined with partner data protection, operational security, and safeguarding.

## The current truth everyone must know

| Topic       | What is true now                                                                          | What remains funded work                                                           |
| ----------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Deployment  | Native-MNT flow is live on Mantle mainnet                                                 | ERC-20 stablecoin deployment and validation in Q1                                  |
| Privacy     | EIP-5564 stealth payments and ZK private withdrawal work                                  | Privacy must be tested under realistic amounts, timing, gas, and partner workflows |
| ASP         | Contract and Merkle-root allowlist architecture exists; service auto-approves every label | Screening policy, review, appeals, escalation, and real filtering in Q2            |
| Onboarding  | Connected-wallet reference flow                                                           | Embedded onboarding and gas simplification in Q1                                   |
| Reporting   | Payment and tax-oriented Shipwreck exports                                                | Humanitarian and pilot-jurisdiction templates                                      |
| Users       | No external production users or humanitarian outcomes claimed                             | Partner sandbox, controlled pilot, and implementation/usability evaluation         |
| Open source | Public now: MIT apps/libraries; Apache-2.0 contracts/pool                                 | Community readiness, security process, documentation, and UNICEF attribution       |
| Evidence    | 537 automated tests; inherited 0xbow work has three Oxorio reports                        | External delta-audit of Galeon-specific changes and remediation                    |

## The institutional dependency

Do not describe this as simply needing "more money in the pool."

- **Accountable ASP governance:** a qualified operator must own the screening policy, updates, review, appeals, conflicts, and false-positive handling. During the funded period, Galeon under Cartagena On Chain is the proposed single operator; the rules are to be agreed with the implementing partner and jurisdiction-specific counsel.
- **A sufficiently active approved deposit set:** privacy strengthens with the number and diversity of approved deposits and with disciplined usage. A small, regular, or easily correlated pool weakens practical unlinkability. Pool balance alone is not the metric, and there is no honest universal threshold.
- **A real delivery system:** the implementing partner must own eligibility, consent, safeguarding, complaints, KYC where required, gas/accessibility decisions, and cash-out or merchant access.

The pitch to UNICEF is therefore not "our code needs a strong arm." It is: **the protocol works, but responsible humanitarian deployment requires an institutional anchor. UNICEF can bring partner access, safeguarding discipline, and the conditions for real-world validation that code alone cannot create.**

## The UNICEF-specific fit

UNICEF's own 2026 work makes the fit more concrete than a generic blockchain pitch:

- The Blockchain Ventures call explicitly asks for public-blockchain accountability using privacy-preserving approaches such as zero-knowledge proofs, together with reconciliation and anti-diversion controls.
- UNICEF describes its blockchain strategy as combining modular, open-source building blocks rather than expecting one company to replace the whole humanitarian cash stack.
- UNICEF's AidLink test combined beneficiary management, an EVM-compatible disbursement layer, an SMS wallet, and a mobile-money off-ramp. UNICEF reported that the transfers and off-ramp initiation were publicly traceable while beneficiary PII stayed off-chain.
- UNICEF's HOPE system already exists to protect beneficiary identity, registration, targeting, payment-cycle, grievance, and reporting data. Galeon should complement that type of protected system of record, not duplicate it.

The defensible proposition is:

> UNICEF has already shown that modular EVM cash-transfer infrastructure can work. Galeon tests an additional privacy-and-policy component for the public-chain leg: program settlement remains verifiable, while the direct deposit-to-withdrawal link is reduced. The beneficiary system of record, eligibility, support, and cash-out remain with the implementing partner.

Do not claim a current AidLink, HOPE, Rumsan, Xcapit, Kotani Pay, or UNICEF integration. Interoperability is a funded-period design and validation question, not a shipped feature or partnership.

Primary sources:

- <https://www.unicef.org/innovation/equity-free-funding-blockchain-solutions>
- <https://www.unicefventurefund.org/story/tech-outlook-2026-blockchain-building-blocks-scalable-impact>
- <https://www.unicefventurefund.org/story/insights-stablecoin-based-end-end-cash-transfer-platform-test>
- <https://www.unicef.org/documents/humanitarian-cash-operations-and-programme-ecosystem-hope>

## Presentation ownership

**Mateo is the designated speaker and host. Carlos owns the technical screens. Fabio has one concise business segment.** This follows Livia's instruction: one person introduces and speaks on behalf of the team, while domain owners intervene where useful.

Three speakers are acceptable because there are only four controlled handoffs. Nobody interrupts or adds an unplanned correction. During Q&A, Mateo names the owner before that person answers. The interaction goal is for all five members to answer at least once when a relevant question reaches their domain; it is not a reason to force five presentation segments.

### Strict roles

- **Mateo Daza — host, product, and frontend:** opens, introduces all five people, controls time, states the product boundary, frames UNICEF fit, routes Q&A, and closes.
- **Carlos Quintero — lead developer, backend, and protocol:** controls screen sharing, performs the demo, shows the repository and architecture, explains current versus planned technical controls, and owns security/privacy questions.
- **Fabio Anaya — growth and partnerships:** gives the short sustainability/partnership segment and owns partner discovery, deployment fit, and business-model questions.
- **Juan David Correa — operations:** owns delivery coordination, milestone tracking, compliance reporting, meeting logistics, and operational-risk questions. Do not introduce him as PM.
- **Juan José Sanfeliú — marketing and community:** owns partner communications, open-source community engagement, developer relations, and documentation/adoption questions.

Juan David and Juan Jose do not need forced presentation segments. They must be visible, introduced by Mateo, and ready to answer their assigned questions.

## Ten-minute choreography

Target a **9:00 stop**, leaving one minute for a technical failure or transition.

| Time       | Owner  | Beat                                                                                                                               |
| ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0:00-1:00  | Mateo  | One-minute company pitch on slide 1                                                                                                |
| 1:00-1:20  | Mateo  | Introduce all five members from slide 2                                                                                            |
| 1:20-1:45  | Mateo  | Privacy layers and how UNICEF can strengthen deployment on slide 3                                                                 |
| 1:45-5:20  | Carlos | Product walkthrough and one live private withdrawal from slide 4; no live deposit                                                  |
| 5:20-6:50  | Carlos | Public GitHub repository, major components, tests, audit boundary, licenses, and current/planned split using slides 5-6            |
| 6:50-7:35  | Mateo  | Institutional anchor: ASP governance, approved deposit participation, partner responsibilities, and UNICEF contribution on slide 7 |
| 7:35-8:05  | Fabio  | Partner-side sustainability hypotheses and honest partnership status on slide 8                                                    |
| 8:05-8:40  | Mateo  | Funded-year bridge and close on slide 8                                                                                            |
| 8:40-10:00 | Mateo  | Buffer; do not fill it unless recovery is needed                                                                                   |

### Handoffs

- Mateo to Carlos: "Carlos built the protocol backend with me and is our lead developer. He will show the live flow and then the exact repository components behind it."
- Carlos to Mateo: "That is the current product and its code boundary. Mateo will explain the institutional conditions we need to validate next."
- Mateo to Fabio: "The technology is only sustainable if institutions can operate and support it. Fabio will summarize the partner-side model we will test."
- Fabio to Mateo: "Those are hypotheses, not revenue we claim today. Mateo will close with what the funded year proves."

### Q&A routing for the interaction score

Mateo should not answer a teammate's domain for them. Use these handoffs when the panel opens the relevant subject:

- "Carlos, take the current-versus-planned technical boundary."
- "Fabio, take the partner-fit and sustainability side."
- "Juan David, take the operational gates, reporting, and stop/go decision."
- "Juan José, take open-source community readiness, documentation, and developer adoption."

The rehearsal goal is that all five answer at least one hostile question cleanly. In the actual meeting, relevance still wins: do not manufacture an unnecessary answer solely to make somebody speak.

## One-minute pitch

> In high-risk settings, financial visibility is not abstract: a public payment trail can expose relationships, routines, and communities. Humanitarian programs that choose public-chain settlement still need verifiable transfers. Galeon is open-source privacy and compliance infrastructure for that specific case. EIP-5564 stealth addresses give each payment a fresh destination, a zero-knowledge pool breaks the public deposit-to-withdrawal link, and an Association Set Provider is designed to admit only approved deposits to private withdrawal. We preserve settlement and program reconciliation without claiming that the chain proves eligibility, receipt, or outcomes. The native-asset protocol works today on Mantle mainnet; stablecoin deployment, real ASP screening, and a controlled humanitarian pilot are funded work. Mateo Daza and Carlos Quintero built Galeon, and Cartagena On Chain is the applicant and proposed funded-period operator.

Then introduce the team:

> Joining me are Carlos Quintero, our lead developer and protocol co-founder; Fabio Anaya, growth and partnerships; Juan David Correa, operations; and Juan José Sanfeliú, marketing and community. I lead product and frontend.

## Carlos's demo rules

1. Start from a fully signed-in, pre-warmed session and a pre-funded pool state.
2. Show the existing Port, prior payment, collection state, and balance. Do not create a Port or deposit live.
3. Execute only the private withdrawal live.
4. While the proof runs, explain that it authorizes withdrawal without revealing which approved deposit funded it.
5. On Mantlescan, point to the relayer in the `from` field. Say that the recipient address remains public and Galeon breaks the deposit-to-withdrawal link; it does not make the chain invisible.
6. State the two current limits without apology: the live pool uses native MNT, and the ASP service auto-approves today.
7. Move immediately to GitHub. Show the monorepo map, green CI, 537-test total, licenses, 0xbow boundary, and one explorer-verified contract.
8. Do not demonstrate or volunteer mergeDeposit. Its deployed verifier runs on development setup parameters (documented in packages/contracts/PROGRESS.md); it is out of demo scope and comes up only if directly asked — answered with the audit-boundary wording in Q25. Do not show source-code snippets in the slide deck; Livia asked for a repository walkthrough, so the repository itself is the evidence.

If the live transaction has not progressed after 45 seconds, switch to the pre-verified transaction and continue. A failed proof must not consume the code walkthrough.

## Original work and open source

Livia's "original content" item is about curriculum, media, or educational content. Galeon is software-only, so the correct answer is **not applicable**.

For code authorship, use this formulation:

> Mateo and Carlos wrote Galeon's application, integration, stealth-library, registry, API, and product-specific contract work. The Privacy Pool base contracts and circuits are inherited or adapted from 0xbow under Apache-2.0, and the repository uses normal open-source dependencies such as OpenZeppelin, Next.js, Hardhat, and Ponder.

Do not say "all code is original except 0xbow."

Mention open source once in the one-minute pitch. Carlos proves it during the repository walkthrough: MIT for apps and libraries; Apache-2.0 for contracts and the pool. Do not spend pitch time reading license names.

## Business and partnership line

Fabio gets 30 seconds:

> We have no humanitarian pilot partner or current revenue to claim today. The funded period tests three partner-side sustainability hypotheses: paid hosting and support, ASP operation or attestation services, and reporting or integration support. No beneficiary withdrawal fee is assumed. Our Q1 partner discovery tests deployment fit, local delivery and cash-out, safeguarding requirements, and whether an institution is prepared to govern the ASP process.

## Adversarial Q&A

### Product and proof boundary

**1. What exactly works today? — Carlos**  
The connected-wallet native-MNT flow is deployed on Mantle mainnet: Ports, stealth-address payments, collection, pool deposit, client-side proof generation, relayed private withdrawal, indexing, and current Shipwreck exports. Stablecoin deployment and real ASP filtering remain funded work.

**2. Why is the stablecoin pool not live? — Carlos**  
The ERC-20 pool is built and tested, but mainnet deployment and validation are sequenced in Q1 before the Galeon-specific audit freeze. We will not present native MNT as a humanitarian cash product.

**3. Does Galeon prove that aid reached an eligible person? — Mateo**  
No. It proves settlement, contract-rule execution, and a valid private withdrawal against a pool and ASP root. Eligibility, wallet control, receipt, cash-out, and outcomes remain partner responsibilities.

**4. Who uses Galeon today? — Mateo**  
There are no external production users or humanitarian outcomes to claim. The protocol works end to end; the funded year is designed to validate the first partner deployment.

**5. Why blockchain instead of mobile money? — Mateo**  
Use mobile money where it already meets reach, cost, control, and audit needs. Galeon fits only where a program has a documented reason for public-chain settlement and cannot accept the resulting public transaction graph.

### Privacy and pool viability

**6. Is the withdrawal anonymous? — Carlos**  
Do not use that absolute. The proof breaks the public deposit-to-withdrawal link, but timing, amounts, gas funding, recipient addresses, RPC logs, and partner records can still create correlations.

**7. Is the anonymity set large enough? — Carlos**  
Not for a claim of strong production anonymity today. Privacy strengthens with a larger and more diverse approved deposit set. The pilot must measure realistic correlation risk rather than convert a testnet-style metric into a safety claim.

**8. How much pool activity is enough? — Carlos**  
There is no universal honest number. It depends on the threat model, amount patterns, timing, participant diversity, and operational behavior. Minimum deployment criteria will be agreed before beneficiary use; if they are not met, we do not claim the pool provides the required protection.

**9. So do you just need more funds in the pool? — Mateo**  
No. Balance alone is not the metric. We need a sufficiently active and diverse set of approved deposits, credible ASP governance, and a real partner delivery workflow. Manufactured liquidity would not solve correlation risk.

**10. What does the relayer learn? — Carlos**  
It receives the transaction needed to broadcast the withdrawal and can observe network metadata. It cannot change a valid proof or redirect funds, but metadata and availability remain risks. The recipient address is still public.

**11. Can the relayer censor users? — Carlos**  
The current service can refuse to relay, so we should call that an availability risk. The contract path and recovery design limit custody risk, but decentralized relaying is not a funded-period claim.

### ASP and compliance

**12. The ASP approves everything. Why call this compliance-ready? — Carlos**  
The contract-level association-set architecture exists; the operational filter is explicitly a placeholder. Q2 defines and implements the real process with the partner and counsel. We say "designed for policy controls," not "compliant today."

**13. What is screened: a beneficiary or a label? — Carlos**  
The contract generates a deposit label and separately records the depositor address. Screening evaluates the associated depositor address; an approved label is included in the Merkle tree used for private withdrawal. Civil identity is not required by the contract.

**14. Who sets the ASP rules? — Mateo**  
They are not pre-decided in the proposal. Screening criteria, update cadence, review, appeals, escalation, and processor choices are Q2 design decisions with the implementing partner and jurisdiction-specific counsel.

**15. Is a single ASP operator a central point of control? — Carlos**  
Yes. During the funded period Galeon under Cartagena On Chain is the proposed single operator. The pilot must test accountability, conflicts, false positives, and operating burden rather than pretend decentralization is solved.

**16. What happens on a false positive? — Carlos**  
Exclusion prevents private withdrawal through the approved set. The depositor retains the contract-level public ragequit path to the original deposit address, so deposited funds are recoverable even though private withdrawal is lost for that deposit.

**17. Could WFP or UNICEF operate the ASP? — Mateo**  
A future institutional deployment could let a qualified organization operate or co-govern an ASP. Call it an ASP operator or institutional attestor, not a validator node. There is no current WFP or UNICEF partnership or funded-period commitment to that model.

**18. What happens if no credible institution will operate it? — Mateo**  
Then Galeon should not be deployed for that program. The ASP operating model is a deployment gate, not an optional growth feature.

### Humanitarian operations and data protection

**19. Can children use Galeon directly? — Fabio or Mateo**  
It is not designed for direct child use. The partner owns enrollment, consent or guardian processes, safeguarding, complaints, and assisted access. The children's DPIA and planned program controls are gates before a beneficiary pilot.

**20. Who handles KYC, cash-out, lost access, and sanctions mistakes? — Fabio**  
The partner owns beneficiary identity, KYC where required, last-mile delivery, and recovery procedures. Galeon owns the protocol and ASP operating responsibilities agreed for the pilot. These dependencies are scoped before beneficiary use.

**21. What personal data does Galeon process? — Mateo**  
Pseudonymous wallet and Port records, transaction data, and encrypted viewing-key material for payment detection. These may become personal data when linked with partner records. A planned embedded-wallet provider would process recovery email under a DPA.

**22. How do you handle immutable on-chain data and erasure? — Mateo**  
We do not promise deletion from the chain. The DPIA must minimize on-chain metadata and focus erasure on off-chain records and linkability. On-chain identifiers remain a data-protection consideration.

**23. Do you have a pilot partner? — Fabio**  
No signed LOI is claimed. Q1 discovery is a milestone because the partner, jurisdiction, delivery rail, language, and safeguarding conditions must be validated rather than invented in advance.

### Engineering and open source

**24. How do the product and repository align? — Carlos**  
The demo uses the deployed frontend, API, indexer, stealth package, contracts, pool SDK, and shared configuration in the public monorepo. Carlos will show those exact components and their CI.

**25. How secure is it? — Carlos**  
There are 537 automated tests across contracts, API, stealth, and indexer. The inherited 0xbow work has three Oxorio reports. Galeon-specific contracts, integrations, upgrades, ASP changes, and the stealth library still require the scoped external delta-audit and remediation. If pressed on circuits specifically: the inherited withdrawal/ragequit/commitment circuits carry upstream's audits and public trusted-setup ceremony; Galeon's added mergeDeposit circuit currently uses development setup parameters and sits outside both — prototype-grade until it receives an audited circuit and public ceremony, or is replaced by an appropriately assured V2 path. Never say "every circuit is audited," and never call the mainnet system production-ready for beneficiary funds.

**26. Was the code AI-generated? — Carlos**  
AI assistance was limited to boilerplate, tests, and UI work as disclosed. Contracts, circuits, and cryptographic primitives were not AI-generated; both founders review merges. Do not treat the test count as proof of security.

**27. What did your team actually build? — Carlos**  
Mateo and Carlos built the Galeon-specific application, integrations, stealth library, registry, API, and product-specific contracts. The privacy-pool base and circuits derive from 0xbow, with other normal open-source dependencies disclosed in the repository.

**28. What is open source? — Carlos or Juan Jose**  
The repository is public now. Apps and libraries are MIT; contracts and pool components are Apache-2.0. Funded components remain under OSI-approved permissive licenses, with Q2 focused on contributor and security readiness. One precision if probed hard: one Galeon-added circuit source (mergeDeposit.circom) currently sits untracked inside the upstream submodule, so a fresh public clone gets its compiled artifacts but not that source file; tracking it publicly is queued (deploy freeze this week). Say "the repository is public and we are closing one packaging gap on an added circuit source" — never "every line is public."

### Team, sustainability, and UNICEF fit

**29. Why are five people needed if two built the product? — Mateo**  
Mateo and Carlos carry engineering. Humanitarian deployment also requires partner coordination, operational tracking and reporting, documentation, community support, and communications. The roles are distinct; the grant is not presented as five full-time engineering salaries.

**30. Can two engineers deliver the workplan? — Mateo**  
The plan deliberately front-loads engineering hardening and audit remediation, limits the pilot, keeps one pilot language, and leaves partner-owned functions outside the product. External audit and legal review are budgeted; broad decentralization and multi-ASP work are not in scope.

**31. How will Galeon make money? — Fabio**  
We are testing partner-supported hosting and support, ASP operation or attestation services, and reporting or integration support. These are hypotheses; there is no revenue claim today and no assumed beneficiary withdrawal fee.

**32. Who owns and operates Galeon? — Mateo**  
Mateo and Carlos built Galeon. Cartagena On Chain is the Colombian applicant and proposed funded-period operator. The applicant must document its rights to maintain and license funded contributions; open-source licensing does not eliminate that responsibility.

**33. Why UNICEF? — Mateo**  
UNICEF is already combining modular, open-source components for EVM-compatible cash transfers and has identified public-ledger accountability plus privacy-preserving technology as a priority. The missing work is not another generic crypto feature: it is testing whether Galeon can become a responsible privacy-and-policy component alongside a protected beneficiary system, partner delivery, and cash-out. UNICEF is positioned to enforce the child-data safeguards, accountable ASP governance, controlled deployment, and open-source public value that this test requires.

**34. What would make you stop a pilot? — Juan David or Mateo**  
No viable partner delivery or cash-out path; unresolved legal or DPIA findings; inadequate ASP governance; failed audit remediation; insufficient privacy conditions; safeguarding or incident-response gaps; or usability that creates unacceptable support or exclusion risk.

**35. What does success at month 12 mean? — Juan David**  
A reviewed stablecoin deployment, real ASP process, completed privacy and safeguarding gates, a controlled partner pilot with documented limitations, measured usability and incident burden, maintained open-source artifacts, and a defensible decision on whether and where to continue.

### Competitive landscape (July 2026 fact-check; keep out of the pitch, Q&A only)

**36. Mercy Corps and Aleo are already running privacy-preserving aid in Colombia. Why fund you? — Mateo, Fabio on the partnership angle**  
Treat it as validation, not collision. Mercy Corps Ventures, the Danish Refugee Council and Humanity Link are piloting USDCx on Aleo with roughly 300 participants in Norte de Santander — evidence the sector wants privacy-preserving cash. The architectures differ: their privacy lives on a privacy-native chain and applies only while funds remain on Aleo, with compliance records designed for monitoring and selective disclosure. Galeon tests the distinct public-EVM case — privacy at the payment layer on transparent rails, an association-set gate an accountable institution can govern, and a public ragequit path. Both experiments should exist; the funded year decides whether the public-EVM version gets field evidence too. Do not disparage the pilot and do not speculate about who can access their compliance records.

**37. Cloaked already combines stealth addresses with privacy pools — and your upstream 0xbow shipped V2 with payment requests. What is left for Galeon? — Carlos/Mateo**  
Concede the movement; both are real. Cloaked is a hosted consumer wallet pairing stealth receiving with 0xbow's pools — the closest technical overlap to date. Galeon is open-source, partner-operable infrastructure with humanitarian controls: Port-level provenance on every pool deposit, program reconciliation, and an ASP governance model designed for an accountable institution — differentiation comes from those controls and deployability, not primitive novelty. 0xbow's V2 ceremony is complete, with private-transfer circuits and testnet payment requests; we treat 0xbow as upstream and a likely migration or federation path, not a competitor — we would rather join a credible ASP ecosystem than run a parallel one. What nobody ships for humanitarian programs is the intake-to-reconciliation workflow; that is the funded work. Do not name any competitor's screening vendor.

**38. UNICEF already has AidLink. Why fund Galeon? — Mateo**  
AidLink validates the modular EVM approach: beneficiary management, disbursement, SMS access, and mobile-money off-ramp can work together. UNICEF also reported that the pilot's on-chain disbursement and off-ramp initiation were publicly traceable. Keeping PII off-chain is necessary, but a public wallet can still become attributable when enrollment, support, or cash-out records are correlated. Galeon does not replace AidLink or HOPE; it tests whether a privacy-and-policy module can reduce public transaction-graph exposure while preserving program-level settlement evidence.

**39. Can Galeon integrate with AidLink or HOPE today? — Carlos, then Fabio**  
No integration or partnership is claimed. Galeon's contracts and service interfaces are EVM-oriented, so the architecture is compatible in principle with a modular disbursement stack, but actual identity boundaries, wallet control, reporting, cash-out, safeguarding, and support workflows must be designed with the implementing partner. That integration decision belongs in partner discovery and the staff sandbox before any beneficiary pilot.

## Phrases that lose credibility

Never say:

- "Stablecoin is live" — the live pool is native MNT.
- "Compliant today" — the ASP auto-approves today.
- "Decentralized ASP" or "ASP nodes" — one operator is planned during the funded period.
- "Anonymous," "untraceable," or "complete privacy."
- "No personal data" — pseudonymous data may become personal when linked.
- "We prove aid reached real people."
- "All code is original except 0xbow."
- "UNICEF/WFP is a partner" or "WFP will run a node."
- "We have users/revenue" unless documentary evidence changes before the call.
- "The pool just needs more money" — say active, diverse, approved deposit set.
- "We beat mobile money" or "we are better than Building Blocks."
- "Every circuit is audited" — inherited circuits carry upstream assurance; the added mergeDeposit circuit runs on development setup parameters and does not.
- "Production-ready for beneficiary funds" — the mainnet system is a working demonstration; the pilot gates come first.
- "No server can see payments" — the backend holds encrypted viewing keys and scans announcements, so it can observe inbound relationships. Spending authority stays client-side; say that instead.
- "We are the only ones combining stealth addresses with a privacy pool" — Cloaked ships that combination; Fluidkey ships stealth payment links at scale. Only the narrow claim survives: open-source, partner-operated infrastructure integrating per-payment receive addresses, association-set settlement, and program reconciliation.
- Unsourced competitor specifics (another product's screening vendor, user counts stated as fact) — attribute or omit.

## Day-of control

- All five join Teams by **15:40 CEST / 08:40 Colombia**; Carlos joins from the demo machine earlier if possible.
- Carlos is the only screen sharer. Mateo keeps a local copy of the PDF and the verified withdrawal transaction URL.
- Everyone uses the same names and roles as this brief. Cameras on for the introduction; mute when not speaking.
- Mateo keeps a visible timer and calls the demo cut at 5:40 even if a technical step is incomplete.
- Send the background deck on the existing email thread at least six hours before the meeting; send the PDF for rendering reliability and keep the PPTX locally for presentation.
- Rehearse once for timing and once as an adversarial Q&A. The goal is coordinated truth, not memorized wording.
- Morning of the demo: a two-minute check of scopelift.co/blog / @UmbraCash and 0xbow's channels — an Umbra v2 launch or a 0xbow V2 mainnet announcement inside the demo window would date-shift the answers in Q36-37.
