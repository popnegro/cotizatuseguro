# PMV readiness audit — Agustín Montes Seguros

Audit date: 2026-10-18
Repository: `popnegro/cotizatuseguro`
Production/QA URL currently observed: `https://cotizatuseguro.vercel.app/`

## Executive decision

**Not ready for launch or paid campaigns.** The site and lead endpoint are deployed, but integration and compliance evidence is incomplete. This report is an implementation checklist, not a declaration that live integrations passed.

## Repository and branch audit

| Branch | Latest known commit | Assessment |
|---|---|---|
| `main` | `a7cdec099bd5540cbaa42b8e00b8ed7ec062e3b7` | Current QA baseline; keep as reference, do not merge anything without final verification. |
| `fix/hubspot-leads-p0` | `56206b8c3412af165dbbac0f687f8bbfcd3d11af` | Existing candidate branch; its tree matches the current baseline. Suitable for the next controlled remediation. |
| `feat/quote-form-hubspot-fields` | `2a5fed3ea2bade6fc50b5e06d86eaf3bf648e577` | Its tree matches the current baseline; feature has already been integrated. |
| `feat/pmv-landing-foundation` | `2a678501ad365d72084a4235fdd55cf81031e7c6` | Older foundation branch; do not select over the current baseline. |
| `feat/meta-pixel-consent-qa` | `931500487370d66943ffabca6815de37017b28f6` | Older analytics branch; its landing page exposes an older four-product form. Do not use as the candidate. |

PR #7 is the active draft. Vercel checks must be re-run against the current head; a successful deployment is not evidence of a successful live HubSpot write or of correct GA4/Meta event delivery.

## Findings and required actions

### P0 — Block launch

1. **HubSpot live write is unverified.** Unit tests mock `fetch`; they do not prove that the Preview token has the required permissions or that custom properties exist. Submit one clearly labeled fictitious QA lead through an authorized Preview and verify the returned `requestId`/`contactId` and matching contact in the intended HubSpot portal. Do not use real customer data.
2. **Privacy policy is a draft.** `/privacidad` explicitly says the responsible party, retention period, rights procedure and applicable legal information must be completed. Do not launch paid traffic until the responsible party supplies and approves these details.
3. **WhatsApp handoff is unverified.** Confirm the configured number is a WhatsApp Business number and test the prefilled request message on desktop and mobile. A successful CRM write or a click is not proof that the user sent a WhatsApp message.
4. **Conversion measurement is unverified.** Test accepted/rejected consent, GA4 events, GTM routing and Meta Pixel in browser diagnostics. Prevent duplicate GA4 pageviews and duplicate Meta Lead events if tags are also configured in GTM. Do not activate campaigns until evidence is recorded.

### P1 — Resolve before launch

5. **Product scope must be explicit.** The public form exposes six products: auto, moto, hogar, consorcio, bicicletas and caución alquiler. The API product enum is being narrowed to the six products exposed by the PMV: auto, moto, hogar, consorcio, bicicletas and caución alquiler. Do not advertise additional categories without a separately approved scope and complete form validation.
6. **Rate limiting is process-local.** The in-memory map can reset across serverless instances and is not a reliable distributed abuse-control mechanism. Evaluate a shared rate limiter before scaling or running paid campaigns.
7. **Lead durability and retries.** The API does not persist a lead independently of HubSpot. If HubSpot is unavailable, no durable local queue exists. Verify operational handling for 429/5xx responses and establish an alert/retry policy before relying on paid acquisition.
8. **Attribution configuration.** GTM is the sole browser-tag entry point after analytics consent. Validate the GTM container has the intended GA4 and Meta tags and maps each custom dataLayer event exactly once; the code no longer loads GA4 or Meta Pixel directly.

### P2 — Quality and discoverability

9. Verify canonical and Open Graph metadata against the final custom domain `agustinmontesseguros.com.ar` once configured; current defaults reference the Vercel URL.
10. Run real desktop/mobile visual QA, keyboard navigation, focus visibility, form error states and accessibility checks.
11. Run CI (`typecheck`, `test`, `lint`, `build`) on the final candidate and verify the resulting Preview deployment before opening the final approval PR.

## Acceptance gates

- [ ] HubSpot QA contact created and independently found in the intended portal.
- [ ] All six displayed product flows pass positive and negative validation.
- [ ] API accepts only the six PMV product categories.
- [ ] WhatsApp handoff verified on desktop and mobile.
- [ ] Consent rejection blocks analytics/ad tags; acceptance enables only intended tags.
- [ ] GA4 and Meta events observed once per intended action; no duplicate conversions.
- [ ] Privacy policy approved and completed by the responsible party.
- [ ] Final domain, canonical and Open Graph metadata verified.
- [ ] Desktop/mobile, keyboard and error-state QA completed.
- [ ] CI and Preview pass; no launch-blocking issues remain.

## KPI definitions for the PMV

- **Valid lead rate:** valid lead submissions / form submissions.
- **CRM write success rate:** successful HubSpot writes / valid lead submissions.
- **WhatsApp handoff rate:** successful handoff attempts / successful CRM writes. This is not a proxy for messages actually sent.
- **Measurement parity:** expected conversion events observed / expected conversion events in test cases.
- **Duplicate conversion rate:** duplicate conversion events / all conversion events; target is zero in QA.
- **Form completion rate:** successful submissions / form starts.

Campaign spend stays disabled until the P0 gates and the measurement acceptance gates are evidenced.
