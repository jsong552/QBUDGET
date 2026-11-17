# Connect Firebase login

## Firebase Console

1. Open your Firebase project (or create one).
2. In Project settings > General > Your apps, register a Web app using the `</>` icon.
   You do not need Firebase Hosting for this project.
3. Copy the web app's configuration values into `frontend/.env`:

| Firebase config | Environment variable |
| --- | --- |
| apiKey | VITE_FIREBASE_API_KEY |
| authDomain | VITE_FIREBASE_AUTH_DOMAIN |
| projectId | VITE_FIREBASE_PROJECT_ID |
| appId | VITE_FIREBASE_APP_ID |
| storageBucket | VITE_FIREBASE_STORAGE_BUCKET (optional for login) |
| messagingSenderId | VITE_FIREBASE_MESSAGING_SENDER_ID (optional for login) |

4. Under Authentication > Sign-in method, enable Email/Password and save.
5. Under Authentication > Settings > Authorized domains, add `localhost` for
   development if missing, and your actual Vercel domain for deployment.
6. Restart the development server after changing `.env`. Docker users can stop
   and rerun `start.ps1` / `start.sh`; native users run `npm install` and
   `npm run dev` inside `frontend`.

Use the existing Sign up tab to create an account, then sign out and sign in.
Firebase Console > Authentication > Users should show the new account.
Refresh a protected page to check session restoration. Try a wrong password
and check that an error appears. Sign out and confirm protected pages redirect
to login. Test with two accounts and check that the displayed identity changes.

## Environment and deployment

`frontend/.env` is ignored by Git; `.env.example` is the shareable blank template.
The four required settings are API key, auth domain, project ID, and app ID.
Storage bucket and messaging sender ID are optional; Analytics measurement ID
and database URL are not needed for this email/password login.

Vite embeds `VITE_` values in the public browser bundle. Firebase web config is
intended for clients: never paste an Admin SDK service-account private key here.
On Vercel, add the same variables to the frontend project's Environment Variables
for the relevant deployment environments and redeploy. Local `.env` is not pushed.

Demo entry has been removed now that the screens use your own data.

## Firestore setup is now required

After login configuration, follow [Firestore setup](firestore-setup.md) to create
the default database, publish the ownership rules, and rebuild the backend.
The login flow loads the profile through C++ `/api/me`; both services must run.
