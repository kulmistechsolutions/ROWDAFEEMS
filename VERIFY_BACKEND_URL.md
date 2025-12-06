# 🔍 Verify Your Backend URL

## ⚠️ Potential Issue Found

I see your `VITE_API_URL` is set to:
```
https://bakend-rowdafeems.onrender.com/api
```

**Notice:** The URL has "bakend" (which might be a typo for "backend").

---

## ✅ Steps to Verify

### Step 1: Check Your Actual Backend URL

1. Go to: https://dashboard.render.com
2. Login to your account
3. Look for your backend service
4. Click on it
5. Check the URL shown at the top

**What to check:**
- Is it `bakend-rowdafeems` or `backend-rowdafeems`?
- Copy the EXACT URL

### Step 2: Test Your Backend URL

Test if your backend is accessible:

1. Open browser
2. Try this URL: `https://bakend-rowdafeems.onrender.com/api/health`
   - If it works → Your backend URL is correct!
   - If it doesn't work → The URL might be wrong

3. Also try: `https://backend-rowdafeems.onrender.com/api/health`
   - (if you have a service named "backend" instead)

### Step 3: Fix the URL if Needed

If the URL in Vercel is wrong:

1. Go back to Vercel Dashboard
2. Settings → Environment Variables
3. Click on `VITE_API_URL`
4. Edit the Value to the correct backend URL
5. Make sure it ends with `/api`
6. Save
7. **Redeploy** your frontend

---

## 🧪 Quick Test Commands

You can test your backend URL using these commands:

**Windows PowerShell:**
```powershell
# Test 1: bakend URL
curl https://bakend-rowdafeems.onrender.com/api/health

# Test 2: backend URL (if different)
curl https://backend-rowdafeems.onrender.com/api/health
```

**Or just open in browser:**
- https://bakend-rowdafeems.onrender.com/api/health
- https://backend-rowdafeems.onrender.com/api/health

**Expected Response:**
```json
{"status":"ok","message":"Server is running"}
```

---

## ✅ If Backend URL is Correct

If `https://bakend-rowdafeems.onrender.com/api/health` works:

1. ✅ Your backend URL is correct
2. ✅ Make sure `VITE_API_URL` in Vercel matches exactly
3. ⚠️ **REDEPLOY your frontend** in Vercel:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait 2-5 minutes

---

## ❌ If Backend URL is Wrong

1. Go to Render dashboard
2. Find the correct backend URL
3. Update `VITE_API_URL` in Vercel
4. Save
5. Redeploy frontend

---

## 🎯 Next Steps

1. ✅ Test: `https://bakend-rowdafeems.onrender.com/api/health`
2. ✅ Verify the URL works
3. ✅ Update Vercel if URL is wrong
4. ✅ Redeploy frontend
5. ✅ Test login again

---

**The backend URL must be accessible and correct for the 405 error to be fixed!**

