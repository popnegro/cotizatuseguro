# CotizaTuSeguro PMV closure runbook

Updated: 2026-10-30

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


## Current verification — 2026-10-30

### Candidate and deployment

- `main` remains unchanged at `2eab45af404bf75a68cc6c54129cc4ca956d2212`.
- QA candidate: `qa/pmv-candidate-2026-10`, merge commit `c0d3fb8a55ddc5a649958a94dacb29810b4cf8a3`.
- PR #39 (semantic quote-form stepper) merged into the QA candidate only.
- GitHub Actions CI #200 passed: typecheck, 31 unit tests, lint, build and 25 Chromium browser tests.
- Vercel QA deployment for the QA candidate reached READY. Its Preview alias redirects to Vercel SSO; external browser QA cannot inspect it without an authorized session.
- Production smoke checks: landing page HTTP 200; `/api/health` HTTP 200; canonical is the apex domain; Open Graph and Twitter both reference only `https://cotizatuseguro.com.ar/opengraph-image.jpeg`; the image responds HTTP 200 with `image/jpeg` (275,705 bytes).
- Responsive production check: no horizontal overflow at 320, 360, 390, 430, 768, 1024 or 1440 px. No browser page errors observed.
- Production health reports HubSpot, WhatsApp, GTM, Meta Pixel and Meta CAPI as configured. This reports environment-variable presence only; it is not an integration transaction or event-delivery test.

### Current technical controls

- `LEADS_RATE_LIMIT_MODE=infrastructure` is present in Vercel, but the API requires the additional `LEADS_INFRA_RATE_LIMIT_VERIFIED=true` flag before bypassing Upstash. That verification flag was not present in the environment inventory; therefore the application-level Upstash limiter remains the active path. Do not infer that Vercel Firewall rate limiting is active.
- Vercel environment entries exist for HubSpot, Upstash, WhatsApp, GTM, GA4, Meta Pixel and Meta CAPI. Values were not decrypted or exposed. Their presence does not prove valid credentials or end-to-end connectivity.
- `.github/workflows/lead-retry.yml` schedules a POST to the production retry endpoint every five minutes, gated by the GitHub repository variable `LEAD_RETRY_ENABLED == 'true'` and the repository secret `LEAD_RETRY_SECRET`. This audit did not verify the GitHub variable/secret values or scheduler run history. Do not dispatch the workflow as a test: it can deliver pending leads to the production CRM.
- HubSpot connector identity was verified as account `52182698`, matching the portal containing the authorized synthetic QA contact. The contact property `insurance_request_id` is present and searchable: an exact CRM search for `SOL-QA-VERIFY-20261030` returned exactly one result, contact `259253423268` (`qa-cotizatuseguro-20261030@example.com`). The connected HubSpot app still reports onboarding incomplete; this does not invalidate the successful read/search, but its setup remains incomplete.
- Vercel environment inventory confirms `HUBSPOT_ACCESS_TOKEN` entries exist for both Preview and Production. Secret values were not decrypted, so token-to-portal parity and successful Vercel-originated API writes remain unverified. Do not infer end-to-end delivery from variable presence or connector access.

### Remaining launch gates

1. **HubSpot:** verify that the Vercel token belongs to the intended portal, required custom properties exist and are searchable, and a clearly synthetic lead is created and found in an explicitly authorized Preview/test portal. Do not submit real customer data.
2. **Retry scheduler:** verify GitHub variable/secret configuration without printing values; confirm the secret matches Vercel's secret. Exercise the scheduler against Preview before enabling or relying on Production retries.
3. **GA4 / GTM / Meta:** inspect the published GTM container and verify consent rejection blocks all measurement tags; acceptance emits the intended events once; confirm GA4 DebugView and Meta Test Events. The owner's prior confirmation is not independently revalidated by this audit.
4. **Google Ads:** no Conversion ID/label is documented in the repository environment template. Verify whether the intended conversion is configured inside the GTM container; do not assume `generate_lead` is a valid Google Ads conversion action.
5. **WhatsApp:** verify the prefilled handoff on desktop and mobile in the protected Preview. A click or URL opening is not proof that a message was sent.
6. **Privacy:** retain the approved project policy content; record any independent legal review separately. This technical audit is not legal advice.
7. **Preview visual QA:** use an authorized Vercel session to inspect the latest QA deployment. The SSO redirect is a real access blocker for external browser inspection.

### Release decision

The QA candidate is technically green for the changes integrated so far, but the PMV is **not launch-ready** until the CRM, retry operations, measurement, WhatsApp and protected-Preview gates above have evidence. Keep paid campaigns disabled. Do not merge or promote the QA candidate to `main` until the complete acceptance checklist passes and the project owner explicitly approves the final PR.


## Re-audit — 2026-10-30, after PR #42

### Candidate state
- Candidate branch: `qa/pmv-candidate-2026-10`, commit `76b3929166e6c0fd3ffe2fa477c32f07cbf43d38`.
- PR #42 merged into candidate only. It persists the delivery attempt before the HubSpot request, reconciles subsequent attempts by `insurance_request_id`, and fails closed when reconciliation is unavailable.
- PR #42 CI run `41135387359`: npm ci, typecheck, unit tests, lint, isolated Meta Pixel build, Playwright Chromium install and browser acceptance all passed.
- Candidate Vercel deployment `dpl_BwcYT7gbAbmYUpDV5sgfTMgvKEDw` is READY for the candidate commit.
- `main` remains at `2eab45af404bf75a68cc6c54129cc4ca956d2212`; no promotion or merge to main was performed.

