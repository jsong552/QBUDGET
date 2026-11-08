# Initial data model

The first working feature is: sign in, create an expense, and retrieve only
your own transactions. Start with profiles, categories, and transactions.
Budgets, goals, recurring payments, and forecasts can be modelled as their
features are implemented.

## Where definitions live

- `frontend/src/types/index.ts`: TypeScript request and response interfaces.
- `backend/src/models.hpp`: C++17 structs for the core models and API shapes.
- This document: shared storage and ownership conventions.

React and C++ exchange JSON; neither language imports the other's types.
For now, update both files together when changing the API. These definitions
do not implement JSON parsing, runtime validation, authentication, or persistence.
The initial definitions are now used alongside the JSON-based API in
`backend/src/budget.hpp` and the Firestore client in `backend/src/firebase.hpp`.
See `docs/firestore-setup.md` for current implementation and setup.

## Responsibilities

| Model | Purpose |
| --- | --- |
| `UserProfile` | Stored name and optional student ID, keyed by Firebase UID |
| `ProfileInput` | Fields the user may edit on their own profile |
| `User` | Profile response for React, including email and display fields |
| `Category` | Stable category ID and display name |
| `TransactionInput` | Fields accepted when creating or editing a transaction |
| `TransactionRecord` | Stored transaction plus document ID and owner UID |
| `Transaction` | Response for React with the resolved category object |

Use plain structs for data. Later, a transaction service will implement rules
and calculations, and a repository will handle database requests.

## Proposed Firestore layout

Cloud Firestore is implemented; create the database and publish the supplied
rules using the setup guide.

```text
users/{uid}
  fullName: string
  studentId: string | null

users/{uid}/transactions/{transactionId}
  date: string                 // YYYY-MM-DD
  description: string
  categoryId: string
  type: "income" | "expense"
  amountCents: integer

// Categories are currently a fixed server-side catalogue, not documents.
```

UIDs and transaction IDs come from document paths; do not duplicate them in
document fields. `TransactionRecord.ownerUid` is populated from that path.
Categories are a shared, server-managed catalogue initially. Seed its IDs
to match the categories used by the frontend when adding persistence.

Firebase Auth owns email, passwords, and sign-in state. Do not store passwords
or bearer tokens in profile documents. Populate the API's `User.email` from
Firebase identity, and derive `firstName` and `initials` from the profile name
when building the response (with an empty-name fallback).

## Request and response example

Request: `POST /api/transactions` with the signed-in user's bearer token:

```json
{
  "date": "2026-11-07",
  "description": "Groceries",
  "categoryId": "groceries",
  "type": "expense",
  "amountCents": -2450
}
```

An item returned by `GET /api/transactions`:

```json
{
  "id": "server-generated-id",
  "date": "2026-11-07",
  "description": "Groceries",
  "category": { "id": "groceries", "name": "Groceries" },
  "type": "expense",
  "amountCents": -2450
}
```

The existing frontend expects create/update/delete operations to return no
data and then reloads the list. A successful write can return HTTP 204.

## Rules to enforce when implementing endpoints

- Verify the Firebase token and use its UID to choose the user document path.
  Do not accept an owner UID in request bodies. Reads, updates, and deletes
  must all stay within the authenticated user's path.
- Require integer cents, never floating-point dollars. Expenses are negative,
  income is positive, and transaction amounts cannot be zero. Reject amounts
  outside `[-9007199254740991, 9007199254740991]` so JSON numbers remain exact
  in JavaScript. Check aggregate calculations for overflow and API range too.
- Initially assume one currency, CAD. The demo's currency preference must not
  be treated as currency conversion. Add an explicit currency model before
  supporting balances that mix currencies.
- Require real calendar dates in `YYYY-MM-DD` format, including leap-year
  validation. These are transaction dates, not UTC timestamps.
- Require a nonblank description and a category that exists in the catalogue.
- Serialize the C++ enum as `"income"` or `"expense"`; reject unknown values.
  Serialize an absent `studentId` as JSON `null`.
- Treat TypeScript interfaces and C++ structs as shapes, not validation.
  Validate incoming JSON before constructing trusted application data.
- Configure database access alongside the repository. If the backend uses
  privileged credentials, it must enforce ownership itself; database rules
  alone are not a substitute for those checks.

## Next implementation milestone

Connect Firebase Auth in React, implement C++ token verification and `/api/me`,
then add validated transaction creation and listing backed by Firestore.
Verify that an expense survives a refresh and that a second user cannot read
or modify it. Add dashboard totals and other calculated responses after this
flow works.
