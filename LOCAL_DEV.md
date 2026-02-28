# Run locally when you can't login (Render backend down)

If the login page stays loading or shows "Network Error", the hosted backend is not responding. Use the backend on your PC instead.

## 1. Run the backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` if you don't have one (copy from `.env.backup` or run `node scripts/check-env.js`). Set at least:

- `PORT=5000`
- `DATABASE_URL=postgresql://...` (your database URL, e.g. from Neon or local Postgres)
- `JWT_SECRET=some-secret-string`

Then:

```bash
npm run dev
```

Leave this terminal open. You should see: `Server running on port 5000`.

## 2. Point the frontend to your local backend

In the **frontend** folder, create a file named `.env.local` with:

```
VITE_API_URL=http://localhost:5000/api
```

This makes the app use your local backend instead of Render.

## 3. Run the frontend

Open a **new** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:3000) and log in. Login should work as long as the backend is running and the database has an admin user.

## 4. (Optional) Create an admin user

If you don't have a user yet:

```bash
cd backend
npm run create-admin
```

Follow the prompts to create an admin username and password.

---

**To switch back to the Render backend:** remove or rename `frontend/.env.local`, or set `VITE_API_URL=https://bakend-rowdafeems.onrender.com/api` in that file, then restart the frontend.
