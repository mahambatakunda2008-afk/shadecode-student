# Support Payments — Provider Readiness Gate
**Updated:** 2026-10-23  
**Status:** UI committed; live payment integration blocked on merchant onboarding and settlement eligibility.

## What is already in the app
- `/support` provides a voluntary contribution amount picker and custom amount input.
- Settings includes a Support Shadecode entry.
- Checkout remains deliberately disabled. No card details, EcoCash PINs, or money are collected by the UI.

## Provider evidence and implications

### Paynow Zimbabwe
Official integration-key setup: https://developers.paynow.co.zw/docs/paynow/integration_generation/

Paynow's documented setup requires the account holder to configure bank account details for receiving payments before creating an advanced integration. Payment methods are selected for the integration, and the integration key must remain secret. Paynow supports a hosted payment flow and sends status updates to the merchant's server; the server must verify status before marking a contribution paid.

The public merchant FAQ says Paynow can settle into a Zimbabwean bank account and accepts EcoCash as a payment method, with local mobile-money settlements typically processed one day after payment or escrow clearance. It also says non-verified merchant accounts are settled weekly on Tuesday. This is general public guidance, not approval of Shadecode's particular setup.

**Gate:** Do not choose Paynow for production until Shadecode has an eligible receiving bank account and the merchant account is approved/configured.

### EcoCash Online Payments
Official Online Payments guide: https://developers.ecocash.co.zw/docs/online-payments  
Official go-live guide: https://developers.ecocash.co.zw/docs/go-live  
Developer portal: https://developers.ecocash.co.zw/

EcoCash Online Payments can collect from a customer's EcoCash wallet into a merchant account. Its guide requires a live EcoCash merchant code and merchant MSISDN for go-live. The customer authorizes the transaction in EcoCash. Shadecode must never request or store the customer's EcoCash PIN. A unique client correlator/reference is required to track a payment, and transaction lookup/notification should be used to reconcile status.

The developer portal says developer registration and sandbox access are free, no real money moves in sandbox, and merchant/KYC details are collected when requesting production access. Production is not automatic: EcoCash reviews merchant details and test coverage before issuing production credentials. This means we can prepare and validate an integration in sandbox before the live merchant decision, but sandbox success does not authorize live payments.

**Gate:** A personal EcoCash wallet alone must not be assumed to qualify. Confirm the registered merchant account, merchant code/MSISDN, and settlement arrangement before enabling production checkout.

## Provider comparison and decision
| Question | Paynow | Direct EcoCash Online Payments |
|---|---|---|
| Can supporters pay from EcoCash? | Public merchant FAQ lists EcoCash as a supported customer payment method | Yes, by design |
| Settlement | Paynow says it settles to a Zimbabwean bank account; eligibility/account ownership still needs confirmation | Funds go to the merchant account; exact merchant onboarding/settlement arrangement must be approved |
| Can sandbox work begin before live approval? | Depends on account/integration access | Developer portal says free sandbox access is available; live credentials require merchant approval |
| Main blocker | Confirm individual/unincorporated eligibility and acceptable settlement account | Obtain eligible merchant account and pass go-live review |
| Current recommendation | **Ask first** because one integration may support several local payment methods | **Prepare sandbox only** as a technical fallback; do not enable live payments |

## Safe next implementation sequence
1. Keep the support UI visible, but checkout disabled.
2. Confirm which legal/merchant identity will receive contributions and which account can receive settlements.
3. In parallel, prepare a sandbox-only EcoCash test harness with fake/sandbox credentials, without connecting it to the live Support button or accepting real payments.
4. Obtain the selected provider's merchant approval and sandbox/live credentials.
5. Store secrets only in server-side environment variables; never expose them with `NEXT_PUBLIC_*`.
6. Implement server-side contribution creation, a unique internal reference, amount/currency validation, provider callback verification and status lookup.
7. Mark a contribution confirmed only after the server verifies the provider's authoritative status and expected amount/reference.
8. Make callback processing idempotent; handle pending, cancelled, failed, duplicate, reversed and refunded transactions.
9. Test success and failure paths in sandbox, then enable production only after a complete end-to-end test and provider approval.

## Product safeguards
- Contributions remain optional. Never gate core learning, XP, grades, rankings, or school access on donations.
- Show currency, amount, fees and recipient before the user authorizes payment.
- Never ask users for their EcoCash PIN or card security code in Shadecode.
- Do not expose donor names or amounts publicly without explicit consent.
- Keep payment status and receipts separate from learning progress.

## Current decision (updated 2026-10-23)
The founder has a **personal EcoCash wallet**. The founder's sister is willing to help with a bank account, but merchant eligibility and settlement permission have not yet been confirmed.

### Recommended next route: verify Paynow eligibility first
Current official Paynow pages indicate that ordinary merchants can receive settlement into a Zimbabwean bank account and that local-only payment methods (including EcoCash) do not require a ZIMRA BP number at signup. Paynow's terms also require an eligible banked individual or company with legal capacity; individuals must be at least 18. These points do **not** establish that another person's bank account may be used for this merchant, so confirm directly with Paynow before proceeding. Sources:
- https://www.paynow.co.zw/home/merchanttutorial
- https://www.paynow.co.zw/Customer/Register
- https://www.paynow.co.zw/Home/Terms

1. Ask Paynow whether Shadecode can register as an unincorporated sole proprietor/individual for local-only payments, and what name should appear to supporters.
2. Ask whether settlements must go to a bank account in the merchant's own name. If yes, do not use the sister's account as a workaround; consider opening an eligible account in the merchant's name or using a formally approved arrangement.
3. Ask which identity, trading-name, tax and business details are required at the current stage.
4. Ask whether the Paynow integration can accept EcoCash as a customer payment method while settling to the approved bank account. Do not assume this is enabled by default.
5. Do not enter the sister's bank details, submit identity documents, or configure live credentials until she has reviewed the provider's requirements and explicitly agreed to the exact arrangement.
6. Keep direct EcoCash Online Payments as a later option unless/until an eligible EcoCash merchant account is available.

### Current decision
**Provider onboarding investigation: Paynow first; EcoCash Online Payments second. EcoCash sandbox research/preparation can proceed in parallel. No live provider selected and no live checkout enabled.** A personal EcoCash wallet is not a merchant account. A willing relative's bank account is not automatically an eligible merchant settlement account. Public guidance suggests an individual may be eligible for local-only payments if the conditions are met, but Shadecode must get confirmation about the account holder and business identity. Provider approval and transparent consent are mandatory before implementation.
