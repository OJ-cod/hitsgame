# Hitster Cards

A React QR scanner that looks up cards in `public/cards.csv` and plays their Apple Music songs with MusicKit JS.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev -- --host
```

Set `VITE_APPLE_MUSIC_DEVELOPER_TOKEN` in `.env.local`. The app must run on `localhost` or HTTPS for camera access. Apple Music also requires user authorization and an active subscription.

## Card data

Edit `public/cards.csv`:

```csv
card_id,title,artist,year,apple_music_id,apple_music_url
card-001,How You Remind Me,Nickelback,2001,,https://music.apple.com/il/song/how-you-remind-me/214475478
```

For link-only playback, leave `apple_music_id` empty and provide `apple_music_url`. QR codes may contain either `card-001` or a URL ending in `/card/card-001`.

## Build

```powershell
npm run build
```

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. Push the project to GitHub, then enable **Settings -> Pages -> Source: GitHub Actions**. Every push to `main` will publish the scanner at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

Edit `public/cards.csv` before pushing. The CSV is published with the site, so do not put private data in it.

For a deployed app, do not treat the browser developer token as a general-purpose secret. Use an appropriate server-side token strategy and restrict the token to the domains where the app runs.
