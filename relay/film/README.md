# ITCAN story film (about 60 seconds)

Source for the "Watch our story" film. It is rendered in the Higgsfield sandbox, not by Railway.

- `scenes.html` draws every graphic frame: the service scenes, offices, awards and the end card, plus the text that sits over the three AI video shots. `setFrame(scene, t)` sets the exact state for time t.
- `render.mjs` captures the frames with Playwright (30 fps, 1920x1080).
- `build.sh` downloads the inputs (Kling shots, the narration, card art, logo, award photos), cuts the picture with ffmpeg, places each narration line, adds a soft synthesized pad under the voice, encodes 1080p and 720p MP4s, a poster and a contact sheet, and uploads them. It needs a `urls.env` with presigned upload URLs (never commit it).

Inputs made with Higgsfield: three Kling 3.0 shots (Singapore skyline, a team at work, an operations room) and the narration (seed_audio).
Edit the words in `scenes.html` and the narration timing in `build.sh` (`PIECES`), then run `bash build.sh` in the sandbox.
