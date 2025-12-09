# 🔧 FIX: Set VITE_API_URL in Vercel (URGENT!)

## ❌ Current Problem

**Error:** `VITE_API_URL: undefined`
**Result:** Frontend trying to call `https://feerowdafeems.vercel.app/api/auth/login` → 405 Error

**Why:** Vercel doesn't have the backend URL configured, so it's trying to use the frontend domain instead of your Render backend.

---

## ✅ SOLUTION: Set Environment Variable in Vercel

### Step 1: Go to Vercel Dashboard

1. **Open:** https://vercel.com/dashboard
2. **Login** to your account
3. **Find** your project: `feerowdafeems` or `ROWDAFEEMS`
4. **Click** on the project name

---

### Step 2: Go to Settings

1. **Click** "Settings" tab (top menu)
2. **Click** "Environment Variables" (left sidebar)

---

### Step 3: Add Environment Variable

1. **Click** "Add New" button
2. **Fill in:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://bakend-rowdafeems.onrender.com/api`
   - **Environment:** Select ALL:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

3. **Click** "Save"

---

### Step 4: Redeploy (CRITICAL!)

**⚠️ IMPORTANT:** After setting the environment variable, you MUST redeploy!

1. **Go to** "Deployments" tab
2. **Find** latest deployment
3. **Click** "..." menu → **"Redeploy"**
4. **Click** "Redeploy" to confirm
5. **Wait** 2-5 minutes for build

**Why?** Environment variables in Vite are embedded at BUILD TIME, not runtime!

---

## 🔍 Verify It's Set Correctly

### After Redeploying:

1. **Go to:** https://feerowdafeems.vercel.app
2. **Open Browser Console (F12)**
3. **Look for:**
   ```
   VITE_API_URL: https://bakend-rowdafeems.onrender.com/api
   API Base URL configured: https://bakend-rowdafeems.onrender.com/api
   ```
4. **If you see:** `VITE_API_URL: undefined` → Environment variable not set or not redeployed!

---

## 📋 Quick Checklist

- [ ] Went to Vercel Dashboard
- [ ] Clicked project → Settings → Environment Variables
- [ ] Added `VITE_API_URL` = `https://bakend-rowdafeems.onrender.com/api`
- [ ] Selected ALL environments (Production, Preview, Development)
- [ ] Clicked "Save"
- [ ] Went to Deployments tab
- [ ] Clicked "Redeploy" on latest deployment
- [ ] Waited for build (2-5 min)
- [ ] Cleared browser cache
- [ ] Tested login - should work! ✅

---

## 🎯 What This Fixes

**Before:**
- ❌ `VITE_API_URL: undefined`
- ❌ Calls: `https://feerowdafeems.vercel.app/api/auth/login`
- ❌ Result: 405 Error

**After:**
- ✅ `VITE_API_URL: https://bakend-rowdafeems.onrender.com/api`
- ✅ Calls: `https://bakend-rowdafeems.onrender.com/api/auth/login`
- ✅ Result: Login works! ✅

---

## 🆘 Still Not Working?

### Check 1: Environment Variable Format

**Correct:**
```
VITE_API_URL = https://bakend-rowdafeems.onrender.com/api
```

**Wrong:**
```
VITE_API_URL = https://bakend-rowdafeems.onrender.com/api/  (trailing slash)
VITE_API_URL = bakend-rowdafeems.onrender.com/api  (missing https://)
VITE_API_URL = https://bakend-rowdafeems.onrender.com  (missing /api)
```

### Check 2: Redeployment

- Environment variables only work after redeploy!
- Check deployment logs to see if variable is loaded
- Look for: `VITE_API_URL` in build logs

### Check 3: Backend URL

- Verify backend is working: `https://bakend-rowdafeems.onrender.com/api/health`
- Should return: `{"status":"ok","message":"Server is running"}`

---

## 🎯 Summary

**The Problem:** `VITE_API_URL` not set in Vercel
**The Fix:** Set it in Settings → Environment Variables
**The Action:** Redeploy after setting!

**After this, login will work!** 🚀

