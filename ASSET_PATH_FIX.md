# Donald.AI Asset Path Issues - CRITICAL FIX REQUIRED

## Problem Summary
**STATUS:** ❌ Assets missing - no video, audio, or images loading

## Root Cause
Your code references asset files that don't exist in the repository:
- `/assets/videos/special/idle.webm` - NOT FOUND
- `/assets/images/note-on.png` - NOT FOUND  
- `/assets/media/audio/click.mp3` - NOT FOUND
- `/assets/media/audio/drone.mp3` - NOT FOUND

## Files Affected
1. **index.html** (line 61): `src="/assets/videos/special/idle.webm"`
2. **index.html** (line 51): `src="/assets/images/note-on.png"`
3. **app.js** (line 7): `const ASSET_BASE = '/assets/';`
4. **app.js** (line 29): `new Audio(\`\${ASSET_BASE}media/audio/click.mp3\`)`
5. **app.js** (line 30): `new Audio(\`\${ASSET_BASE}media/audio/drone.mp3\`)`

## Required Actions

### Option 1: Add Missing Asset Files (RECOMMENDED)
You need to upload these files to your repository:

```bash
mkdir -p assets/videos/special
mkdir -p assets/images  
mkdir -p assets/media/audio/cheers
mkdir -p assets/media/video/mouth-shapes

# Upload these files:
# - assets/videos/special/idle.webm (looping background video)
# - assets/videos/special/end.webm (speech ending video)
# - assets/images/note-on.png (music on icon)
# - assets/images/note-off.png (music off icon)
# - assets/images/pause.png, mute.png, create.png, random.png, stop.png
# - assets/media/audio/click.mp3 (button click sound)
# - assets/media/audio/drone.mp3 (ambient music)
# - assets/media/audio/cheers/cheer1-5.mp3 (crowd sounds)
# - assets/media/video/mouth-shapes/*.webm (lip-sync videos)
```

### Option 2: Use Placeholder Assets (TEMPORARY)
Create placeholder files to test functionality:

```bash
# Create placeholder structure
mkdir -p assets/{videos/special,images,media/{audio/cheers,video/mouth-shapes}}

# Create empty placeholders
touch assets/videos/special/{idle,end}.webm
touch assets/images/{pause,mute,create,random,stop,note-on,note-off}.png  
touch assets/media/audio/{click,drone}.mp3
touch assets/media/audio/cheers/cheer{1..5}.mp3
```

### Option 3: Update Paths to Match Existing Structure
If you have assets elsewhere, update the paths in:

**app.js line 7:**
```javascript
// Change from:
const ASSET_BASE = '/assets/';
// To (if using public folder):
const ASSET_BASE = '/public/assets/';
// Or (if root level):
const ASSET_BASE = '/';
```

**index.html video element:**
```html
<!-- Update src to match your actual file location -->
<video id="trump-video" autoplay loop muted playsinline>
  <source src="/your-actual-path/idle.webm" type="video/webm">
</video>
```

## Verification Steps
After adding assets, verify with:

```bash
# Check all paths exist
ls -la assets/videos/special/idle.webm
ls -la assets/images/note-on.png
ls -la assets/media/audio/click.mp3
ls -la assets/media/audio/drone.mp3

# Start server and test
node manifest.js
# Open localhost:3000 and check browser console for 404 errors
```

## Browser Console Errors (Expected)
You should currently see:
```
GET http://localhost:3000/assets/videos/special/idle.webm 404 (Not Found)
GET http://localhost:3000/assets/images/note-on.png 404 (Not Found)  
GET http://localhost:3000/assets/media/audio/click.mp3 404 (Not Found)
```

## Next Steps
1. Locate your original donald.ai asset files
2. Upload them to the correct paths
3. Commit and push to GitHub
4. Deploy to Vercel  
5. Test all functionality

---
**Created:** $(date)
**Priority:** CRITICAL - Site non-functional without assets
