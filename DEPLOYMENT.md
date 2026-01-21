# 🚀 Vercel Deployment Guide

## Deployment Status: ✅ LIVE

Your Kiosk Attendance System has been successfully deployed to Vercel!

---

## 📱 Live URLs

| Application | Production URL | Status |
|------------|----------------|--------|
| **Frontend Dashboard** | https://kiosk-attendance-dashboard.vercel.app | ✅ Live |
| **Backend API** | https://kiosk-attendance-api.vercel.app | ✅ Live |

---

## 🔧 Environment Variables

### Frontend Environment Variables
The frontend uses the following environment variable:

- `VITE_API_URL` - Points to the production backend API
  - **Value**: `https://kiosk-attendance-api.vercel.app/api`
  - **Environment**: Production
  - **Status**: ✅ Configured

### Backend Environment Variables
The backend has the following environment variables configured:

- `NODE_ENV` - Node environment mode
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - JWT token secret
- `QR_ENCRYPTION_KEY` - QR code encryption key

All backend environment variables are encrypted and properly configured in Vercel.

---

## 🔄 Redeployment Commands

### Deploy Frontend
```bash
cd frontend
vercel --prod
```

### Deploy Backend
```bash
cd backend
vercel --prod
```

### Force Rebuild (Skip Cache)
```bash
# Frontend
cd frontend
vercel --prod --force

# Backend
cd backend
vercel --prod --force
```

---

## 🛠️ Managing Environment Variables

### View Environment Variables
```bash
# Frontend
cd frontend
vercel env ls

# Backend
cd backend
vercel env ls
```

### Add New Environment Variable
```bash
vercel env add VARIABLE_NAME production
```

### Pull Environment Variables Locally
```bash
vercel env pull .env.production
```

### Remove Environment Variable
```bash
vercel env rm VARIABLE_NAME production
```

---

## 📊 Monitoring & Logs

### View Deployment Logs
Visit the Vercel dashboard:
- Frontend: https://vercel.com/reymarksuan121298-maxs-projects/kiosk-attendance-dashboard
- Backend: https://vercel.com/reymarksuan121298-maxs-projects/kiosk-attendance-api

### Real-time Logs
```bash
# Frontend
cd frontend
vercel logs

# Backend
cd backend
vercel logs
```

---

## 🔐 Security Checklist

- ✅ All sensitive environment variables are encrypted
- ✅ CORS configured for frontend domain
- ✅ JWT authentication enabled
- ✅ QR code encryption enabled
- ✅ Supabase Row Level Security (RLS) enabled

---

## 📝 Configuration Files

### Frontend: `vercel.json`
```json
{
    "version": 2,
    "rewrites": [
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ]
}
```

### Backend: `vercel.json`
```json
{
    "version": 2,
    "builds": [
        {
            "src": "src/index.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "src/index.js"
        }
    ]
}
```

---

## 🐛 Troubleshooting

### Frontend Not Connecting to Backend
1. Verify `VITE_API_URL` is set correctly in Vercel dashboard
2. Check CORS settings in backend allow your frontend domain
3. Redeploy frontend: `vercel --prod --force`

### Backend 500 Errors
1. Check environment variables are set correctly
2. View logs: `vercel logs`
3. Verify Supabase connection

### Build Failures
1. Check build logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Clear build cache and redeploy: `vercel --prod --force`

---

## 📞 Quick Links

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**Last Updated**: 2026-01-21
**Deployed By**: Antigravity AI Assistant
