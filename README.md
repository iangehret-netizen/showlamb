# ShowLamb

A single-player show lamb breeding, showing and market simulation. Runs entirely in the browser, installs to your phone like an app, and works offline.

## Put it online (GitHub Pages)
1. On GitHub, create a new public repository named `showlamb`.
2. Click **Add file → Upload files** and drag in every file from this folder (index.html, app.js, game.js, data.js, style.css, sw.js, manifest.json, icon-192.png, icon-512.png, README.md). Commit.
3. Go to **Settings → Pages**, set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. In a minute or two the game is live at `https://iangehret-netizen.github.io/showlamb/`.
5. On your phone, open that link in Safari, tap **Share → Add to Home Screen**.

## Updating
Upload the changed files the same way. The app picks up new versions the next time it is opened with a connection.

## Your save
The game saves on the device it's played on. Use **More → Settings → Download backup** to keep a copy or move it to another phone.

## Files
- `data.js` — breeds, colors, trait bases, shows, feeds, names, achievements
- `game.js` — the simulation: genetics/EPDs, breeding, growth, shows, market, computer flocks
- `app.js` — the screens
- `style.css` — the look
