# Current Website Issues & Fixes

## Issues Detected

1. **X-Frame-Options in meta tag** - Should be set via HTTP header only
2. **Missing favicon.ico and apple-touch-icon.png** - Returning 503 errors
3. **Deprecated -ms-high-contrast CSS** - Legacy Microsoft Edge property
4. **Service Worker fetch failures** - Unable to cache resources

## Quick Fixes

### 1. Remove X-Frame-Options from HTML
Find and remove this line from your HTML:
```html
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
```

The X-Frame-Options is already properly set in the Nginx configuration.

### 2. Add Missing Icons
Create placeholder icons if they don't exist:

```bash
# Create a simple favicon.ico
echo '(130Bpm)' | sudo -S touch /var/www/public_html/favicon.ico

# Create apple-touch-icon.png (180x180 placeholder)
# You should replace with actual icon
echo '(130Bpm)' | sudo -S touch /var/www/public_html/apple-touch-icon.png
```

### 3. Update CSS to Remove Deprecated Properties
Replace `-ms-high-contrast` media queries with modern `prefers-contrast`:

```css
/* Old (deprecated) */
@media screen and (-ms-high-contrast: active) {
  /* styles */
}

/* New (modern) */
@media (prefers-contrast: high) {
  /* styles */
}
```

### 4. Fix Service Worker Fetch Handling
Update your service worker to handle fetch errors gracefully:

```javascript
// In sw.js, update the error handling:
async function handleFetchRequest(event) {
  try {
    const response = await cacheFirst(event.request);
    return response;
  } catch (error) {
    console.warn('Service Worker: Fetch error for', event.request.url);
    // Return a fallback or network request
    try {
      return await fetch(event.request);
    } catch (networkError) {
      // Return offline page or cached fallback
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
  }
}
```

## Shell Platform Integration Options

Since you have an existing site running, here are your options:

### Option 1: Subdomain Deployment
Deploy Shell Platform to a subdomain:
- Main site: kevinalthaus.com
- Shell Platform: app.kevinalthaus.com

### Option 2: Subdirectory Deployment  
Deploy Shell Platform in a subdirectory:
- kevinalthaus.com/app/

### Option 3: Full Migration
Replace current site with Shell Platform (requires careful migration planning)

### Option 4: Parallel Development
Continue developing Shell Platform in `/shell-platform/` directory while maintaining current site

## Recommendation

For production safety, I recommend **Option 1 (Subdomain)** or **Option 4 (Parallel Development)** to avoid disrupting your current live site.

---

Last Updated: 2025-09-03