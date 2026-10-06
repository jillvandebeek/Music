# Melodrop: AI Song Studio

A single-page web app for the [Suno API](https://docs.sunoapi.org/). Users paste their own Suno API key and get a friendly studio for everything the API offers.

## Features

| Area | What you can do | Suno API endpoints |
| --- | --- | --- |
| **Create: Simple** | Describe a song in one sentence, optional style hint, instrumental toggle, image/video/audio references | `POST /api/v1/generate` (`customMode: false`) |
| **Create: Custom** | Title, style (with tag tray + ✨ Boost), lyrics (structure tags + ✍️ AI writer), avoid-tags, vocal gender, variety, style/weirdness/audio weights, length, persona | `POST /api/v1/generate` (`customMode: true`), `POST /api/v1/style/generate`, `POST /api/v1/lyrics` |
| **Models** | V6 (recommended), V6 Wild, V6 Mini, plus legacy V5.5 / V5 / V4.5+ / V4.5 All / V4.5 / V4 | `model` param |
| **Remix** | Cover (restyle), Extend, Add vocals, Add backing (instrumental), Mashup of two tracks, from an uploaded file, a URL or your library | `upload-cover`, `upload-extend`, `add-vocals`, `add-instrumental`, `mashup`, File Upload API |
| **Sounds** | Loops and ambiences with BPM, key, loop and lyric capture | `POST /api/v1/generate/sounds` |
| **Lyrics lab** | Lyric drafts you can send straight into Create | `POST /api/v1/lyrics` + record-info |
| **Library** | Live progress (queued → writing → streaming → ready), play while streaming, favourites, search, download MP3, import any task ID | `GET /api/v1/generate/record-info` |
| **Track tools** | Extend from any point, replace a section, split stems (2-track / full / single instrument), MIDI export (.mid), WAV, music video, AI cover art, persona creation, karaoke with word-synced lyrics | `extend`, `replace-section`, `vocal-removal`, `midi`, `wav`, `mp4`, `suno/cover`, `generate-persona`, `get-timestamped-lyrics` |
| **Account** | Live credit balance | `GET /api/v1/generate/credit` |

Light, dark and system themes; responsive down to phone width; keyboard shortcuts (`Ctrl/⌘+Enter` to submit, `Space` to play/pause).

## How it works

- Pure static site (`index.html`, `assets/app.css`, `assets/app.js`), with no build step and no dependencies.
- The API key is kept in `localStorage` (or `sessionStorage` if "Remember" is unchecked) and sent only to Suno API.
- `netlify.toml` proxies `/suno/*` → `https://api.sunoapi.org/*` and `/upload/*` → `https://sunoapiorg.redpandaai.co/*` so browser requests do not hit CORS limits. If the proxy is not there (e.g. opening the file locally), the app falls back to calling the API directly.
- Suno API requires a `callBackUrl`; it points at `netlify/functions/suno-callback.mjs`, which just returns 200. The app polls the record-info endpoints for results and resumes polling after a reload.
- The library, personas and extras live in the browser. Suno API keeps generated files for about 14 days.

## Deploy on Netlify

Connect the repo, leave the build command empty and set the publish directory to `.` (already set in `netlify.toml`). That's it.

## Run locally

```bash
npx netlify-cli dev     # serves the site with the proxy + function
# or any static server, e.g.
python3 -m http.server 8080
```