### Updated P0/P1 evidence
- **HubSpot duplicate recovery:** code and mocked regression tests cover the lost-create-response path. The connected HubSpot portal `52182698` has the `insurance_request_id` property and an exact search for `SOL-QA-VERIFY-20261030` returned exactly one previously authorized synthetic QA contact. This does not prove that Vercel's Preview/Production tokens belong to that portal or that a Vercel-originated write succeeds.
- **Rate limiting:** Vercel Preview and Production have `LEADS_RATE_LIMIT_MODE=infrastructure`, but the explicit `LEADS_INFRA_RATE_LIMIT_VERIFIED=true` flag is absent. The code therefore continues using Upstash's sliding-window limiter: 8 requests per 60 seconds per hashed IP, with a 1.5-second Redis timeout and fail-closed HTTP 503 if the limiter is unavailable. The Upstash database `cotizatuseguro-rate-limit` is active and TLS-enabled. Vercel Firewall active-config lookup returns `404 Seawall Config not found`; no Vercel Firewall protection is claimed. No production burst test was run.
- **Durable queue:** code persists the lead and pending sorted-set entry in Redis before contacting HubSpot; records have a 30-day TTL; the retry worker uses a Redis claim lease and schedules exponential retry delays. The shared Upstash database exists and is active. A live Preview lead-write/retry transaction was not run because Preview is SSO-protected and no new CRM write was authorized.
- **Retry scheduler:** workflow `.github/workflows/lead-retry.yml` runs every five minutes and is gated by GitHub variable `LEAD_RETRY_ENABLED == 'true'`; it checks that `LEAD_RETRY_SECRET` is nonempty before calling the Production retry endpoint. GitHub Actions variable/secret values and secret parity with Vercel could not be independently read through the available GitHub connection. Do not dispatch this workflow against Production: it can deliver real pending leads.
- **Consent/measurement:** the client loads GTM and Meta Pixel only after explicit `analytics-consent=accepted`; rejected/unknown consent short-circuits tracking. The GTM ID and Meta Pixel ID are present in Vercel environment inventory. The code sends a GA4/GTM dataLayer event and direct browser Meta Pixel events; Meta CAPI is also configured as a server-side path. The actual GTM container configuration, GA4 DebugView and Meta Test Events were not accessible, so event uniqueness, tag consent behavior inside the container and browser/server deduplication remain unverified. Do not infer conversion correctness from environment-variable presence.
- **Google Ads:** no Google Ads conversion ID/label was found in the repository environment template. Whether a conversion is configured inside GTM remains unverified.
- **WhatsApp:** Vercel has a WhatsApp Business number configured for Preview and Production. After the API confirms durable acceptance, the client builds a prefilled `wa.me` message with request ID, contact data and product-specific risk details. The code explicitly states that opening WhatsApp does not mean the message was sent. Desktop/mobile handoff remains untested because Preview requires an authorized SSO session.
- **Public production page:** current public crawl returns the six approved product types, two-step quote form, privacy link and clear statement that a quote request does not issue a policy or guarantee coverage. Prior production smoke evidence for canonical and the single approved OG JPEG remains applicable; the latest QA candidate itself is not Production.
- **Access/visual QA:** Vercel Preview is protected by SSO. Automated CI Playwright acceptance passed, but authenticated manual visual QA and live consent/tag diagnostics cannot be completed without an authorized browser session.

### Remaining launch blockers (do not mark PMV complete)
1. Authorized, synthetic Preview submission to verify Vercel-originated HubSpot create/search and token-to-portal parity. Do not create further CRM contacts without explicit approval.
2. Read-only confirmation of GitHub scheduler variable/secret state and secret parity; then test scheduler against Preview only. Never dispatch Production retry for QA.
3. Authorized GTM container access plus clean-browser consent rejection/acceptance tests, GA4 DebugView and Meta Test Events; verify one event per intended action and Meta Pixel/CAPI deduplication.
4. Verify Google Ads conversion action and label inside the actual GTM/Ads account, or explicitly record that Google Ads conversion tracking is out of scope for this PMV.
5. Authenticated desktop/mobile Preview QA, keyboard/focus/error-state checks and WhatsApp handoff confirmation without sending a real message.
6. Independent confirmation of WhatsApp Business ownership/number and legal review of privacy policy where required.

### Release decision
**NOT READY for final PMV acceptance or paid campaigns.** Code-level P0/P1 fixes and CI are green, but external integration, measurement, scheduler and authenticated visual gates above remain unverified. Keep campaigns disabled. Keep `main` unchanged until every applicable acceptance gate is evidenced and the owner approves the final PR.


### Additional P0 — GitHub governance
- Repository branch inventory reports `protected: false` for `main` and the candidate; repository rulesets query returns an empty list. The GitHub integration cannot read the branch-protection detail endpoint (HTTP 403), and no branch-protection write capability is available. Therefore branch protection is **not evidenced and must be treated as absent**.
- Before final PMV approval, configure protection for `main`: require pull requests, require the CI checks (typecheck, tests, lint, build, Playwright), require at least one approval, dismiss stale approvals, require conversation resolution, block force pushes and deletion, and restrict bypass/admin exceptions as appropriate. Keep the candidate branch writable for QA integration.
- This is an account/repository administration gate. Do not claim that `main` is protected until the settings are independently verified.
