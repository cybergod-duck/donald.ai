#!/bin/bash
# Update asset paths in src/app.ts to match new structure

echo "Updating asset paths in src/app.ts..."

# Create backup
cp src/app.ts src/app.ts.backup

# Update ASSET_BASE path - currently '/assets/' which is correct for public/assets/
# No change needed for ASSET_BASE

# Update image paths: images/ -> assets/images/
sed -i 's|\${ASSET_BASE}images/|/assets/images/|g' src/app.ts

# Update audio paths: audio/ -> assets/media/audio/
sed -i 's|\${ASSET_BASE}audio/|/assets/media/audio/|g' src/app.ts
sed -i "s|'audio/|'/assets/media/audio/|g" src/app.ts

# Update video paths: videos/mouth-shapes/ -> assets/media/video/mouth-shapes/
sed -i 's|videos/mouth-shapes/|/assets/media/video/mouth-shapes/|g' src/app.ts
sed -i 's|videos/special/|/assets/media/video/special/|g' src/app.ts

# Handle any remaining generic video/ references
sed -i 's|\${ASSET_BASE}videos/|/assets/media/video/|g' src/app.ts

echo "Asset paths updated successfully!"
echo "Backup saved as src/app.ts.backup"
