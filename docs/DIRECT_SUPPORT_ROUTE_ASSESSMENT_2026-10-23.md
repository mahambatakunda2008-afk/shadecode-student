# Direct Support Route Assessment
**Updated:** 2026-10-23  
**Status:** Decision preparation only. No payment details published, no money collected, and no live payment integration enabled.

## Direction being evaluated

Prefer a low-cost, direct support route before building a merchant checkout. The first candidate is a voluntary direct EcoCash transfer with manual reconciliation. This is distinct from EcoCash Online Payments, which is a merchant API and requires a live merchant code and merchant MSISDN.

## What the official documentation confirms

- EcoCash customer terms list transfers between EcoCash subscribers and payments to merchants as separate transaction types.
- The same terms state that a wallet holder must be the sole owner of the e-money in the wallet and may not operate their wallet on behalf of others. They also reserve the right to restrict or suspend a wallet for suspected fraud, misrepresentation, or use inconsistent with KYC details.
- EcoCash Online Payments is designed to collect from a customer's wallet into a **merchant account**. Its official API guide lists a live merchant code and merchant MSISDN as go-live prerequisites.
- The public documentation does not, by itself, establish that using a personal wallet as a public product-support collection point is permitted for this specific use case.

Official sources:
- EcoCash customer terms: https://ecocash.co.zw/terms-and-conditions/
- EcoCash Online Payments: https://developers.ecocash.co.zw/docs/online-payments
- EcoCash developer portal: https://developers.ecocash.co.zw/

## Recommendation

Proceed with **preparing** the direct-transfer experience, but do not publish a personal EcoCash number or describe the route as approved until EcoCash confirms whether voluntary support for an online software project may be received into a personal wallet and what limits, labels, and records apply.

This is a provider-eligibility check, not a demand to create a merchant account. Ask EcoCash support:
1. Whether an individual can receive voluntary contributions for an online software project through ordinary subscriber-to-subscriber transfers, without merchant checkout.
2. Whether publicly displaying the wallet number in the app or website changes the account's permitted use.
3. Any transaction/value limits, charges, record-keeping, tax, or account-type requirements for this pattern.
4. Whether there is an approved direct-transfer or personal fundraising route that does not require merchant API integration.

Do not work around a negative answer by using another person's wallet or bank account. The account holder must understand and explicitly approve any proposed arrangement, and the provider must permit it.

## Safe first-release UX if the route is approved

- Label it **Voluntary direct support** and state that it is a manual transfer, not an in-app checkout.
- Display the approved recipient name and payment identifier only after the account owner explicitly approves publication.
- Let supporters choose an amount, but show currency and any known transfer fees before they leave the page.
- Provide a unique reference or clear reference instructions if the provider permits this use.
- Do not collect PINs, OTPs, passwords, or card security details.
- If a supporter submits a transaction reference, treat it as **pending review**, not proof of payment. A screenshot is not authoritative verification.
- Confirm receipt only after the wallet owner independently verifies the incoming transaction. Do not imply automated verification.
- Minimize stored data; do not require students to create an account or disclose learning data to contribute.
- Contributions remain optional and never affect lessons, marks, XP, ranks, or access to core learning features.
- Provide a clear correction/refund contact path and a privacy notice before collecting supporter details.

## Implementation status and release gate

- Existing `/support` page has amount selection, but checkout is disabled.
- No personal wallet number or recipient name has been added to the repository.
- No payment has been initiated or verified by Shadecode.
- Do not enable a live button until provider permission, recipient approval, exact currency/fees, and the manual reconciliation process are settled.
- Keep automated payment status separate from manual claims; never label a supporter as confirmed based only on browser state, user-submitted reference, or screenshot.
- Reassess whether a provider-hosted/merchant route is required if EcoCash says personal-wallet collection is not permitted.

## Next operational step

Contact EcoCash using an official support channel and retain the answer. Once eligibility is clear, update the UX and release checklist to match the approved route. Do not share private account identifiers in GitHub issues or commit them to source control.
