# BINT TV Line — Business User Management System

A full-stack system for managing TV cable line subscribers and monthly payments.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Axios |
| Backend | Node.js, Express.js |
| Database | MySQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Cron | node-cron |

---

## Project Structure

```
bint-tv-line/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Seed default admin + sample users
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── jobs/
│   │   │   └── resetPayments.js   # Monthly cron job
│   │   └── app.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── app/
    │   ├── login/page.jsx
    │   ├── dashboard/page.jsx
    │   ├── layout.jsx
    │   ├── page.jsx              # Redirects to /login or /dashboard
    │   └── globals.css
    ├── components/
    │   ├── Badge.jsx
    │   ├── Button.jsx
    │   ├── DeleteConfirmModal.jsx
    │   ├── FormInput.jsx
    │   ├── Modal.jsx
    │   ├── Navbar.jsx
    │   ├── UserFormModal.jsx
    │   └── UserTable.jsx
    ├── lib/
    │   ├── axios.js              # Axios instance with JWT interceptors
    │   └── auth.js               # Auth helpers (localStorage)
    ├── .env.local
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Setup Instructions

### Prerequisites

- Node.js >= 18
- MySQL (running locally or remote)
- npm or yarn

---

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE bint_tv_line;
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

**Configure environment variables:**

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://root:yourpassword@localhost:3306/bint_tv_line"
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=1d
```

**Run Prisma migrations:**

```bash
npx prisma migrate dev --name init
```

**Generate Prisma client:**

```bash
npx prisma generate
```

**Seed the database (creates admin + sample users):**

```bash
npm run seed
```

**Start the backend server:**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Backend runs on: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

**Configure environment variables:**

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Start the frontend:**

```bash
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> Change the password after first login by updating the database directly or adding a change-password endpoint.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login, returns JWT |
| GET | `/auth/me` | Get current admin (protected) |

**Login request body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Login response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGci...",
  "admin": {
    "id": 1,
    "username": "admin"
  }
}
```

---

### Users (All require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (with filters) |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| POST | `/users/:id/pay` | Record payment |
| PATCH | `/users/:id/toggle-active` | Activate/deactivate |

**GET /users query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or address (LIKE) |
| `status` | `paid` \| `unpaid` | Filter by payment status |
| `paymentDay` | number | Filter by monthly payment day (1–31) |
| `active` | `true` \| `false` | Filter by active status |

**Create user request body:**
```json
{
  "name": "Juan dela Cruz",
  "address": "Block 1, Lot 5, Sampaguita St.",
  "monthly_payment_day": 5,
  "is_active": true
}
```

**User response example:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Juan dela Cruz",
    "address": "Block 1, Lot 5, Sampaguita St.",
    "monthly_payment_day": 5,
    "last_payment_date": "2026-03-01",
    "is_paid": true,
    "is_active": true,
    "payment_status": "paid",
    "is_overdue": false,
    "created_at": "2026-03-01T00:00:00.000Z",
    "updated_at": "2026-03-01T00:00:00.000Z"
  }
}
```

**Pay user response:**
```json
{
  "success": true,
  "message": "Payment recorded for Juan dela Cruz.",
  "user": { "..." }
}
```

---

## Business Logic

### Payment Status

- `is_paid = true` → **Paid** (green badge)
- `is_paid = false` → **Unpaid** (red badge)
- If today's date > `monthly_payment_day` AND `is_paid = false` → **Overdue**

### Monthly Reset (Cron Job)

- **Schedule:** `0 0 1 * *` — runs at midnight on the **1st of every month**
- **Action:** Sets `is_paid = false` for all active users
- **Timezone:** Asia/Manila (Philippine Time)

### Duplicate Payment Prevention

- If a user already has `is_paid = true` and `last_payment_date` is in the current month/year → returns `400 Bad Request`

---

## Security

- Passwords hashed with **bcrypt** (salt rounds: 12)
- JWT tokens expire in **1 day**
- All `/users` routes protected by JWT middleware
- Input validation via **express-validator**
- Prisma ORM prevents SQL injection via parameterized queries
- CORS configured for frontend origin only

---

## Prisma Commands Reference

```bash
# Create migration
npx prisma migrate dev --name <name>

# Push schema (no migration history)
npx prisma db push

# View database in Prisma Studio
npm run prisma:studio

# Reset database
npx prisma migrate reset
```
