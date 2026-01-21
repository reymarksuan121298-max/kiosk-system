# 🏢 Teller Kiosk Attendance System

A comprehensive attendance management system for teller stations using QR code scanning, GPS/location validation, and real-time alarm triggering.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-cyan)

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Database Setup](#-database-setup)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Project Structure](#-project-structure)

## ✨ Features

### Core Features

- **🔐 QR Code Generation & Scanning**
  - Admin-only QR code generation
  - Encrypted, non-expiring QR codes
  - Kiosk-based assignment
  - Prevention of unauthorized duplication

- **📍 GPS & Geofencing**
  - Real-time GPS coordinate capture
  - Configurable geofence radius (10-30+ meters)
  - Interactive map visualization (OpenStreetMap satellite)
  - GPS spoofing detection

- **⏰ Attendance Tracking**
  - Check-in and Check-out support
  - Timestamped records with full metadata
  - Employee and kiosk information tracking
  - Offline mode with delayed sync

- **🚨 Alarm System**
  - Invalid/revoked QR code detection
  - Geofence violation alerts
  - Multiple scan detection
  - GPS spoofing warnings
  - Real-time admin notifications

- **📊 Admin Dashboard**
  - Real-time attendance logs
  - Map-based visualization
  - Employee & kiosk management
  - Report export (CSV/PDF)
  - Audit logging

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Admin Panel  │  │ QR Scanner   │  │ Map View     │          │
│  │ (Vite+React) │  │ (HTML5-QR)   │  │ (Leaflet)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend (Express.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Module  │  │ Attendance   │  │ Alarm Engine │          │
│  │ (JWT/RBAC)   │  │ Processing   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                   Supabase PostgreSQL                            │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────┐ ┌────────┐        │
│  │ Users  │ │Employees│ │ Kiosks │ │Alarms│ │Audit   │        │
│  └────────┘ └─────────┘ └────────┘ └──────┘ │Logs    │        │
│                                             └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TailwindCSS v3 |
| Backend | Express.js + Node.js |
| Database | Supabase PostgreSQL |
| Maps | OpenStreetMap (Leaflet) with Satellite tiles |
| QR Codes | qrcode + html5-qrcode |
| Auth | JWT + bcrypt |
| State | Zustand |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone & Install

```bash
# Clone the repository
cd kiosk-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend (.env)**
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# QR Encryption
QR_ENCRYPTION_KEY=your_32_character_encryption_key

# Geofence
DEFAULT_GEOFENCE_RADIUS=30
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Set Up Database

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the schema from `backend/database/schema.sql`
4. Create a storage bucket named `qr-images`

### 4. Start Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

### 5. Default Login

```
Email: admin@kioskattendance.com
Password: admin123 (change in production!)
```

## 📁 Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- See backend/database/schema.sql for complete schema
```

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | Admin and system users |
| `employees` | Teller employees |
| `kiosks` | Kiosk locations with GPS |
| `qr_codes` | Generated QR codes |
| `attendance_logs` | Check-in/out records |
| `alarms` | Security alerts |
| `audit_logs` | System activity logs |

## 📚 API Documentation

### Authentication
```
POST /api/auth/login          - User login
POST /api/auth/register       - Register new user
GET  /api/auth/me             - Get current user
PUT  /api/auth/change-password - Change password
```

### Employees
```
GET    /api/employees         - List employees
GET    /api/employees/:id     - Get employee
POST   /api/employees         - Create employee
PUT    /api/employees/:id     - Update employee
DELETE /api/employees/:id     - Delete employee
```

### Kiosks
```
GET    /api/kiosks            - List kiosks
GET    /api/kiosks/:id        - Get kiosk with geofence
POST   /api/kiosks            - Create kiosk
PUT    /api/kiosks/:id        - Update kiosk
DELETE /api/kiosks/:id        - Delete kiosk
```

### Attendance
```
POST /api/attendance/scan     - Record attendance
GET  /api/attendance          - List attendance logs
GET  /api/attendance/today    - Today's summary
POST /api/attendance/sync     - Sync offline records
```

### QR Codes
```
POST   /api/qrcodes/generate  - Generate QR code
GET    /api/qrcodes           - List QR codes
PUT    /api/qrcodes/:id/revoke - Revoke QR code
DELETE /api/qrcodes/:id       - Delete QR code
```

### Alarms
```
GET /api/alarms               - List alarms
GET /api/alarms/recent        - Recent unresolved
PUT /api/alarms/:id/resolve   - Resolve alarm
```

## 🔒 Security

### Implemented Security Measures

1. **QR Code Security**
   - AES encryption for QR data
   - Unique signatures per code
   - Revocation capability

2. **GPS Security**
   - Coordinate validation
   - Speed-based spoofing detection
   - Geofence enforcement

3. **Authentication**
   - JWT tokens with expiration
   - bcrypt password hashing
   - Role-based access control (RBAC)

4. **Data Protection**
   - Row Level Security (RLS) in Supabase
   - Encrypted sensitive data
   - Audit logging

## 📂 Project Structure

```
kiosk-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Supabase client
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API routes
│   │   ├── utils/           # QR, geofence, alarms
│   │   └── index.js         # Entry point
│   ├── database/
│   │   └── schema.sql       # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── layouts/         # MainLayout
│   │   ├── pages/           # All pages
│   │   ├── services/        # API client
│   │   ├── store/           # Zustand stores
│   │   ├── App.jsx          # Router
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## 📱 User Flows

### Teller Flow
1. Open Scanner page
2. Enter Employee ID
3. Allow GPS location
4. Scan QR code at kiosk
5. Receive confirmation/error

### Admin Flow
1. Log into dashboard
2. Add/manage kiosks with GPS coordinates
3. Add/manage employees
4. Generate QR codes for kiosks
5. Monitor attendance & resolve alarms
6. Export reports

## 🎨 UI Features

- **Dark Mode**: Premium dark theme with glassmorphism
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions and micro-interactions
- **Real-time**: Live updates for alarms and notifications
- **Interactive Maps**: Satellite view with geofence visualization

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Support

For issues and feature requests, please use the issue tracker.

---

Built with ❤️ for secure attendance management.
