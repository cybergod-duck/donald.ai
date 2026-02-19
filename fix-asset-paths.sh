#!/bin/bash
# Fix asset paths in src/app.ts for new structure

echo "Fixing asset paths in src/app.ts..."

# Backup original
cp src/app.ts src/app.ts.backup

# The app uses ${ASSET_BASE} which is '/assets/'
# Old structure: /assets/videos/, /assets/audio/, /assets/images/
# New structure: /assets/media/video/, /assets/media/audio/, /assets/images/

# Fix video paths - change videos/ to media/video/
sed -i "s|\${ASSET_BASE}videos/|\${ASSET_BASE}media/video/|g" src/app.ts

# Fix audio paths - change audio/ to media/audio/  
sed -i "s|\${ASSET_BASE}audio/|\${ASSET_BASE}media/audio/|g" src/app.ts
sed -i "s|'audio/|'media/audio/|g" src/app.ts

# Images path stays the same (/assets/images/)

echo "Asset paths fixed!"
echo "Changes made:"
echo "  videos/ -> media/video/"
echo "  audio/ -> media/audio/"
echo "  images/ (unchanged)"
