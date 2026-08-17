# Movie & TV Show Watchlist Full-Stack Application

A full-stack Movie / TV Show Watchlist web application built with **Django REST Framework (DRF)** + **SimpleJWT** on the backend and **React** + **Vite** on the frontend.

## Key Features

- **Strict Multi-User Security & Isolation**: Every media item belongs to an authenticated user (`owner = models.ForeignKey(User, ...)`). All queries, mutations, and deletions are automatically scoped to `request.user`. No user can view, edit, rate, or delete another user's media.
- **JWT Authentication & Silent Auto-Refresh**: Uses `TokenObtainPairView` (`/api/token/`) and `TokenRefreshView` (`/api/token/refresh/`). Axios interceptors automatically attach the Bearer token and handle seamless token refreshes without infinite loops or duplicate refresh calls.
- **Two Watchlist Tabs**:
  - **To Watch**: Displays unwatched movies and TV shows with a quick "Mark as Watched" action.
  - **Watched**: Displays completed items with an interactive, clickable 5-star rating system.
- **5-Star Rating Component**: Instant star rating updates via `PATCH /api/media/<id>/` with real-time UI state sync.
- **Add & Delete Media**: Add items with title, type (Movie / TV), status, and optional rating. Delete items with confirmation protection.
- **Pre-seeded Demo Accounts**: Quick testing with pre-configured `alice` and `bob` accounts.

---

## Getting Started

### 1. Prerequisites

- Python 3.10+
- Node.js 18+ and npm

---

### 2. Backend Setup & Running

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Run migrations (if not already applied):
   ```bash
   python manage.py migrate
   ```

3. Seed demo accounts and initial media (optional):
   ```bash
   python manage.py seed_data
   ```

4. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   *The backend will be available at `http://localhost:8000/`.*

---

### 3. Frontend Setup & Running

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173/`.*

---

## Demo Credentials

You can log in immediately with either of the pre-seeded demo accounts:

| User | Username | Password |
|---|---|---|
| **User A** | `alice` | `password123` |
| **User B** | `bob` | `password123` |

Or click the **Register** tab on the login screen to create a brand-new user.

---

## Running Automated Security Tests

To verify backend security, permissions, and multi-user data isolation:

```bash
cd backend
python manage.py test api
```

Or run the live end-to-end verification script:

```bash
cd backend
python verify_e2e.py
```
