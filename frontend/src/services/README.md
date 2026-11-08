# Frontend services

Every application data service calls the C++ API through `lib/apiClient.ts`.
Firebase Auth owns signup, login, logout, and token refresh. The auth observer
loads the user's profile from `/api/me`. Pages use hooks; hooks call services.

See `docs/firestore-setup.md` for setup, data conventions, limits and testing.
`src/types/index.ts` describes JSON responses. The C++ API validates input,
calculates summaries, and uses Firestore REST with the user's verified identity.

No production service imports mock data. Avatar upload and account deletion
remain unavailable; password reset uses Firebase's real reset-email operation.
Notifications are computed from scheduled payments and saved preferences.

Money is integer cents. Expenses are negative and income positive. Dates are
YYYY-MM-DD. The API does all financial calculations. Services propagate API
errors; page-level DataError components show failures instead of sample values.
