#!/bin/bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
release_version=1.1.0
build_dir="$(mktemp -d /private/tmp/paperroom-release.XXXXXX)"
app_dir="$build_dir/stage/Paperroom.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources" releases
node --check dist/scene.js
node --check dist/app.js
for f in dist/cassette.js dist/tape-recorder.js dist/audio-store.js dist/note-details.js; do node --check "$f"; done
node --test tests/*.test.js
cp desktop/Info.plist "$app_dir/Contents/Info.plist"
cp desktop/assets/Paperroom.icns "$app_dir/Contents/Resources/Paperroom.icns"
cp -R dist "$app_dir/Contents/Resources/web"
xcrun swiftc desktop/main.swift -O -target arm64-apple-macos14.0 -module-cache-path "$build_dir/swift-cache" -framework Cocoa -framework WebKit -framework Network -o "$app_dir/Contents/MacOS/Paperroom"
codesign --force --deep --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"
ln -s /Applications "$build_dir/stage/Applications"
cp desktop/RELEASE-1.1.md "$build_dir/stage/版本说明.txt"
archive="releases/Paperroom-$release_version-mac-arm64.dmg"
hdiutil create -volname "Paperroom $release_version" -srcfolder "$build_dir/stage" -format UDZO -ov "$archive"
hdiutil verify "$archive"
shasum -a 256 "$archive" > "$archive.sha256"
printf 'Build verified: %s\nApp for local inspection: %s\n' "$archive" "$app_dir"
