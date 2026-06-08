# LitShowShare

A literature management web application for organizing, importing, and browsing academic papers. Features a navy-gold dark theme and a warm editorial light theme, with bilingual (English/Chinese) support and role-based user authentication.

## Features

- **User authentication** — JWT-based login with bcrypt password hashing
- **Role-based access** — Admin and regular user roles, with an admin-only user management page
- **Anonymous browsing** — Visitors can browse the literature library and detail pages without logging in; only the **PDF file** and **full-text (cloud) link** are gated behind login. `Import` and `Admin Users` pages still require authentication.
- **Token-aware PDF delivery** — `/uploads/*` is protected by JWT; the frontend appends `?token=<jwt>` to PDF URLs so `<a target="_blank">` preview / download flows authenticate without manual header injection.
- **Show/hide password** — Toggle password visibility on the login form
- **Import papers** from RIS/BibTeX files, PDF uploads, and external links
- **Organize literature** with custom categories and tags
- **Full-text search** across titles, authors, abstracts, and keywords
- **Detail view** with metadata, abstracts, PDF viewer, and linked resources
- **Equal-height literature cards** — Home page grid uses `auto-rows-fr` + three-section flex layout (header / abstract / footer) so every card has a consistent height and visual density, regardless of metadata length
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

#### 方式 A：systemd + Nginx（裸机部署）

See `deploy/deploy.sh` for the automated deployment script using systemd and Nginx reverse proxy.

#### 方式 B：GitHub Actions → 阿里云 ACR → 阿里云 ECS（推荐）

代码推送到 `main` / `master`（或打 `v*.*.*` tag）后，由 [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) 自动完成：

1. **build-and-push**：在 GitHub Runner 上构建多架构镜像并推送到阿里云 ACR
2. **deploy-to-ecs**：通过 SSH 登录 ECS，执行 `docker compose pull && docker compose up -d`，并做健康校验

ECS 端首次准备（一次性，**以 root 运行**）：

```bash
# 上传仓库或 git clone 后，在仓库根目录执行：
sudo bash deploy/ecs-bootstrap.sh --repo https://github.com/<your-user>/LitShowShare.git
# 上述脚本会自动：
#   - 安装 Docker CE + compose plugin（阿里云源）
#   - 创建非 root 用户 deploy（uid/gid 1000），加入 docker 组，禁用密码登录
#   - 把 /opt/litshowshare 及 .env / docker-compose.yml 的属主交给 deploy
# 然后编辑 /opt/litshowshare/.env，填入 IMAGE_REGISTRY / IMAGE_NAMESPACE / IMAGE_NAME
```

为 GitHub Actions 生成专用 SSH 密钥（**以 deploy 用户**，绝不复用个人 key）：

```bash
sudo -u deploy ssh-keygen -t ed25519 -N '' -C github-actions \
  -f /home/deploy/.ssh/gha_deploy
sudo -u deploy sh -c 'cat /home/deploy/.ssh/gha_deploy.pub >> /home/deploy/.ssh/authorized_keys'
sudo cat /home/deploy/.ssh/gha_deploy   # 整段（含 BEGIN/END）粘到 GitHub Secret ECS_SSH_KEY
```

需要在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置：

| Secret 名 | 用途 | 使用阶段 |
| --- | --- | --- |
| `ACR_REGISTRY` | 阿里云 ACR 地址，如 `registry.cn-hangzhou.aliyuncs.com` | build & deploy |
| `ACR_NAMESPACE` | ACR 命名空间 | build |
| `ACR_IMAGE` | 镜像名（如 `litshowshare`） | build |
| `ACR_USERNAME` | ACR push 账号 | build |
| `ACR_PASSWORD` | ACR push 密码 | build |
| `ECS_HOST` | ECS 公网 IP 或域名 | deploy |
| `ECS_USER` | SSH 登录用户，**填 `deploy`**（非 root） | deploy |
| `ECS_PORT` | SSH 端口（可选，默认 22） | deploy |
| `ECS_SSH_KEY` | `deploy` 用户私钥（PEM 格式） | deploy |

> ACR 仓库当前为 **公开仓库**，ECS 端 `docker compose pull` 无需 `docker login`。
> 如未来切回私有仓库，需要在 deploy 步骤前补充 `docker login` 并把 `ACR_USERNAME` / `ACR_PASSWORD` 一并传给 deploy job。

回滚方式：在 ECS 上指定历史 tag 即可：

```bash
cd /opt/litshowshare
IMAGE_TAG=<git-short-sha-or-v-tag> docker compose up -d
```

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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | /api/literatures | public | List all literatures (metadata only; PDF/cloud links shown but gated on the client) |
| POST   | /api/literatures | user | Create a literature |
| GET    | /api/literatures/:id | public | Get literature details |
| PUT    | /api/literatures/:id | user | Update literature |
| DELETE | /api/literatures/:id | user | Delete literature |
| POST   | /api/upload/pdf | user | Upload a PDF file |
| GET    | /uploads/:filename | user | Serve uploaded PDF (accepts `Authorization` header **or** `?token=<jwt>` query parameter) |
| GET    | /api/categories | public | List categories |
| POST   | /api/categories | user | Create category |
| GET    | /api/tags | public | List tags |
| POST   | /api/tags | user | Create tag |
| GET    | /api/external-links/:literatureId | public | List external links |

Protected endpoints expect an `Authorization: Bearer <token>` header obtained from `/api/auth/login`. The `/uploads/*` route additionally accepts the token via a `?token=` query parameter so that browser-triggered downloads / new-tab previews can carry credentials.

## License

[MIT](LICENSE)
