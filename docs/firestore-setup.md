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

React signs in with Firebase Auth and sends an ID token to the C++ API. C++ asks
Firebase's `accounts:lookup` endpoint to validate the token and obtain the UID.
It does not trust a UID sent by the browser or decode a JWT without verification.
C++ calls Firestore REST with that same user token; Firestore checks the rules.
All document paths are constructed under `users/{verifiedUid}`.

- `users/{uid}`: profile fields saved from Settings. Until the first save,
  the profile response derives its name from Firebase Auth.
- `users/{uid}/transactions/{id}`: income and expenses.
- `users/{uid}/goals/{id}`: savings goals and monthly spending limits.
- `users/{uid}/events/{id}`: scheduled payments.
- `users/{uid}/settings/{display|reminders|notifications}`: preferences.

Categories are a fixed C++ catalogue. No sample transactions or demo sessions
are used. The rules permit users to access only their own documents, even if
someone calls Firestore directly. C++ validates incoming and stored financial
records. Amounts are CAD integer cents, capped at 100 billion cents per record;
this demo implementation loads at most 10,000 records per collection.

## Calculation conventions and current limits

- Balances include recorded transactions dated today or earlier.
- Dashboard spending is this calendar month. The monthly budget is the sum of
  spending-limit goals, or this month's income if no spending limits exist.
- Savings goal progress uses the overall positive balance; it does not allocate
  separate savings pots. Spending-limit progress uses this month's expenses.
- Terms are January-April, May-August, September-December. Server dates use UTC.
- Forecasts use scheduled payments from today through the end of the fourth
  calendar month, assume no future income, and are explicitly labelled.
  Scheduling a payment does not mark it paid or create a transaction. Remove
  or adjust the scheduled event through the API if it has already been paid.
- Notification messages are generated from upcoming events and saved reminder
  preferences. Email delivery, avatars, account deletion, and nonpayment
  notification generation are unavailable; their corresponding controls are
  disabled or labelled. Display preferences are saved; the existing UI does
  not yet apply all theme/date/week-start options globally.
- Each API call validates with Firebase and reads Firestore. No caching or
  batch dashboard endpoint yet; expect multiple reads per page.

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
g++ -std=c++17 -I backend/vendor backend/tests/data_test.cpp -o backend/build/data-tests.exe -lws2_32 -lwinhttp
.\backend\build\data-tests.exe
```

The backend tests use an injected HTTP transport to check authentication failures,
account-scoped paths, pagination, Firestore field encoding, validation, calculations,
and empty states. They do not publish rules or access your live Firebase database.
Complete the two-account smoke test above after publishing your rules.

References:
- https://firebase.google.com/docs/reference/rest/auth
- https://firebase.google.com/docs/firestore/use-rest-api
- https://firebase.google.com/docs/firestore/security/rules-conditions
