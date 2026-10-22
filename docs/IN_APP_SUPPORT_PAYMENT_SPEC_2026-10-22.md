# In-App Support — Product and Payment Specification
**Date:** 2026-10-22  
**Status:** Product decision/specification; not yet implemented or connected to live payments.

## Product decision

Support must be completed from inside Shadecode Student with as little friction as possible. A supporter should not have to email the founder, copy account details manually, or leave the product to understand the process. The payment provider may securely present its own authorization screen or app handoff when required; the user should return to Shadecode with a clear verified result.

## Intended supporter journey

1. Open **Support Shadecode** from a persistent but unobtrusive app entry point (for example, Settings/Profile and About; consider a dashboard link only if it does not distract from learning).
2. Enter any permitted contribution amount, or choose a suggested amount. The amount is optional and editable.
3. Select an available payment method (for example, EcoCash/mobile money or card) based on the live provider integration and the user's eligibility.
4. Review the exact amount, currency, any fees, and that the contribution is voluntary.
5. Tap **Continue to secure payment**.
6. Complete the payment authorization in a provider-hosted checkout, USSD/PIN prompt, wallet, or secure payment interface. Shadecode must never ask for or store a wallet PIN or card security details.
7. Return to Shadecode to a **Verifying payment** state.
8. The server verifies payment status with a trusted provider response, signed callback/webhook, or server-to-server status lookup.
9. Show **Contribution confirmed** only after server-side verification. If pending, show **Still checking** and allow safe status refresh. If failed/cancelled, explain that no confirmed contribution was recorded and allow retry. Never falsely show success because the browser returned to the app.
10. Optionally offer a receipt/reference and an opt-in thank-you badge. Never publish donor identity or amount without explicit consent.

## Amount and currency

- Support custom amounts with strict server-side validation for numeric, positive, allowed-precision values and provider limits.
- Show currency explicitly (e.g. USD or ZWG only if the selected provider and merchant account support it).
- Display minimum/maximum amounts based on verified provider constraints, not guessed values.
- Do not silently convert currencies or add fees. Disclose fees and the final amount before the supporter confirms.
- Suggested amounts are convenience shortcuts, not pressure tactics. Never use guilt language or fake urgency.
- Do not enable recurring contributions until the provider, consent, cancellation, and receipt flows are verified. One-time contributions are the first release.

## Architecture and security

- Keep payment provider credentials in server-side environment variables or a managed secret store; never expose them to the browser or commit them.
- Create a unique internal contribution ID and idempotency key before initiating a transaction. Store the expected amount, currency, provider reference, status, and timestamps with minimal personal data.
- Use a server route/server action to create the provider transaction. Never trust a client-supplied amount without server validation.
- Verify callbacks/signatures and, where supported, confirm by server-to-server transaction lookup. Browser redirects alone are not proof.
- Handle duplicate, delayed, out-of-order, cancelled, failed, reversed, and refunded events idempotently.
- Never store card PAN/CVV, wallet PIN, or unnecessary sensitive payment details. Use hosted checkout or provider-controlled authorization.
- Apply database RLS and server-side authorization to contribution records. Do not expose one user's transaction history to another.
- Do not grant academic XP, marks, rank, learning access, or exam advantages for contributing.
- Include an accessible failure path, support contact, and clear explanation of pending states.
- Do not log secrets, payment credentials, or full sensitive payloads.

## Zimbabwe payment discovery

Candidate routes to assess, subject to account eligibility, merchant approval, fees, currencies, and settlement requirements:

- **Paynow Zimbabwe:** supports hosted/payment-link and server-to-server integration patterns; payment methods and go-live status depend on merchant configuration.
- **EcoCash Open API:** offers an online-payment flow and sandbox; production requires a live merchant code/merchant details and approval/certification.
- **Pesepay:** documents hosted redirect checkout and a seamless integration option; verify merchant eligibility and fees.
- **ZB Smile&Pay:** documents hosted/API checkout and several payment methods; verify onboarding requirements.

Do not assume any provider is already configured or that the project can receive live money today. Compare onboarding, account ownership, production approval, supported currencies, settlement destination, fees, callbacks, refund/reversal support, and mobile usability. Prefer a hosted checkout to reduce sensitive-data handling and implementation complexity.

Official documentation starting points:
- EcoCash developer portal: https://developers.ecocash.co.zw/
- EcoCash online payments: https://developers.ecocash.co.zw/docs/online-payments
- Paynow Zimbabwe developer hub: https://developers.paynow.co.zw/docs/paynow/quickstart/
- Paynow merchant FAQ: https://www.paynow.co.zw/home/merchanttutorial
- Pesepay getting started: https://developers.pesepay.com/getting-started/overview/
- ZB Smile&Pay docs: https://smileandpay.zb.co.zw/documentation

## Release acceptance checklist

- [ ] Entry point is discoverable inside the app and does not interrupt learning.
- [ ] Custom amount validates on both client and server.
- [ ] Currency, fees, and final amount are shown before payment.
- [ ] No secrets or payment credentials are exposed client-side.
- [ ] Test/sandbox payment success is verified server-side.
- [ ] Failed, cancelled, pending, delayed, duplicate, reversed, and invalid callback cases are tested.
- [ ] Refreshing or returning twice cannot create duplicate contributions or false success.
- [ ] Success is shown only after trusted verification.
- [ ] RLS/access-control tests prove supporters cannot see others' payment records.
- [ ] Small-screen, keyboard, screen-reader, low-bandwidth, and interrupted-flow behaviour are checked.
- [ ] Live payment is enabled only after the merchant account is approved and production credentials are securely configured.
- [ ] Refund/support policy and privacy disclosure are published.
- [ ] No real-money transactions are tested with sandbox credentials, and no sandbox result is described as a live payment.

## First implementation milestone

Implement the app-side support screen and payment-status state machine only after inspecting existing routes, navigation, design tokens, auth/session utilities, database migrations, and deployment configuration. Integrate one verified provider first. Keep provider integration behind a small server-side adapter so another provider can be added later without rewriting the UI.
