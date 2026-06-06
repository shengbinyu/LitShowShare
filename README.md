# LitShowShare

A literature management web application for organizing, importing, and browsing academic papers. Features a navy-gold dark theme and a warm editorial light theme, with bilingual (English/Chinese) support and role-based user authentication.

## Features

- **User authentication** — JWT-based login with bcrypt password hashing
- **Role-based access** — Admin and regular user roles, with an admin-only user management page
- **Show/hide password** — Toggle password visibility on the login form
- **Import papers** from RIS/BibTeX files, PDF uploads, and external links
- **Organize literature** with custom categories and tags
- **Full-text search** across titles, authors, abstracts, and keywords
- **Detail view** with metadata, abstracts, PDF viewer, and linked resources
- **Dual themes** — Navy-gold dark theme and warm ivory-gold editorial light theme
- **i18n support** — English and Chinese

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query, React Router v7, Framer Motion |
| Backend  | Express.js, TypeScript, better-sqlite3, multer, bcryptjs, jsonwebtoken |
| Database | SQLite (WAL mode) |
| CI/CD    | GitLab CI, systemd + Nginx on Linux VPS |

## Project Structure

```
LitShowShare/
├── src/                    # Frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route pages (Home, LiteratureDetail, Import, Login, AdminUsers)
│   ├── hooks/              # React Query hooks + theme hook
│   ├── store/              # Zustand state (literatureStore, authStore)
│   ├── i18n/               # Translation files (en/zh)
│   └── utils/              # API client, parsers, utilities
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express server entry
│   │   ├── db.ts           # SQLite schema and initialization (incl. users table)
│   │   ├── middleware/     # JWT authenticate / requireAdmin middleware
│   │   └── routes/         # API route handlers (auth, literatures, ...)
│   └── data/               # SQLite database (gitignored)
├── deploy/                 # Deployment scripts and configs
└── dist/                   # Built frontend (gitignored)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Development

```bash
# Install frontend dependencies
npm install

# Start Vite dev server (default: http://localhost:5173)
npm run dev

# In a separate terminal, start the backend
cd backend
npm install
npm run dev   # Backend runs on http://localhost:3001
```

### Default Admin Account

On first startup the backend seeds a default admin user:

- Username: `admin`
- Password: `admin123`

Please change the password (or create new admin users via the user management page) before exposing the service to a network.

### Production Build

```bash
# Build frontend
npm run build

# Start backend (serves frontend static files + API)
cd backend
npm install
npm start
```

### Deployment

See `deploy/deploy.sh` for the automated deployment script using systemd and Nginx reverse proxy.

## API Overview

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/auth/login | public | Authenticate user, returns `{ token, user }` |
| GET    | /api/auth/me | user | Get the current user profile |
| GET    | /api/auth/users | admin | List all users |
| POST   | /api/auth/users | admin | Create a user |
| PUT    | /api/auth/users/:id | admin | Update a user |
| DELETE | /api/auth/users/:id | admin | Delete a user |

### Literature & content

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/literatures | List all literatures |
| POST   | /api/literatures | Create a literature |
| GET    | /api/literatures/:id | Get literature details |
| PUT    | /api/literatures/:id | Update literature |
| DELETE | /api/literatures/:id | Delete literature |
| POST   | /api/upload/pdf | Upload a PDF file |
| GET    | /api/categories | List categories |
| POST   | /api/categories | Create category |
| GET    | /api/tags | List tags |
| POST   | /api/tags | Create tag |
| GET    | /api/external-links/:literatureId | List external links |

Protected endpoints expect a `Authorization: Bearer <token>` header obtained from `/api/auth/login`.

## License

[MIT](LICENSE)
