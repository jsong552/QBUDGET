# Gemini forecasting

The Forecast page loads the existing C++ forecast immediately. **Generate AI forecast** requests an optional Gemini spending projection, explanation, budget risks, savings suggestions and assumptions. Its projections feed the existing cards, chart and monthly table. **Use standard forecast** switches back without another provider call. Changing chart interval does not call Gemini again.

## Local setup

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) for a project you can use. The existing Firebase browser key is not the Gemini server key.
2. Copy `backend/.env.example` to `backend/.env`, then set `GEMINI_API_KEY`. The file is gitignored. Never put the key in a `VITE_` variable, frontend source, a commit, a screenshot or a chat message.
3. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. Set it to a supported text model available to your Google project if necessary.
4. Restart the backend. Docker Compose loads `backend/.env` only into the backend; the file is optional so teammates without a key can continue using the app. This uses the optional `env_file` syntax in Compose 2.24+.
5. For native Windows development, run `./backend/dev.ps1`. It loads the backend file, supports g++ or Visual Studio/CMake, and preserves explicit process environment values for Gemini. Run the frontend with `npm run dev` in `frontend`.
6. Sign in, record income/expenses or scheduled payments, then visit Forecast and generate. No AI call is made just by loading the page.

For a manually launched binary or a native Linux/macOS build, export `GEMINI_API_KEY` and optionally `GEMINI_MODEL` into the server process yourself. The C++ executable does not parse `.env` files. On Render/Railway/other hosting, set these in the **backend service's environment**, then redeploy/restart. Vercel/frontend configuration needs only the existing `VITE_API_URL` and Firebase browser settings.

## Data and calculations

- `GET /api/forecast/ai/status` reports availability; `POST /api/forecast/ai` accepts exactly `{}`. Both use the existing Firebase authentication middleware. Ownership comes from the verified UID, never the body.
- C++ reads that user's saved records and sends only aggregate history, category spending, current balance, baseline/known-payment projections, up to 30 budget summaries and 20 goal amounts. Custom category names are grouped together. No UID, email, profile, merchant/transaction description, notes, goal titles or Firebase token is sent to Gemini.
- The provider request uses HTTPS and the `x-goog-api-key` header. The host is fixed and the configured model name is validated. No client-supplied prompt or tools are supported.
- Gemini supplies four monthly **expense** estimates. Income remains the deterministic projection. C++ rejects invalid dates, missing months, fractional/negative/out-of-range money, truncated responses, and projections below known obligations; it recomputes balances and all chart granularities. The first month covers remaining days. Existing transactions are never edited by AI.
- Responses are rendered as text, not HTML. AI explanations remain estimates and can be inaccurate. The page explains what data is sent before the user generates.
- Analysis is not stored in Firestore. Each server process holds at most 128 account entries in memory, caches unchanged inputs for five minutes, allows one generation per account per 30 seconds and two concurrent provider calls globally. Cache entries are isolated by UID and full aggregate snapshot. Inactive entries expire after ten minutes. For multiple backend replicas, these limits apply independently; use a shared limiter if scaling up.
- Saved changes and background recurring sync clear the browser's previous AI analysis and discard stale in-flight responses. A failed AI request never replaces the standard forecast with invented values.

## Failure handling

The AI endpoint returns `source: "baseline"`, a reason and a user-facing message when Gemini cannot be used. Common reasons:

| Reason | Action |
| --- | --- |
| `not_configured` | Set a valid backend key/model and restart. |
| `access_denied` | Check the key's project/API access. |
| `configuration` | Check that the model is available and accepts the structured-output request. |
| `quota` | Check the project's quota/billing; wait before retrying. |
| `insufficient_data` | Add recorded income/spending or future scheduled payments. |
| `busy` / `rate_limited` | Wait and retry. |
| `invalid_response` / `unavailable` | Keep the standard forecast and retry later. |

Raw provider errors and credentials are never returned to the browser. There are no automatic paid retries. Hosting/platform request timeouts should allow for the existing HTTPS transport timeout plus Firebase reads.

## Verification

`npm test`, `npm run build`, and `npm run lint` run in `frontend`. DOM integration tests exercise the actual page, hooks and HTTP client with mocked external responses: explicit generation, chart/table updates, interval switching, standard fallback, authentication failure, duplicate-click prevention, stale results and text escaping.

Build with CMake and run `ctest --test-dir backend/build/<directory> -C Release --output-on-failure`. All function-test suites are registered, including Gemini response validation, account isolation, caching, concurrency, privacy filtering and API integration. These tests require no API key and make no cloud calls.

For an opt-in **real Gemini check using synthetic data only**, build `qbudget-gemini-smoke` with CMake and run it with `GEMINI_API_KEY` in the process environment. This sends one synthetic budget to Google, can consume quota, and does not contact Firebase. A successful run reports `source: "gemini"` and four months; failures return a nonzero exit code. Live validation is separate from mocked tests.

API references checked during implementation: [generateContent](https://ai.google.dev/api/generate-content), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [model configuration](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [API keys](https://ai.google.dev/gemini-api/docs/api-key).

## Forecast presentation and income history

The chart plots recorded expenses in red and expected period totals in dashed blue. For the current week/month/term, expected totals add recorded spending to the remaining forecast; future-only amounts stay unchanged in the monthly cash-flow table. This avoids comparing a partial remaining period against whole months. Hover tooltips show CAD values. Income comparison can be enabled separately so a one-off income spike does not flatten the spending chart. Projected income is supplied for all three intervals. Monthly and weekly buckets do not add recorded values twice.

Income uses the average of the two previous complete calendar months when both have positive recorded income; the current month subtracts income already received, and scheduled income remains a floor. With insufficient monthly history, it falls back to the trailing 30-day estimate. This is a transparent heuristic: incomplete or irregular records can still distort it. It does not classify individual payments as recurring.

Gemini receives monthly category totals, record counts, explicit projection windows and the income calculation method. The current month's already-prorated expense estimate is fixed to the standard forecast and validated exactly; Gemini can adjust later full months and must explain each estimate. Its narrative requests CAD dollars, specific category comparisons, realistic actions, and avoids inferring debt or hardship from missing records. The page displays recorded monthly income, spending, net cash flow and category changes independently of model prose. Current-to-date comparisons against the previous full month are explicitly labeled. Neither narrative nor estimated future spending is a guarantee.

Headline summary cards (current net cash flow, largest category and next-month outlook) are calculated from the validated snapshot and forecast amounts, rather than repeating model arithmetic or category claims. Gemini provides the monthly explanations and recommendations shown below. A regression test covers an incorrect model claim about the largest category.
