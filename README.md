# CampusFix 🛠️
> **Campus Facility Complaint & Service Request System**
> Production-quality facility management portal for university campuses.

CampusFix streamlines reporting, tracking, triaging, and dispatching facility maintenance complaints (electrical, plumbing, HVAC, civil, cleanliness, safety hazards) across campus buildings and rooms.

---

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **Language**: TypeScript (strict mode)
- **Database & ORM**: PostgreSQL with [Prisma](https://www.prisma.io/)
- **Styling**: Tailwind CSS with custom institutional blue/navy design palette
- **Authentication**: Custom email/password with `bcryptjs` password hashing and signed JWT sessions (`jose`) in `httpOnly` secure cookies
- **Validation**: [Zod](https://zod.dev/) schema validation on all inputs
- **Storage**: Cloudinary with seamless local `/public/uploads` disk fallback
- **Testing**: Jest with unit and API tests
- **Containerization & CI**: Docker, Docker Compose, GitHub Actions CI

---

## 🎨 Design System & Color Palette

- **Navy (`#1B365D`)**: Sidebar, top bar, headers, page titles
- **Blue (`#005A9C`)**: Primary action buttons, active navigation, links
- **Sky (`#60C1E5`)**: Accents, focus rings, progress indicators
- **Ice (`#A0E0EF`)**: Hover rows, selected states, badge backgrounds
- **Semantic Colors**:
  - 🔴 **Red (`#DC2626`)**: Critical priority, overdue notices, rejected tickets
  - 🟠 **Orange (`#EA580C`)**: High priority
  - 🟡 **Amber (`#D97706`)**: Medium priority, On Hold, Needs Info
  - 🟢 **Green (`#16A34A`)**: Resolved, Closed
  - 🔘 **Slate (`#64748B`)**: Low priority, Merged, Cancelled

---

## 👥 User Roles & Permissions

| Role | Access Scope | Default Home |
| :--- | :--- | :--- |
| **REPORTER** (Students, Staff, Lecturers) | Submit complaints, view and track own tickets | `/requests` |
| **ADMIN** (Facilities Dispatcher) | Full ticket inbox, triage, assign technicians, master data, user directory | `/inbox` |
| **TECHNICIAN** (Maintenance Crews) | View assigned jobs, update work status (In Progress, On Hold, Resolve) | `/jobs` |
| **UNIT_HEAD** (Management) | High-level facility dashboard, analytics, read-only ticket inbox | `/dashboard` |

---

## 🔑 Demo Login Credentials

All demo accounts use the standard password: **`Password123!`**

| Role | Email Address | Notes |
| :--- | :--- | :--- |
| **Admin** | `admin@campusfix.edu` | Facilities dispatcher & master data manager |
| **Unit Head** | `unithead@campusfix.edu` | Facilities director / executive view |
| **Technician (Electrical)** | `tech.electrical@campusfix.edu` | Assigned electrical maintenance jobs |
| **Technician (Plumbing)** | `tech.plumbing@campusfix.edu` | Assigned plumbing & water jobs |
| **Technician (HVAC)** | `tech.hvac@campusfix.edu` | Assigned air conditioning jobs |
| **Reporter (Student)** | `reporter1@campusfix.edu` | Student sample reporter |
| **Reporter (Lecturer)** | `reporter2@campusfix.edu` | Faculty sample reporter |
| **Reporter (Staff)** | `reporter3@campusfix.edu` | Administrative staff reporter |

> *Tip: The login page includes quick-fill buttons to test any role with a single click.*

---

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
- Node.js 20+ installed
- Docker & Docker Compose (or a local PostgreSQL instance)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

### 4. Start PostgreSQL (Docker Compose)
```bash
docker compose up -d postgres
```

### 5. Initialize Database & Seed Sample Data
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 6. Run the Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Code Quality

Run unit test suites:
```bash
npm run test
```

Run test suite with coverage report:
```bash
npm run test:coverage
```

Run linter:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## 🐳 Docker Deployment

To build and run the full stack (application + PostgreSQL container) in Docker:
```bash
docker compose up --build -d
```
Access the application at [http://localhost:3000](http://localhost:3000).

---

## 🩺 System Health Check

CampusFix provides an automated health status endpoint:
```
GET /api/health
```
Response format:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": "124s",
  "database": "connected",
  "timestamp": "2026-11-23T22:30:00.000Z"
}
```
