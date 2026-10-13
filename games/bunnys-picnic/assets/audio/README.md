# Current audio: wordless

Only WAV music, effects, and character reactions are loaded by the game. The eight `bunny/duck/puppy/hedgehog-curious/happy.wav` clips are original synthesized animal-like reactions, authored in `scripts/make-reactions.py`; they contain no speech or TTS. Gestures and picture cues carry the meaning even when muted.

## Retired speech history

The MP3s and voice auditions below are preserved as source history and are excluded from the production game and review.

# Audio

`voice-0.mp3` through `voice-28.mp3` are synthesized Greek dialogue, generated on 2026-10-03 using Microsoft’s `el-GR-AthinaNeural` voice at −8% rate, through edge-tts 7.2.8. `voices.json` contains the exact script. `welcome.mp3` is the initial voice test. These are synthesized performances, not a human actor recording. All files are bundled; gameplay does not contact the speech service.

Voice references: [Microsoft language and voice support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support), [edge-tts](https://github.com/rany2/edge-tts). Regenerate with `scripts/make-voices.py` in a Python environment with edge-tts installed; existing completed clips are preserved.

The WAV files are original synthesized music and effects authored for this game. `scripts/make-sounds.py` contains the melody, instrumentation, and effect generation, with a fixed random seed for reproducibility. No sampled recordings or third-party music are used. Phaser handles playback, muting, and lifecycle in the game.

## Voice audition

`../voice-review/` contains six additional clips made with edge-tts 7.2.8 at natural rate (`+0%`) and unchanged pitch (`+0Hz`), using Athina and Nestoras. The exact new Greek wording, voices, and rates are in `../voice-review/script.json`; regenerate with `scripts/make-voice-samples.py`. `voices.html` compares these against three original game clips. These audition files do not replace the game's dialogue. Phrasing and pace are changed together, so this compares complete takes rather than isolating one variable.
