# Calendar timezone fix

## Problem and behavior

The calendar's Today button uses the browser's local date. The backend previously
used the UTC date for the highlighted day, overdue payments, reminders and payment
validation. For example, at 8 p.m. in Toronto on November 18, UTC is already
November 19. A payment due that evening could therefore appear overdue too early.

The frontend now sends `X-Timezone-Offset` on every API request, using
`new Date().getTimezoneOffset()`. The C++ request-date helper applies that offset
to the server's current time, then supplies the resulting date to `ApiController`.
All services handling that request use that same local date. The date label above
the page title also uses it.

The offset is recalculated for each request so new requests pick up daylight-saving
and device-timezone changes. Positive offsets mean behind UTC (Toronto in winter:
300 minutes); negative offsets mean ahead of UTC. The API accepts one signed integer
from -840 to 840 minutes and returns HTTP 400 for invalid or duplicate values.
Clients without this header retain the previous UTC behavior. CORS permits the new
header. Date-only arithmetic and stored `YYYY-MM-DD` values keep their existing
meaning; no database migration or new dependency is needed.

The header describes the device's current offset rather than storing an account
timezone. Existing screens update when they fetch data; this change does not add
a background scheduler or force all open screens to reload at midnight.

## Files to copy into your own branch

Start from James's `js-dev` version. Copy these files from the updated ZIP, keeping
their paths:

- `backend/src/request_date.hpp` (new)
- `backend/src/main.cpp`
- `backend/tests/data_test.cpp`
- `frontend/src/lib/apiClient.ts`
- `frontend/src/lib/apiClient.test.ts`
- `docs/calendar.md`
- `docs/timezone.md` (this explanation)

Rebuild/restart the backend and frontend together so the browser can send the header
and the backend can accept it. The ZIP contains the complete project as well as
these changes. Create or update the Jira task before applying the fix to the team
repository, then link your commit and test results to that issue.

## Checks

The backend regression tests cover Toronto evenings, both sides of local midnight,
the year boundary, a summer offset, an east-of-UTC quarter-hour offset, invalid
headers, calendar highlights, date labels, overdue counts, reminder text and
payment-date validation. Existing calendar payment and recurring-entry tests remain.
The frontend regression test checks that successive requests use the current offset,
including after a daylight-saving or timezone change.

Validation for this change: 139 backend checks and 23 frontend tests passed; the
C++ server compiled and its health/CORS smoke checks passed; the frontend production
build passed. ESLint passed on the two changed TypeScript files. No real Firebase
account or deployed application was used for these checks.

Run the backend's existing CMake/CTest or `backend/test.ps1` workflow. On Linux with
g++ and libcurl installed, an equivalent command from the project root is:

```sh
g++ -std=c++17 -pthread -I backend/vendor backend/tests/data_test.cpp -o /tmp/qbudget-tests -lcurl
/tmp/qbudget-tests
```

Run `npm ci`, then `npm test` and `npm run build` in `frontend`.

For a manual check, open QBudget with the device set to Toronto time. Confirm that
the page date, Today button and calendar highlight agree. An unpaid event due today
should say due today; one due yesterday should be overdue. Recording a payment with
tomorrow's date should be rejected. After a date change, refresh before comparing.
