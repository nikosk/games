/* ============================================================
   Η Κόκο και το χαμένο καπέλο — Game Engine
   Vanilla JS · No dependencies · Greek narration
   ============================================================ */

(function () {
  'use strict';

  // ========== DOM REFS ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const app = $('#app');
  const audioOverlay = $('#audio-overlay');
  const btnMute = $('#btn-mute');
  const btnReplayNarration = $('#btn-replay-narration');
  const btnFullscreen = $('#btn-fullscreen');
  const progressDots = $$('.progress-dot');
  const sceneContainer = $('#scene-container');
  const scenes = $$('.scene');
  const btnReplay = $('#btn-replay');
  const confettiContainer = $('#confetti-container');

  // ========== STATE ==========
  let currentScene = 1;
  let audioUnlocked = false;
  let muted = false;
  let idleTimer = null;
  const IDLE_TIMEOUT = 15000; // 15 seconds
  const DEBOUNCE_MS = 600;    // prevent double-tap

  // Per-element debounce tracking
  const lastTap = new Map();

  function isDebounced(key) {
    const now = Date.now();
    const last = lastTap.get(key) || 0;
    if (now - last < DEBOUNCE_MS) return true;
    lastTap.set(key, now);
    return false;
  }

  // ========== AUDIO MANAGER ==========
  const AudioManager = {
    cues: {
      welcome: 'assets/audio/welcome.mp3',
      'wake-coco': 'assets/audio/wake-coco.mp3',
      'missing-hat': 'assets/audio/missing-hat.mp3',
      'river-intro': 'assets/audio/river-intro.mp3',
      'tap-lilies': 'assets/audio/tap-lilies.mp3',
      'river-success': 'assets/audio/river-success.mp3',
      'grass-intro': 'assets/audio/grass-intro.mp3',
      butterfly: 'assets/audio/butterfly.mp3',
      beetle: 'assets/audio/beetle.mp3',
      turtle: 'assets/audio/turtle.mp3',
      'hat-in-tree': 'assets/audio/hat-in-tree.mp3',
      'choose-helper': 'assets/audio/choose-helper.mp3',
      'elephant-success': 'assets/audio/elephant-success.mp3',
      'giraffe-success': 'assets/audio/giraffe-success.mp3',
      'monkey-success': 'assets/audio/monkey-success.mp3',
      'decorate-hat': 'assets/audio/decorate-hat.mp3',
      flower: 'assets/audio/flower.mp3',
      star: 'assets/audio/star.mp3',
      bow: 'assets/audio/bow.mp3',
      celebration: 'assets/audio/celebration.mp3',
      'thank-you': 'assets/audio/thank-you.mp3',
      'idle-help': 'assets/audio/idle-help.mp3'
    },

    cache: {},
    current: null,

    preload(cueName) {
      const src = this.cues[cueName];
      if (!src || this.cache[cueName]) return;
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.load();
        this.cache[cueName] = audio;
      } catch (_) {
        // File missing; fail silently
      }
    },

    stop() {
      if (!this.current) return;
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    },

    play(cueName) {
      if (!audioUnlocked || muted) return;
      const src = this.cues[cueName];
      if (!src) return;
      try {
        this.stop();
        // Reuse cached audio so narration stays responsive offline.
        let audio = this.cache[cueName];
        if (!audio) {
          audio = new Audio(src);
          this.cache[cueName] = audio;
        }
        this.current = audio;
        audio.currentTime = 0;
        audio.onended = () => {
          if (this.current === audio) this.current = null;
        };
        audio.play().catch(() => {
          if (this.current === audio) this.current = null;
          // File missing or blocked; fail silently.
        });
      } catch (_) {
        this.current = null;
        // Fail silently.
      }
    },

    playSceneIntro(sceneNum) {
      const map = {
        1: 'welcome',
        2: 'river-intro',
        3: 'grass-intro',
        4: 'choose-helper',
        5: 'decorate-hat'
      };
      if (map[sceneNum]) this.play(map[sceneNum]);
    },

    replayCurrent() {
      const map = {
        1: 'welcome',
        2: 'river-intro',
        3: 'grass-intro',
        4: 'choose-helper',
        5: 'decorate-hat'
      };
      if (map[currentScene]) this.play(map[currentScene]);
    }
  };

  // ========== FULLSCREEN ==========
  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // ========== PROGRESS INDICATOR ==========
  function updateProgress(sceneNum) {
    progressDots.forEach((dot, i) => {
      const s = i + 1;
      dot.classList.remove('active', 'done');
      if (s < sceneNum) dot.classList.add('done');
      if (s === sceneNum) dot.classList.add('active');
    });
  }

  // ========== SCENE TRANSITION ==========
  function goToScene(sceneNum) {
    if (sceneNum < 1 || sceneNum > 5) return;
    currentScene = sceneNum;
    scenes.forEach((s) => s.classList.remove('active'));
    const target = $(`#scene-${sceneNum}`);
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ block: 'nearest' });
    }
    updateProgress(sceneNum);
    AudioManager.playSceneIntro(sceneNum);
    initScene(sceneNum);
    resetIdleTimer();
  }

  function nextScene() {
    if (currentScene < 5) {
      goToScene(currentScene + 1);
    }
  }

  // ========== SCENE INITIALIZATION ==========
  function initScene(sceneNum) {
    switch (sceneNum) {
      case 1: initScene1(); break;
      case 2: initScene2(); break;
      case 3: initScene3(); break;
      case 4: initScene4(); break;
      case 5: initScene5(); break;
    }
  }

  // ========== SCENE 1: Wake Coco ==========
  let scene1Tapped = false;

  function initScene1() {
    scene1Tapped = false;
    const coco = $('#coco-sleeping');
    const prompt = $('#scene-1-prompt');
    coco.classList.remove('awake', 'sad', 'waking');
    prompt.textContent = 'Πάτα την Κόκο για να ξυπνήσει!';

    // Restore every SVG mutation from the previous playthrough.
    coco.querySelectorAll('.coco-eye-open').forEach(el => el.remove());
    coco.querySelector('.coco-eye-left')?.setAttribute('d', 'M225,75 Q232,68 239,75');
    coco.querySelector('.coco-eye-right')?.setAttribute('d', 'M248,75 Q255,68 262,75');
    coco.querySelectorAll('.sleep-zzz').forEach(z => { z.style.display = ''; });
    const hatPeg = $('#hat-peg');
    if (hatPeg) hatPeg.style.opacity = '0.9';

    coco.onclick = onTapCoco;
    coco.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTapCoco();
      }
    };
    coco.setAttribute('tabindex', '0');
    coco.setAttribute('role', 'button');
  }

  function onTapCoco() {
    if (isDebounced('scene1-coco')) return;

    if (!scene1Tapped) {
      // First tap: wake Coco
      scene1Tapped = true;
      const coco = $('#coco-sleeping');
      const prompt = $('#scene-1-prompt');

      AudioManager.play('wake-coco');

      // Visual: open eyes
      coco.classList.add('waking');
      prompt.textContent = 'Καλημέρα Κόκο! Μα... πού είναι το καπέλο;';

      // Replace closed eyes with open eyes after brief delay
      setTimeout(() => {
        coco.classList.remove('waking');
        coco.classList.add('awake');
        // Add open eyes via clone
        addOpenEyes(coco);
      }, 400);

      // Then show missing hat reaction
      setTimeout(() => {
        if (currentScene !== 1) return;
        AudioManager.play('missing-hat');
        coco.classList.add('sad');
        prompt.textContent = 'Το κόκκινο καπέλο λείπει! Ας το βρούμε!';
        // Remove hat peg
        const hatPeg = $('#hat-peg');
        if (hatPeg) hatPeg.style.opacity = '0';
      }, 5600);

      // Leave enough time for the Greek narration before changing scene.
      setTimeout(() => {
        if (currentScene === 1) nextScene();
      }, 13200);

    }
  }

  function addOpenEyes(coco) {
    const svg = coco.querySelector('.coco-svg');
    if (!svg) return;
    // Remove the closed eye paths and add open eyes
    const leftEye = svg.querySelector('.coco-eye-left');
    const rightEye = svg.querySelector('.coco-eye-right');
    if (leftEye) leftEye.setAttribute('d', 'M222,75 Q228,83 236,75');
    if (rightEye) rightEye.setAttribute('d', 'M245,75 Q251,83 259,75');
    // Add pupils
    const ns = 'http://www.w3.org/2000/svg';
    const pupilL = document.createElementNS(ns, 'circle');
    pupilL.setAttribute('cx', '229');
    pupilL.setAttribute('cy', '76');
    pupilL.setAttribute('r', '3.5');
    pupilL.setAttribute('fill', '#1A1A1A');
    pupilL.classList.add('coco-eye-open');
    const pupilR = document.createElementNS(ns, 'circle');
    pupilR.setAttribute('cx', '252');
    pupilR.setAttribute('cy', '76');
    pupilR.setAttribute('r', '3.5');
    pupilR.setAttribute('fill', '#1A1A1A');
    pupilR.classList.add('coco-eye-open');
    svg.appendChild(pupilL);
    svg.appendChild(pupilR);
    // Hide ZZZ
    const zzzs = svg.querySelectorAll('.sleep-zzz');
    zzzs.forEach(z => z.style.display = 'none');
  }

  // ========== SCENE 2: Lily Pads ==========
  let lilyStep = 0;

  function initScene2() {
    lilyStep = 0;
    $$('.lily-pad').forEach(pad => {
      pad.classList.remove('stepped');
      pad.disabled = false;
      pad.onclick = () => onTapLily(pad);
    });
    const coco = $('#coco-river');
    coco.classList.remove('at-1', 'at-2', 'at-3');
    coco.style.left = '';
    $('#scene-2-prompt').textContent = 'Πάτα τα νούφαρα για να περάσει η Κόκο το ποτάμι!';
    // Narrate the instruction after the scene introduction, unless play has begun.
    setTimeout(() => {
      if (currentScene === 2 && lilyStep === 0) AudioManager.play('tap-lilies');
    }, 7600);
  }

  function onTapLily(pad) {
    if (isDebounced('lily-' + pad.id)) return;
    if (pad.classList.contains('stepped')) return;

    lilyStep += 1;
    pad.classList.add('stepped');

    // Any untouched lily is a good choice; move Coco one step forward.
    const coco = $('#coco-river');
    coco.style.left = '';
    coco.classList.add('at-' + lilyStep);

    if (lilyStep === 3) {
      AudioManager.play('river-success');
      $('#scene-2-prompt').textContent = 'Μπράβο! Η Κόκο πέρασε το ποτάμι!';
      setTimeout(() => {
        if (currentScene === 2) nextScene();
      }, 7800);
    } else {
      $('#scene-2-prompt').textContent = `Νούφαρο ${lilyStep}! Πάτα το επόμενο!`;
    }
  }

  // ========== SCENE 3: Grass Clearing ==========
  let grassCleared = 0;

  function initScene3() {
    grassCleared = 0;
    $$('.grass-clump').forEach(clump => {
      clump.classList.remove('clearing', 'cleared');
      const creature = clump.querySelector('.creature');
      if (creature) {
        creature.classList.add('hidden');
        creature.classList.remove('revealed');
      }
      const btn = clump.querySelector('.grass-tap-zone');
      if (btn) {
        btn.onclick = () => onTapGrass(clump);
      }
    });
    $('#scene-3-prompt').textContent = 'Πάτα το χορτάρι για να βρεις τους φίλους!';
  }

  function onTapGrass(clump) {
    if (isDebounced('grass-' + clump.id)) return;
    if (clump.classList.contains('cleared')) return;

    const creatureKey = clump.dataset.creature;

    // Start clearing animation
    clump.classList.add('clearing');

    setTimeout(() => {
      clump.classList.add('cleared');
      const creature = clump.querySelector('.creature');
      if (creature) {
        creature.classList.remove('hidden');
        creature.classList.add('revealed');
      }
      grassCleared++;

      // Play creature-specific audio
      if (creatureKey === 'butterfly') AudioManager.play('butterfly');
      else if (creatureKey === 'beetle') AudioManager.play('beetle');
      else if (creatureKey === 'turtle') AudioManager.play('turtle');

      if (grassCleared === 1) {
        $('#scene-3-prompt').textContent = 'Μπράβο! Βρήκες έναν φίλο! Συνέχισε!';
      } else if (grassCleared === 2) {
        $('#scene-3-prompt').textContent = 'Κι άλλος φίλος! Ψάξε κι άλλο!';
      } else if (grassCleared === 3) {
        $('#scene-3-prompt').textContent = 'Όλοι οι φίλοι βρέθηκαν! Το καπέλο είναι στο δέντρο!';
        setTimeout(() => {
          if (currentScene === 3) AudioManager.play('hat-in-tree');
        }, 2800);
        setTimeout(() => {
          if (currentScene === 3) nextScene();
        }, 7900);
      }
    }, 500);
  }

  // ========== SCENE 4: Choose Helper ==========
  let scene4Done = false;

  function initScene4() {
    scene4Done = false;
    $$('.helper-btn').forEach(btn => {
      btn.classList.remove('chosen', 'success');
      btn.disabled = false;
      btn.onclick = () => onChooseHelper(btn);
    });
    // Reset hat position for replay
    const hatInTree = $('#hat-in-tree');
    if (hatInTree) {
      hatInTree.style.transition = '';
      hatInTree.style.transform = '';
    }
    $('#scene-4-prompt').textContent = 'Ποιος θα βοηθήσει την Κόκο να πάρει το καπέλο;';
  }

  function onChooseHelper(btn) {
    if (isDebounced('helper-' + btn.id)) return;
    if (scene4Done) return;
    scene4Done = true;

    // Highlight chosen
    btn.classList.add('chosen');

    // Disable all
    $$('.helper-btn').forEach(b => { b.disabled = true; });

    // Animate: chosen animal moves up to hat, hat comes down
    const hatInTree = $('#hat-in-tree');

    // Success animation on chosen
    setTimeout(() => {
      btn.classList.add('success');

      // Animate hat coming down
      if (hatInTree) {
        hatInTree.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        hatInTree.style.transform = 'translateX(-50%) translateY(120px) rotate(0deg)';
      }

      // Play specific audio
      if (btn.id === 'helper-elephant') AudioManager.play('elephant-success');
      else if (btn.id === 'helper-giraffe') AudioManager.play('giraffe-success');
      else if (btn.id === 'helper-monkey') AudioManager.play('monkey-success');

      // Unique feedback message
      let msg = '';
      if (btn.id === 'helper-elephant') {
        msg = 'Ο ελέφαντας σήκωσε το καπέλο με την προβοσκίδα του! Μπράβο!';
      } else if (btn.id === 'helper-giraffe') {
        msg = 'Η καμηλοπάρδαλη έφτασε το καπέλο με τον μακρύ λαιμό της! Υπέροχα!';
      } else {
        msg = 'Η μαϊμού σκαρφάλωσε στο δέντρο και πήρε το καπέλο! Τέλεια!';
      }
      $('#scene-4-prompt').textContent = msg;

      // Advance to scene 5
      setTimeout(() => {
        if (currentScene === 4) nextScene();
      }, 8000);
    }, 600);
  }

  // ========== SCENE 5: Decorate & Celebrate ==========
  let decoCount = 0;
  let scene5Celebrating = false;

  function initScene5() {
    decoCount = 0;
    scene5Celebrating = false;

    // Reset decoration spots
    $$('.deco-spot').forEach(spot => {
      spot.classList.remove('filled');
      spot.innerHTML = '';
    });

    // Reset deco buttons
    $$('.deco-btn').forEach(btn => {
      btn.classList.remove('used');
      btn.disabled = false;
      btn.onclick = () => onDecorate(btn);
    });

    // Hide celebration
    $('#celebration-zone').classList.add('hidden');
    btnReplay.classList.add('hidden');
    $('.decorate-zone').style.display = '';

    $('#scene-5-prompt').textContent = 'Στόλισε το καπέλο της Κόκο!';
  }

  function onDecorate(btn) {
    if (isDebounced('deco-' + btn.id)) return;
    if (btn.classList.contains('used')) return;

    const decoType = btn.dataset.deco;
    btn.classList.add('used');
    btn.disabled = true;

    // Place decoration on hat
    const spot = $(`#deco-spot-${decoType}`);
    if (spot) {
      spot.classList.add('filled');
      // Clone the svg from the button into the spot
      const btnSvg = btn.querySelector('svg');
      if (btnSvg) {
        const clone = btnSvg.cloneNode(true);
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.setAttribute('aria-hidden', 'true');
        spot.appendChild(clone);
        clone.classList.add('bounce-in');
      }
    }

    // Play deco audio
    AudioManager.play(decoType);

    decoCount++;

    if (decoCount === 1) {
      $('#scene-5-prompt').textContent = 'Ωραίο! Βάλε κι άλλο στόλισμα!';
    } else if (decoCount === 2) {
      $('#scene-5-prompt').textContent = 'Τέλεια! Ένα ακόμα!';
    } else if (decoCount === 3) {
      $('#scene-5-prompt').textContent = 'Το καπέλο είναι πανέμορφο! Ώρα για γιορτή!';
      // Trigger celebration after short delay
      setTimeout(() => {
        if (currentScene === 5) startCelebration();
      }, 5000);
    }
  }

  function startCelebration() {
    if (scene5Celebrating) return;
    scene5Celebrating = true;

    AudioManager.play('celebration');

    // Hide decorate zone, show celebration
    $('.decorate-zone').style.display = 'none';
    $('#celebration-zone').classList.remove('hidden');
    btnReplay.classList.remove('hidden');

    // Spawn confetti
    spawnConfetti();

    $('#scene-5-prompt').textContent = 'Πάτα τα ζωάκια για να χορέψουν! 🎉';

    // Set up dance animals
    $$('.dance-animal').forEach(animal => {
      animal.onclick = () => makeDance(animal);
    });

    // Replay button
    btnReplay.onclick = () => {
      if (isDebounced('replay')) return;
      goToScene(1);
    };

    // Play thank-you after the celebration narration finishes.
    setTimeout(() => {
      if (currentScene === 5 && scene5Celebrating) AudioManager.play('thank-you');
    }, 5200);
  }

  function makeDance(animal) {
    if (isDebounced('dance-' + animal.id)) return;
    animal.classList.remove('dancing');
    void animal.offsetWidth; // reflow
    animal.classList.add('dancing');
  }

  function spawnConfetti() {
    if (!confettiContainer) return;
    const colors = ['#F44336','#FFD600','#4CAF50','#2196F3','#E91E63','#FF9800','#9C27B0'];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.top = -(Math.random() * 20) + 'px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      piece.style.animationDelay = Math.random() * 1.5 + 's';
      piece.style.width = (8 + Math.random() * 14) + 'px';
      piece.style.height = (8 + Math.random() * 14) + 'px';
      confettiContainer.appendChild(piece);

      // Cleanup after animation
      setTimeout(() => {
        if (piece.parentNode) piece.parentNode.removeChild(piece);
      }, 5000);
    }
  }

  // ========== IDLE TIMER ==========
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      AudioManager.play('idle-help');
      // Reset timer after playing idle help
      resetIdleTimer();
    }, IDLE_TIMEOUT);
  }

  // ========== AUDIO UNLOCK ==========
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audioOverlay.classList.add('hidden');
    audioOverlay.setAttribute('aria-hidden', 'true');
    // Preload all cues
    Object.keys(AudioManager.cues).forEach(key => AudioManager.preload(key));
    // Play welcome, then gently repeat the first interaction if needed.
    setTimeout(() => AudioManager.play('welcome'), 300);
    setTimeout(() => {
      if (currentScene === 1 && !scene1Tapped) AudioManager.play('wake-coco');
    }, 8800);
    resetIdleTimer();
  }

  audioOverlay.addEventListener('click', unlockAudio);
  audioOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      unlockAudio();
    }
  });

  // ========== MUTE TOGGLE ==========
  btnMute.addEventListener('click', () => {
    muted = !muted;
    if (muted) {
      AudioManager.stop();
      btnMute.classList.add('muted');
      btnMute.setAttribute('aria-label', 'Ενεργοποίηση αφήγησης');
      btnMute.querySelector('span').textContent = '🔇';
    } else {
      btnMute.classList.remove('muted');
      btnMute.setAttribute('aria-label', 'Σίγαση αφήγησης');
      btnMute.querySelector('span').textContent = '🔊';
    }
  });

  // ========== REPLAY NARRATION ==========
  btnReplayNarration.addEventListener('click', () => {
    AudioManager.replayCurrent();
    // Brief visual feedback
    btnReplayNarration.classList.add('pop');
    setTimeout(() => btnReplayNarration.classList.remove('pop'), 400);
  });

  // ========== FULLSCREEN ==========
  btnFullscreen.addEventListener('click', toggleFullscreen);

  // ========== GLOBAL INTERACTION TO RESET IDLE ==========
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (audioUnlocked) resetIdleTimer();
    }, { passive: true });
  });

  // ========== KEYBOARD NAVIGATION ==========
  document.addEventListener('keydown', (e) => {
    // Arrow keys for scene navigation (debug/accessibility)
    if (e.key === 'ArrowRight' && e.ctrlKey) {
      e.preventDefault();
      nextScene();
    }
    if (e.key === 'ArrowLeft' && e.ctrlKey) {
      e.preventDefault();
      if (currentScene > 1) goToScene(currentScene - 1);
    }
  });

  // ========== PREVENT ACCIDENTAL SCROLL/ZOOM ==========
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Prevent double-tap zoom on main game area
  app.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // ========== INIT ==========
  function init() {
    goToScene(1);
    updateProgress(1);
    audioOverlay.focus();
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
      btnFullscreen.hidden = true;
    }
    // Preload scene 1 audio
    AudioManager.preload('welcome');
    AudioManager.preload('wake-coco');
    AudioManager.preload('missing-hat');
    AudioManager.preload('idle-help');
  }

  // ========== START ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
