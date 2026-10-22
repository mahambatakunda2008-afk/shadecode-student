# Support Payments — Provider Readiness Gate
**Updated:** 2026-10-22  
**Status:** UI committed; live payment integration blocked on merchant onboarding and settlement eligibility.

## What is already in the app
- `/support` provides a voluntary contribution amount picker and custom amount input.
- Settings includes a Support Shadecode entry.
- Checkout remains deliberately disabled. No card details, EcoCash PINs, or money are collected by the UI.

## Provider evidence and implications

### Paynow Zimbabwe
Official integration-key setup: https://developers.paynow.co.zw/docs/paynow/integration_generation/

Paynow's documented setup requires the account holder to configure bank account details for receiving payments before creating an advanced integration. Payment methods are selected for the integration, and the integration key must remain secret. Paynow supports a hosted payment flow and sends status updates to the merchant's server; the server must verify status before marking a contribution paid.

**Gate:** Do not choose Paynow for production until Shadecode has an eligible receiving bank account and the merchant account is approved/configured.

### EcoCash Online Payments
Official Online Payments guide: https://developers.ecocash.co.zw/docs/online-payments  
Official go-live guide: https://developers.ecocash.co.zw/docs/go-live

EcoCash Online Payments can collect from a customer's EcoCash wallet into a merchant account. The guide requires a live EcoCash merchant code and merchant MSISDN for go-live. Production access is reviewed and is not automatic; sandbox cases and merchant details must be completed first.

**Gate:** A personal EcoCash wallet alone must not be assumed to qualify. Confirm the registered merchant account, merchant code/MSISDN, and settlement arrangement before building or enabling production checkout.

## Safe next implementation sequence
1. Keep the support UI visible, but checkout disabled.
2. Confirm which legal/merchant identity will receive contributions and which account can receive settlements.
3. Obtain the selected provider's merchant approval and sandbox/live credentials.
4. Store secrets only in server-side environment variables; never expose them with `NEXT_PUBLIC_*`.
5. Implement server-side contribution creation, a unique internal reference, amount/currency validation, provider callback verification and status lookup.
6. Mark a contribution confirmed only after the server verifies the provider's authoritative status and expected amount/reference.
7. Make callback processing idempotent; handle pending, cancelled, failed, duplicate, reversed and refunded transactions.
8. Test success and failure paths in sandbox, then enable production only after a complete end-to-end test.

## Product safeguards
- Contributions remain optional. Never gate core learning, XP, grades, rankings, or school access on donations.
- Show currency, amount, fees and recipient before the user authorizes payment.
- Never ask users for their EcoCash PIN or card security code in Shadecode.
- Do not expose donor names or amounts publicly without explicit consent.
- Keep payment status and receipts separate from learning progress.

## Current decision
**No live provider selected yet.** Paynow and EcoCash are candidates, not confirmed integrations. Settlement eligibility is a prerequisite, not a detail to guess around.
