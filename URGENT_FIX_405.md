# 🚨 URGENT: Fix 405 Error - Step by Step

## ❌ Current Error

```
POST https://rowdafeems-cu97.vercel.app/api/auth/login 405 (Method Not Allowed)
```

**Problem:** Frontend is trying to call API on Vercel domain instead of your backend server.

---

## ✅ Solution: 2 Critical Steps

### Step 1: Set Environment Variable in Vercel ⚠️ REQUIRED

**This is THE MOST IMPORTANT step!**

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Login if needed

2. **Open Your Project:**
   - Click on: `rowdafeems-cu97` (or your project name)

3. **Go to Settings:**
   - Click **"Settings"** tab (top menu)

4. **Open Environment Variables:**
   - Click **"Environment Variables"** (left sidebar)

5. **Add New Variable:**
   - Click **"Add New"** button
   - Fill in:
     - **Key:** `VITE_API_URL`
     - **Value:** `https://YOUR-BACKEND-URL.onrender.com/api`
       - ⚠️ **YOU MUST REPLACE THIS WITH YOUR ACTUAL BACKEND URL!**
       - Example: `https://rowdafee-backend-abc123.onrender.com/api`
   
6. **Select Environments:**
   - ✅ Check **Production**
   - ✅ Check **Preview**
   - ✅ Check **Development**

7. **Save:**
   - Click **"Save"** button

---

### Step 2: Redeploy Your Frontend

After adding the environment variable:

1. **Go to Deployments:**
   - Click **"Deployments"** tab (top menu)

2. **Redeploy:**
   - Find your latest deployment
   - Click the **"..."** (three dots) button
   - Click **"Redeploy"**
   - Click **"Redeploy"** again to confirm
   - Wait 2-5 minutes for deployment

---

## 🔍 How to Find Your Backend URL

### If Backend is on Render:

1. Go to: https://dashboard.render.com
2. Login to your account
3. Click on your **Web Service** (backend service)
4. Copy the URL shown at the top (looks like: `https://xxxxx.onrender.com`)
5. Add `/api` to the end
6. Example: `https://rowdafee-backend-abc123.onrender.com/api`

### If Backend is on Another Service:

- Your backend URL + `/api`
- Example: `https://your-backend.railway.app/api`
- Example: `https://your-backend.herokuapp.com/api`

---

## 🧪 Test Your Backend First

Before fixing the frontend, verify your backend is working:

1. Open browser
2. Visit: `https://your-backend-url.onrender.com/api/health`
3. You should see: `{"status":"ok","message":"Server is running"}`

**If this doesn't work, your backend might not be running or accessible!**

---

## ⏱️ Timeline

1. ✅ **Now:** Add `VITE_API_URL` in Vercel (2 minutes)
2. ✅ **Now:** Redeploy frontend (2-5 minutes wait)
3. ✅ **After:** Test login - error should be gone!

---

## ❓ Common Issues

### Q: I don't have a backend URL yet
**A:** You need to deploy your backend first:
- Deploy backend to Render (or another service)
- Get the backend URL
- Then set `VITE_API_URL` in Vercel

### Q: Where do I deploy the backend?
**A:** Recommended services:
- **Render** (Free): https://render.com
- **Railway**: https://railway.app
- **Heroku**: https://heroku.com

### Q: The error is still there after redeploying
**A:** Try:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Wait 2-3 more minutes (deployment might still be processing)
4. Check Vercel deployment logs for errors
5. Verify `VITE_API_URL` is set correctly (must end with `/api`)

### Q: How do I know if VITE_API_URL is set?
**A:** 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. You should see `VITE_API_URL` in the list
3. Click on it to see/edit the value

---

## ✅ Quick Checklist

- [ ] Found my backend URL (e.g., `https://xxxxx.onrender.com`)
- [ ] Added `VITE_API_URL` in Vercel Dashboard
- [ ] Value is full URL ending with `/api`
- [ ] All 3 environments checked (Production, Preview, Development)
- [ ] Saved the environment variable
- [ ] Redeployed the frontend
- [ ] Waited for deployment to complete (2-5 minutes)
- [ ] Tested backend: `https://your-backend.onrender.com/api/health` works
- [ ] Tested login on Vercel site
- [ ] Error is fixed! 🎉

---

## 📞 Still Not Working?

1. **Check Vercel Deployment Logs:**
   - Go to Deployments → Click on latest deployment → View logs
   - Look for build errors

2. **Verify Environment Variable:**
   - Settings → Environment Variables
   - Make sure `VITE_API_URL` exists and is correct

3. **Test Backend Directly:**
   - Visit: `https://your-backend.onrender.com/api/health`
   - Should return JSON with status

4. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear all cache in browser settings

---

**Follow these steps EXACTLY and the 405 error will be fixed!** 🚀

