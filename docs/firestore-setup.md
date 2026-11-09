# Enable Firestore persistence

## One-time Firebase setup

1. Use the same Firebase project as your working login.
2. In Firebase Console, open Build > Firestore Database > Create database.
   Create the **default** database, choose a region, and start in production mode.
3. Open the database's Rules tab. Replace the rules with the contents of the
   repository-root `firestore.rules`, then click Publish.
4. Keep your existing `frontend/.env` Firebase API key and project ID.
   Docker Compose now passes that file to the C++ backend as well as mounting
   it for Vite. No service-account key or additional database URL is needed.
5. Stop the running stack with Ctrl+C, then run `.\start.ps1` again (Windows),
   or `bash ./start.sh` (macOS/Linux). This rebuilds the backend with HTTPS support.
6. Sign in. A new account starts with zero totals and empty lists.
7. Add an income and an expense on Expenses, refresh, and verify they remain.
   Try editing and deleting a transaction. Create a goal and a calendar payment.
   Save your name in Settings and verify it after logging out and back in.
8. Sign in with a second account and verify that it has a separate empty ledger.

If login now reports a backend error, start the C++ server too. If Firestore
reports permission denied, check the published rules and that both services
use the same Firebase project. The web API key must permit the Identity Toolkit
API from the backend; a browser-referrer-only key restriction will block server
requests. Do not disable Firestore rules to work around an error.

## Restarting during development

| Changed | What to do | 
| --- | --- |
| React, TypeScript, CSS | Save; Vite reloads automatically. No restart. |
| C++ source or headers | Ctrl+C, then run the startup script again to rebuild. |
| `.env`, Compose or Dockerfile | Ctrl+C, then run the startup script again. |
| `package.json` / lockfile | Restart the stack so `npm ci` updates its dependencies. |
| Firestore rules in the console | Publish; no app restart required. |

## Architecture and storage

React sends a Firebase ID token to the C++ API. AuthService validates it through
Firebase accounts:lookup. FirestoreClient constructs paths under users/{verifiedUid}
and calls Firestore REST with that user's token. Published rules enforce ownership.
No service-account private key is required. JSON request ownership fields are rejected.

**After this refactor, republish the current root firestore.rules**, even if you
published the old version already. New categories, budgets, recurring, bursaries,
fees and semester-settings collections need these rules. Transaction notes and
recurrence markers and event paid state are also supported. The code has not
published rules or changed your live Firebase project automatically.

New accounts start empty with built-in categories. Old records remain readable;
new optional fields have defaults and historical category IDs are retained.
Budgets, balances and forecasts are calculated in C++, not stored as duplicated totals.

Dashboard, transaction and forecast views have bundled endpoints. Token validation
still occurs on every request, and collection reads are limited to 10,000 records
per collection. There is no claim of one-second deployed response time.

Recurring processing runs on application startup, schedule save and explicit sync;
there is no background job. Calendar payments can be edited, deleted or marked paid.
They do not automatically create actual transactions. Email delivery, account deletion,
avatars, some display options, official tuition lookup, rent maps and discounts remain
incomplete. The requirements status file records these limits explicitly.

## Deployment and native builds

For a deployed backend set `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, and
`FRONTEND_ORIGIN`. These first two use the same public web-project values as
Vite. Never add Admin SDK secrets to VITE variables. Keep frontend Firebase
variables on Vercel and set its `VITE_API_URL` to the API origin.

The Dockerfile installs libcurl and trusted CA certificates. TLS certificate
verification remains enabled. Native Windows builds use WinHTTP and the system
certificate store; `backend/dev.ps1` loads the two needed values from the local
frontend `.env`. Native Linux/macOS builds need CMake and libcurl development
headers (e.g. libcurl4-openssl-dev on Debian). CMake links the platform transport.

## Verification

Frontend: `cd frontend`, then `npm test`, `npm run build`, `npm run lint`.
Backend on Windows (from the root, with g++ installed):

```powershell
.\backend\test.ps1
```

The backend tests use an injected HTTP transport to check authentication failures,
account-scoped paths, pagination, Firestore field encoding, validation, calculations,
and empty states. They do not publish rules or access your live Firebase database.
Complete the two-account smoke test above after publishing your rules.

References:
- https://firebase.google.com/docs/reference/rest/auth
- https://firebase.google.com/docs/firestore/use-rest-api
- https://firebase.google.com/docs/firestore/security/rules-conditions
