#!/bin/bash
# COMET MIGRATION PROTOCOL - CORRECTED FOR CURRENT STRUCTURE
# Target: Reorganize donald.ai files from root into proper structure

echo "Starting Donald.ai migration..."

# Create directory structure
mkdir -p "public/assets/images"
mkdir -p "public/assets/media/audio/cheers"
mkdir -p "public/assets/media/video/mouth-shapes"
mkdir -p "public/assets/media/video/special"
mkdir -p "src/styles"

# Move API file (if it exists in root, rename to .ts)
if [ -f "generate.js" ]; then
  mv "generate.js" "api/generate.ts"
  echo "Moved generate.js to api/generate.ts"
fi

# Move image files
for img in create.png mute.png note-off.png note-on.png pause.png random.png stop.png; do
  if [ -f "$img" ]; then
    mv "$img" "public/assets/images/$img"
    echo "Moved $img"
  fi
done

# Move audio files
if [ -f "click.mp3" ]; then
  mv "click.mp3" "public/assets/media/audio/click.mp3"
  echo "Moved click.mp3"
fi

# Move cheer audio files
for i in {1..5}; do
  if [ -f "cheer$i.mp3" ]; then
    mv "cheer$i.mp3" "public/assets/media/audio/cheers/cheer$i.mp3"
    echo "Moved cheer$i.mp3"
  fi
done

# Move numbered mouth shapes (1-14)
for i in {1..14}; do
  if [ -f "$i.webm" ]; then
    mv "$i.webm" "public/assets/media/video/mouth-shapes/$i.webm"
    echo "Moved $i.webm"
  fi
done

# Move express videos
for i in {1..6}; do
  if [ -f "express$i.webm" ]; then
    mv "express$i.webm" "public/assets/media/video/mouth-shapes/express$i.webm"
    echo "Moved express$i.webm"
  fi
done

# Move pause videos
for i in {1..4}; do
  if [ -f "pause$i.webm" ]; then
    mv "pause$i.webm" "public/assets/media/video/mouth-shapes/pause$i.webm"
    echo "Moved pause$i.webm"
  fi
done

# Move wide videos
for i in {1..5}; do
  if [ -f "wide$i.webm" ]; then
    mv "wide$i.webm" "public/assets/media/video/mouth-shapes/wide$i.webm"
    echo "Moved wide$i.webm"
  fi
done

# Move special video files - these are missing, will note it
echo "Note: end.webm and idle.webm not found in root - may need to be sourced separately"

# Move core app files
if [ -f "styles.css" ]; then
  mv "styles.css" "src/styles/main.scss"
  echo "Moved styles.css to src/styles/main.scss"
fi

if [ -f "app.js" ]; then
  mv "app.js" "src/app.ts"
  echo "Moved app.js to src/app.ts"
fi

if [ -f "index.html" ]; then
  mv "index.html" "src/index.html"
  echo "Moved index.html"
fi

if [ -f "server.js" ]; then
  mv "server.js" "src/server.ts"
  echo "Moved server.js to src/server.ts"
fi

# Package files are already in root - no need to move
echo "package.json and package-lock.json already in root"
echo "vercel.json already in root"

# Move any remaining organization scripts
if [ -f "organize.sh" ]; then
  mv "organize.sh" "scripts/setup-donald-repo.sh"
  echo "Moved organize.sh"
fi

echo "Migration complete!"
