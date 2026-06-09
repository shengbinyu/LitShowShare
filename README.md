# LitShowShare

[English](#english) | [中文](#chinese)

---

<h2 id="english">English</h2>

A literature management web application for organizing, importing, and browsing academic papers. Features a navy-gold dark theme and a warm editorial light theme, with bilingual (English/Chinese) support and role-based user authentication.

## Features

- **User authentication** — JWT-based login with bcrypt password hashing
- **Role-based access** — Admin and regular user roles, with admin-only user management and data management pages
- **Anonymous browsing** — Visitors can browse the literature library and detail pages without logging in; only the **PDF file** and **full-text (cloud) link** are gated behind login. `Import`, `Admin Users`, and `Data Management` pages still require authentication.
- **Token-aware PDF delivery** — `/uploads/*` is protected by JWT; the frontend appends `?token=<jwt>` to PDF URLs so `<a target="_blank">` preview / download flows authenticate without manual header injection.
- **Show/hide password** — Toggle password visibility on the login form
- **Import papers** from RIS/BibTeX files, PDF uploads, and external links
- **Organize literature** with custom categories and tags
- **Full-text search** across titles, authors, abstracts, and keywords
- **Detail view** with metadata, abstracts, PDF viewer, linked resources, and inline editing mode
- **Data management** — Admin-only ZIP-based import/export with duplicate detection, diff comparison, and selective skip/overwrite
- **Equal-height literature cards** — Home page grid uses `auto-rows-fr` + three-section flex layout (header / abstract / footer) so every card has a consistent height and visual density, regardless of metadata length
- **Compact list view** — Alternate row-based literature display for denser browsing
- **Dual themes** — Navy-gold dark theme and warm ivory-gold editorial light theme
- **i18n support** — English and Chinese
- **Help page** — In-app documentation covering all features and usage

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query, React Router v7, Framer Motion |
| Backend  | Express.js, TypeScript, better-sqlite3, multer, bcryptjs, jsonwebtoken |
| Database | SQLite (WAL mode) |
| CI/CD    | GitHub Actions, GitLab CI, systemd + Nginx on Linux VPS |

## Project Structure

```
LitShowShare/
├── src/                    # Frontend source
│   ├── components/         # Reusable UI components
│   │   ├── Layout.tsx            # App shell with navbar, sidebar, auth gate, user dropdown
│   │   ├── CategoryNav.tsx       # Sidebar: category/tag navigation + management dialogs
│   │   ├── LiteratureCard.tsx    # Literature card (grid view) with category color strip
│   │   ├── LiteratureListItem.tsx # Literature list item (compact row view)
│   │   ├── MetadataDisplay.tsx   # Full detail: metadata, abstract, PDF, tags, links, inline edit
│   │   ├── StatsOverview.tsx     # Stats cards: total, categories, latest, sources
│   │   ├── FileUploader.tsx      # Drag-and-drop file upload for RIS/BibTeX
│   │   ├── HighlightText.tsx     # Search query text highlighter
│   │   ├── SearchBar.tsx         # Search input with sort toggle
│   │   └── Empty.tsx             # Empty state placeholder
│   ├── pages/
│   │   ├── Home.tsx              # Library grid with filter, sort, card/list toggle
│   │   ├── LiteratureDetail.tsx  # Literature detail with inline editing mode
│   │   ├── Import.tsx            # Import page: RIS/BibTeX/PDF/External Links tabs
│   │   ├── Login.tsx             # Login page with password visibility toggle
│   │   ├── AdminUsers.tsx        # Admin-only user management (create/delete/role)
│   │   ├── DataManagement.tsx    # Admin-only data import/export via ZIP
│   │   └── Help.tsx              # In-app help/documentation page
│   ├── hooks/
│   │   ├── useLiterature.ts      # React Query hooks + mutation actions
│   │   └── useTheme.ts           # Dark/light theme toggle
│   ├── store/
│   │   ├── literatureStore.ts    # Zustand: search, filter, sort, sidebar state
│   │   └── authStore.ts          # Zustand: user, token, auth persistence
│   ├── i18n/
│   │   ├── LanguageContext.tsx   # Language provider + useTranslation hook
│   │   └── translations.ts       # en/zh translation strings
│   ├── utils/
│   │   ├── api.ts                # API client with auto-auth headers
│   │   ├── db.ts                 # TypeScript model definitions
│   │   ├── bibtexParser.ts       # BibTeX format parser
│   │   ├── risParser.ts          # RIS format parser
│   │   └── urlValidator.ts       # URL validation utilities
│   └── lib/
│       └── utils.ts              # cn() helper for Tailwind class merging
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server entry
│   │   ├── db.ts                 # SQLite schema and initialization (users, literatures, etc.)
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT authenticate / requireAdmin / optionalAuth
│   │   └── routes/
│   │       ├── auth.ts           # Login, user profile, user CRUD (admin)
│   │       ├── literatures.ts    # Literature CRUD + tag management
│   │       ├── categories.ts     # Category CRUD
│   │       ├── tags.ts           # Tag CRUD with cascade cleanup
│   │       ├── externalLinks.ts  # External link CRUD
│   │       ├── upload.ts         # PDF file upload
│   │       └── dataManagement.ts # Data import/export (admin)
│   └── data/               # SQLite database (gitignored)
├── deploy/                 # Deployment scripts and configs
├── .github/workflows/      # GitHub Actions CI/CD
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
| POST   | /api/literatures/:id/tags | user | Add tag to literature |
| DELETE | /api/literatures/:id/tags/:tagId | user | Remove tag from literature |
| POST   | /api/upload/pdf | user | Upload a PDF file |
| GET    | /uploads/:filename | user | Serve uploaded PDF (accepts `Authorization` header **or** `?token=<jwt>` query parameter) |
| GET    | /api/categories | public | List categories |
| POST   | /api/categories | user | Create category |
| PUT    | /api/categories/:id | user | Update category |
| DELETE | /api/categories/:id | user | Delete category |
| GET    | /api/tags | public | List tags |
| POST   | /api/tags | user | Create tag |
| DELETE | /api/tags/:id | user | Delete tag (removes from all literature tagIds) |
| GET    | /api/external-links/:literatureId | public | List external links |
| POST   | /api/external-links | user | Create external link |
| DELETE | /api/external-links/:id | user | Delete external link |

### Data Management (admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | /api/data/export | admin | Export literature data as ZIP archive |
| POST   | /api/data/import | admin | Preview import from a ZIP archive |
| POST   | /api/data/import/confirm | admin | Execute confirmed import (with skip/overwrite decisions) |

Protected endpoints expect an `Authorization: Bearer <token>` header obtained from `/api/auth/login`. The `/uploads/*` route additionally accepts the token via a `?token=` query parameter so that browser-triggered downloads / new-tab previews can carry credentials.

## Frontend Routes

| Path | Component | Access | Description |
|------|-----------|--------|-------------|
| /login | Login | public | Login page |
| / | Home | public | Literature library grid with search, filter, sort |
| /literature/:id | LiteratureDetail | public | Full detail view + inline editing |
| /help | Help | public | In-app help/documentation |
| /import | Import | user | Multi-tab import: RIS, BibTeX, PDF, External Links |
| /admin/users | AdminUsers | admin | User management |
| /data-management | DataManagement | admin | Data import/export |

## License

[MIT](LICENSE)

---

<h2 id="chinese">中文</h2>

一款用于整理、导入和浏览学术论文的文献管理 Web 应用。提供海军蓝-金色暗色主题和暖白金色编辑亮色主题，支持中英双语和基于角色的用户认证。

## 功能特性

- **用户认证** — 基于 JWT 的登录，bcrypt 密码加密
- **角色权限** — 管理员和普通用户角色，管理员专属用户管理页面和数据管理页面
- **匿名浏览** — 访客无需登录即可浏览文献库和详情页；仅 **PDF 文件**和**全文（云端）链接**需要登录。`导入`、`管理用户`和`数据管理`页面仍需认证
- **Token 感知的 PDF 投递** — `/uploads/*` 受 JWT 保护；前端在 PDF URL 后附加 `?token=<jwt>`，使得 `<a target="_blank">` 预览/下载流程无需手动注入请求头即可认证
- **显示/隐藏密码** — 登录表单支持切换密码可见性
- **导入文献** — 支持 RIS/BibTeX 文件、PDF 上传和外部链接
- **文献整理** — 自定义分类和标签
- **全文搜索** — 按标题、作者、摘要和关键词搜索
- **详情视图** — 包含元数据、摘要、PDF 查看器、关联资源和内联编辑模式
- **数据管理** — 管理员专属 ZIP 导入/导出，支持重复检测、差异对比和选择性跳过/覆盖
- **等高文献卡片** — 首页网格使用 `auto-rows-fr` 配合三段式 flex 布局（标题区 / 摘要区 / 底部），确保每张卡片高度一致、视觉密度均匀
- **紧凑列表视图** — 基于行的紧凑文献展示，适合密集浏览
- **双主题** — 海军蓝-金色暗色主题和暖白金色编辑亮色主题
- **国际化** — 支持英文和中文
- **帮助页面** — 应用内文档，覆盖所有功能和使用说明

## 技术栈

| 层     | 技术 |
|--------|------|
| 前端   | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query, React Router v7, Framer Motion |
| 后端   | Express.js, TypeScript, better-sqlite3, multer, bcryptjs, jsonwebtoken |
| 数据库 | SQLite (WAL mode) |
| CI/CD  | GitHub Actions, GitLab CI, systemd + Nginx on Linux VPS |

## 项目结构

```
LitShowShare/
├── src/                    # 前端源码
│   ├── components/         # 可复用 UI 组件
│   │   ├── Layout.tsx            # 应用外壳：导航栏、侧边栏、认证守卫、用户下拉菜单
│   │   ├── CategoryNav.tsx       # 侧边栏：分类/标签导航 + 管理对话框
│   │   ├── LiteratureCard.tsx    # 文献卡片（网格视图）
│   │   ├── LiteratureListItem.tsx # 文献列表项（紧凑行视图）
│   │   ├── MetadataDisplay.tsx   # 详情：元数据、摘要、PDF、标签、链接、内联编辑
│   │   ├── StatsOverview.tsx     # 统计卡片：总数、分类数、最新、来源
│   │   ├── FileUploader.tsx      # 文件拖拽上传（RIS/BibTeX）
│   │   ├── HighlightText.tsx     # 搜索关键词高亮
│   │   ├── SearchBar.tsx         # 搜索输入 + 排序切换
│   │   └── Empty.tsx             # 空白占位
│   ├── pages/
│   │   ├── Home.tsx              # 文献库：筛选、排序、卡片/列表切换
│   │   ├── LiteratureDetail.tsx  # 文献详情 + 内联编辑
│   │   ├── Import.tsx            # 导入页：RIS/BibTeX/PDF/外部链接标签页
│   │   ├── Login.tsx             # 登录页（密码可见性切换）
│   │   ├── AdminUsers.tsx        # 管理员用户管理
│   │   ├── DataManagement.tsx    # 管理员数据导入/导出
│   │   └── Help.tsx              # 应用内帮助文档
│   ├── hooks/
│   │   ├── useLiterature.ts      # React Query hooks + 变更操作
│   │   └── useTheme.ts           # 暗色/亮色主题切换
│   ├── store/
│   │   ├── literatureStore.ts    # Zustand：搜索、筛选、排序、侧边栏状态
│   │   └── authStore.ts          # Zustand：用户、令牌、认证持久化
│   ├── i18n/
│   │   ├── LanguageContext.tsx   # 语言提供者 + useTranslation hook
│   │   └── translations.ts       # 中英文翻译字符串
│   ├── utils/
│   │   ├── api.ts                # API 客户端（自动附加认证头）
│   │   ├── db.ts                 # TypeScript 模型定义
│   │   ├── bibtexParser.ts       # BibTeX 解析器
│   │   ├── risParser.ts          # RIS 解析器
│   │   └── urlValidator.ts       # URL 验证工具
│   └── lib/
│       └── utils.ts              # cn() 工具函数
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express 服务入口
│   │   ├── db.ts                 # SQLite 表结构 + 初始化
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT 认证中间件
│   │   └── routes/
│   │       ├── auth.ts           # 登录、用户信息、用户管理（管理员）
│   │       ├── literatures.ts    # 文献 CRUD + 标签管理
│   │       ├── categories.ts     # 分类 CRUD
│   │       ├── tags.ts           # 标签 CRUD + 级联清理
│   │       ├── externalLinks.ts  # 外链 CRUD
│   │       ├── upload.ts         # PDF 上传
│   │       └── dataManagement.ts # 数据导入/导出（管理员）
│   └── data/               # SQLite 数据库文件（gitignored）
├── deploy/                 # 部署脚本和配置
├── .github/workflows/      # GitHub Actions CI/CD
└── dist/                   # 构建后的前端文件（gitignored）
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 开发

```bash
# 安装前端依赖
npm install

# 启动 Vite 开发服务器（默认 http://localhost:5173）
npm run dev

# 另开终端，启动后端
cd backend
npm install
npm run dev   # 后端运行在 http://localhost:3001
```

### 默认管理员账号

首次启动时，后端会自动创建默认管理员用户：

- 用户名：`admin`
- 密码：`admin123`

在将服务暴露到网络前，请修改密码（或通过用户管理页面创建新的管理员用户）。

### 生产构建

```bash
# 构建前端
npm run build

# 启动后端（提供前端静态文件 + API）
cd backend
npm install
npm start
```

## API 概览

### 认证

| 方法   | 路径 | 权限 | 描述 |
|--------|------|------|------|
| POST   | /api/auth/login | 公开 | 用户认证，返回 `{ token, user }` |
| GET    | /api/auth/me | 用户 | 获取当前用户信息 |
| GET    | /api/auth/users | 管理员 | 用户列表 |
| POST   | /api/auth/users | 管理员 | 创建用户 |
| PUT    | /api/auth/users/:id | 管理员 | 更新用户 |
| DELETE | /api/auth/users/:id | 管理员 | 删除用户 |

### 文献与内容

| 方法   | 路径 | 权限 | 描述 |
|--------|------|------|------|
| GET    | /api/literatures | 公开 | 文献列表（仅元数据；PDF/云端链接在前端控制显示） |
| POST   | /api/literatures | 用户 | 创建文献 |
| GET    | /api/literatures/:id | 公开 | 获取文献详情 |
| PUT    | /api/literatures/:id | 用户 | 更新文献 |
| DELETE | /api/literatures/:id | 用户 | 删除文献 |
| POST   | /api/literatures/:id/tags | 用户 | 添加标签到文献 |
| DELETE | /api/literatures/:id/tags/:tagId | 用户 | 从文献移除标签 |
| POST   | /api/upload/pdf | 用户 | 上传 PDF 文件 |
| GET    | /uploads/:filename | 用户 | 提供 PDF 文件（支持 `Authorization` 请求头 **或** `?token=<jwt>` 查询参数） |
| GET    | /api/categories | 公开 | 分类列表 |
| POST   | /api/categories | 用户 | 创建分类 |
| PUT    | /api/categories/:id | 用户 | 更新分类 |
| DELETE | /api/categories/:id | 用户 | 删除分类 |
| GET    | /api/tags | 公开 | 标签列表 |
| POST   | /api/tags | 用户 | 创建标签 |
| DELETE | /api/tags/:id | 用户 | 删除标签（从所有文献 tagIds 中移除） |
| GET    | /api/external-links/:literatureId | 公开 | 外部链接列表 |
| POST   | /api/external-links | 用户 | 创建外部链接 |
| DELETE | /api/external-links/:id | 用户 | 删除外部链接 |

### 数据管理（管理员专属）

| 方法   | 路径 | 权限 | 描述 |
|--------|------|------|------|
| GET    | /api/data/export | 管理员 | 导出文献数据为 ZIP 压缩包 |
| POST   | /api/data/import | 管理员 | 预览导入 ZIP 压缩包 |
| POST   | /api/data/import/confirm | 管理员 | 执行确认的导入（含跳过/覆盖决定） |

受保护的端点需要在请求头中携带从 `/api/auth/login` 获取的 `Authorization: Bearer <token>`。`/uploads/*` 路由额外支持通过 `?token=` 查询参数传递 token，以便浏览器触发的下载/新标签预览可以携带认证信息。

## 前端路由

| 路径 | 组件 | 权限 | 描述 |
|------|------|------|------|
| /login | Login | 公开 | 登录页 |
| / | Home | 公开 | 文献库首页，支持搜索、筛选、排序 |
| /literature/:id | LiteratureDetail | 公开 | 详情视图 + 内联编辑 |
| /help | Help | 公开 | 应用内帮助文档 |
| /import | Import | 用户 | 多标签导入：RIS、BibTeX、PDF、外部链接 |
| /admin/users | AdminUsers | 管理员 | 用户管理 |
| /data-management | DataManagement | 管理员 | 数据导入/导出 |

## 许可证

[MIT](LICENSE)
