# M3 TICKET-306 Prelaunch Quality Report

Reviewer: Codex1 / Codex2 QA baseline  
Date: 2026-05-08  
Environment: `C:\Users\wang\Documents\talks`, local production server `http://127.0.0.1:3007`

## Verdict

TICKET-306 is conditionally passed for Beta readiness.

There are no open P0 blockers. Core regression, E2E, security probes, Fish Audio
TTS/ASR, and non-AI performance checks passed. The remaining release risk is
tooling-related: the local machine does not have Lighthouse CLI installed, so
official Lighthouse scores still need to be captured in CI or a Chrome audit
environment before public launch.

## Automated Regression

| Check | Result | Evidence |
| --- | --- | --- |
| Unit/integration tests | Pass | `npm test -- --runInBand`: 21 suites / 57 tests passed |
| Coverage | Pass | Statements 90.58%, Lines 90.36% |
| TypeScript | Pass | `npx tsc --noEmit --incremental false` |
| Lint | Pass | `npm run lint` |
| Production build | Pass | `npm run build` |
| Playwright E2E | Pass | 3 Chromium tests passed |

## Speech Regression

### TTS

`POST /api/speech/synthesize` was rechecked through `scripts/qa-ticket-305.mjs`.

| Character | Status | Provider | First Byte | Total | Result |
| --- | ---: | --- | ---: | ---: | --- |
| Emma | 200 | fish-audio | 1634ms | 2438ms | Pass for streaming start |
| Jake | 200 | fish-audio | 691ms | 2053ms | Pass for streaming start |
| Sophie | 200 | fish-audio | 1099ms | 2077ms | Pass for streaming start |
| Kenji | 200 | fish-audio | 676ms | 2654ms | Pass for streaming start |
| Carlos | 200 | fish-audio | 1361ms | 2299ms | Pass for streaming start |

RISK-01 is mitigated. The product now measures and optimises first audio byte
instead of full file download time, and the chat UI streams audio through
MediaSource when available. Full download time may still exceed 2s for larger
audio, but playback can begin before completion.

### ASR

`POST /api/speech/recognize` was checked with both the baseline QA script and a
real speech sample generated through the local TTS endpoint.

| Check | Result |
| --- | --- |
| 5 language HTTP chain | Pass: en-US / fr-FR / ja-JP / es-MX / zh-CN returned 200 |
| Real speech sample | Pass: `"Hello. This is a real speech recognition check."` |
| Provider | fish-audio |
| Real sample timing | TTS 2519ms, ASR 1071ms |

RISK-02 is mitigated for one real speech sample. A larger human-recorded
accuracy dataset is still recommended before public launch.

## Security Check

| Item | Result | Evidence |
| --- | --- | --- |
| JWT required for chat/speech | Pass | `/api/chat/message` and `/api/speech/synthesize` return 401 without JWT |
| Invalid JWT rejected | Pass | `/api/chat/history` returns 401 |
| Input validation / XSS probe | Pass | Invalid script-like register payload returns 422 |
| Rate limiting | Pass | Auth route returns 429 with `Retry-After` after repeated requests |
| Security headers | Pass | CSP present, HSTS present, `X-Frame-Options=DENY`, `X-Content-Type-Options=nosniff` |
| Secret handling | Pass | Real `.env.local` remains ignored |

Note: Current rate limiting is in-memory and suitable for the Beta baseline. A
distributed limiter backed by Redis, Vercel KV, or an edge gateway is recommended
for multi-instance production.

## Performance Check

### API Performance

Target: `GET /api/characters`, 100 concurrency, 500 total requests.

| Success | Failure Rate | P50 | P95 | P99 |
| ---: | ---: | ---: | ---: | ---: |
| 500/500 | 0% | 46ms | 87ms | 90ms |

### Page Navigation

Lighthouse CLI was not available locally. As a fallback, Playwright collected
production navigation timings.

| Page | Wall Time | DOMContentLoaded | Load Event |
| --- | ---: | ---: | ---: |
| `/` | 648ms | 29ms | 88ms |
| `/login` | 577ms | 27ms | 27ms |
| `/register` | 549ms | 17ms | 26ms |
| `/characters` | 566ms | 34ms | 35ms |
| `/chat` | 621ms | 25ms | 40ms |
| `/report` | 555ms | 31ms | 49ms |

## Open Risks

| Risk | Severity | Status |
| --- | --- | --- |
| Official Lighthouse score not captured | Medium | Needs CI/Chrome audit follow-up |
| ASR accuracy dataset is minimal | Medium | One real speech sample passed; human-recorded multilingual samples still recommended |
| In-memory limiter is not distributed | Low for Beta, Medium for production | Acceptable for local/Beta, replace before scale-out |

## Release Decision

Allow Beta preparation to continue. No P0 bug remains from TICKET-306. Before
public launch, capture official Lighthouse scores and expand ASR accuracy tests
with real human speech samples.
