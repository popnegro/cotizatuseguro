# CotizaTuSeguro PMV closure runbook

Updated: 2026-10-26

This runbook records the remaining operational checks required before the PMV can be declared production-ready. Do not submit real customer data as a test.

## Verified in this audit

- Production deployment is READY at commit 17ed75ae87f47c101dd926a43a331a94da2de15a.
- GET /api/health returns HTTP 200 and reports the presence of HubSpot, WhatsApp and GTM configuration. This checks environment-variable presence, not end-to-end connectivity.
- Preview deployment for fix/hubspot-retry-idempotency reached READY at commit ae2fd2a445084f498c1fc892c0b106f2444c9fd9.
- CI run 40415440312 passed typecheck, tests, lint, build and Playwright browser acceptance tests.
- A GET request to /api/leads/retry returns HTTP 405; the endpoint is intended for POST and this does not validate the Bearer authentication branch.

## P0 — Rate limiting

The active Vercel Firewall configuration API returned 404 Seawall Config not found for this project, including attempts to read and create configuration. Do not assume infrastructure rate limiting is enabled just because LEADS_RATE_LIMIT_MODE=infrastructure is set.

1. In the Vercel project dashboard, verify whether Firewall/WAF configuration is available for this project and plan.
2. If available, configure a POST-only rule for /api/leads with a conservative per-IP limit and verify the active configuration after saving.
3. If the project cannot support the rule, disable infrastructure mode only after choosing a replacement that does not reintroduce avoidable lead-loss 503s. Do not silently run the endpoint without an abuse control.
4. Verify with a controlled Preview-only test, not production traffic. Do not send a burst against production to test throttling.

## P0 — HubSpot recovery and duplicate prevention

The retry flow must handle a lost response after HubSpot may have created a contact.

The branch fix/hubspot-retry-idempotency adds a reconciliation search by insurance_request_id before repeating a create request. If reconciliation is unavailable, the retry remains pending instead of issuing a potentially duplicate create.

Before merge:
1. Confirm in the connected HubSpot portal that the insurance_request_id contact property exists and is searchable through CRM v3 contact search.
2. In a dedicated HubSpot test portal or explicitly approved test list, create a synthetic test contact and verify that the search filter returns its ID.
3. Verify a simulated lost-create-response scenario against the test portal and confirm the retry finds the original contact instead of creating another.
4. If the property is absent or not searchable, do not merge/deploy this change until the integration contract is corrected.

Search-before-create reduces duplicate risk but is not strict atomic idempotency if HubSpot search indexing is delayed. A unique custom property enforced by HubSpot or another provider-supported idempotency mechanism would provide stronger guarantees.

## P1 — Durable storage and retry scheduler

1. Use Preview and a synthetic lead with no real personal data to verify Redis write/read/update and pending-index behavior.
2. Verify that a failed transient HubSpot response remains pending and receives a future nextAttemptAt.
3. Verify the GitHub Actions repository variable LEAD_RETRY_ENABLED is explicitly true only when the repository secret LEAD_RETRY_SECRET is configured.
4. Confirm the secret value matches Vercel's LEAD_RETRY_SECRET without printing either value.
5. Run the scheduler manually against Preview first; check counts only (processed, sent, pending, failed) and do not log contact properties.
6. Confirm permanent failures are reviewed manually; do not delete failed leads.

## P1 — Measurement and consent

In a clean browser profile and Preview:
- Reject consent and verify GTM/Meta/analytics tags do not load or emit.
- Accept consent and verify one PageView, one lead conversion only after successful capture, and a separate WhatsApp click event.
- Check GA4 DebugView, GTM Preview and Meta Events Manager. Do not change live campaigns or spend budget.
- Verify that failed capture does not emit a lead conversion and that repeated UI callbacks do not duplicate the event.

## P1 — Build and release gate

Required automated checks for the candidate commit:
- npm ci --no-audit --no-fund
- npm run typecheck
- npm test
- npm run lint
- npm run build
- npm run test:e2e

After merge, verify the Production deployment ID and commit, then run only non-mutating smoke checks (GET /api/health and landing page load). Do not submit a lead to production unless a test environment is explicitly approved.

## Rollback

Previous deployment observed: dpl_4sGE6gUTzVM13qq8YZxsAQRxuxWX (commit 4fce461).

Before rollback, confirm the prior deployment is healthy and its environment variables remain compatible. Rollback does not reverse environment changes or recover missing leads. Preserve the Redis pending queue and review failed leads separately.
