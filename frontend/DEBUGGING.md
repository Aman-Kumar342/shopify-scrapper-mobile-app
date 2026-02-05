# Debugging "Start Scraping" Button Issue

## Common Causes & Solutions

### 1. Metro Bundler Cache
The most common issue is that Metro bundler is caching old code.

**Solution:**
```powershell
# Stop the current Metro bundler (Ctrl+C)
# Then clear cache and restart:
npx expo start --clear
```

### 2. Backend Not Running
Check if the backend is actually running on port 3000.

**Solution:**
```powershell
# In a separate terminal, run:
cd backend
npm run dev

# You should see: "Server running on port 3000"
```

### 3. Wrong API URL
Check that the frontend is using the correct API URL.

**Check:**
1. Open `frontend/.env`
2. Verify `EXPO_PUBLIC_API_URL=http://localhost:3000`
3. If you changed this file, you MUST restart Metro with `--clear`

### 4. Not Logged In
If the user session expired, the API calls will fail.

**Check:**
- Look at the console logs in the terminal running Metro
- You should see: `[Validation] Session: Found` or `Session: Not found`
- If not found, log out and log back in

### 5. Check Console Logs
The validation screen now has debug logging. Look for these logs in your Metro terminal:

```
[Validation] URL param: https://xxx.myshopify.com
[Validation] API_BASE_URL: http://localhost:3000
[Validation] Session: Found
[Validation] Calling API: http://localhost:3000/scrape/validate-store
[Validation] Response: {...}
[Start Scrape] Button pressed
[Start Scrape] validationData: {...}
[Start Scrape] Calling API: http://localhost:3000/scrape/start
[Start Scrape] Response: {...}
[Start Scrape] Navigating to results with jobId: xxx
```

## Quick Test Script

Run this in PowerShell to test the backend:

```powershell
# Test backend health
try { Invoke-RestMethod -Uri "http://localhost:3000/health" } catch { "Backend not running" }
```

## If All Else Fails

1. **Stop everything** (Metro bundler, backend, Expo Go app)
2. **Restart backend:** `cd backend && npm run dev`
3. **Clear Metro cache:** `cd frontend && npx expo start --clear`
4. **Test with a simple store:** Try `https://sunny-soap-boutique.myshopify.com`
5. **Check logs carefully** in the Metro terminal

## Still Not Working?

If the button still does nothing, check:
1. Is there any error in the Metro terminal?
2. Is there any error in the backend terminal?
3. Try pressing `Ctrl+M` (Android) or `Cmd+D` (iOS) in the Expo Go app to open the developer menu, then "Debug Remote JS" to see more detailed logs in Chrome DevTools.
