/* Melodrop: a single-page studio for the Suno API (https://docs.sunoapi.org) */
(() => {
  'use strict';

  // ===================================================================
  // Constants
  // ===================================================================
  const DIRECT = { suno: 'https://api.sunoapi.org', upload: 'https://sunoapiorg.redpandaai.co' };
  const PROXY = { suno: '/suno', upload: '/upload' };
  const POLL_MS = 5000;
  const TASK_TIMEOUT_MS = 25 * 60 * 1000;

  const MODELS = [
    { id: 'V6', name: 'V6', tag: 'Recommended', desc: 'Most natural vocals and the richest detail. The best all-rounder.' },
    { id: 'V6_WILD', name: 'V6 Wild', tag: 'Experimental', desc: 'Bolder, more distinctive and surprising results.' },
    { id: 'V6_MINI', name: 'V6 Mini', tag: 'Fast', desc: 'Lightweight and quick. Great for sketching ideas.' },
  ];
  const LEGACY_MODELS = [
    { id: 'V5_5', name: 'V5.5', tag: 'Legacy', desc: 'Custom models tailored to your taste.' },
    { id: 'V5', name: 'V5', tag: 'Legacy', desc: 'Superior expression, faster generation.' },
    { id: 'V4_5PLUS', name: 'V4.5+', tag: 'Legacy', desc: 'Richer sound, up to 8 min.' },
    { id: 'V4_5ALL', name: 'V4.5 All', tag: 'Legacy', desc: 'Better song structure, up to 8 min.' },
    { id: 'V4_5', name: 'V4.5', tag: 'Legacy', desc: 'Smarter prompts, up to 8 min.' },
    { id: 'V4', name: 'V4', tag: 'Legacy', desc: 'Improved vocals, up to 4 min.' },
  ];
  const ALL_MODELS = [...MODELS, ...LEGACY_MODELS];
  const DURATION_MODELS = new Set(['V6', 'V6_WILD', 'V6_MINI', 'V5_5']);
  const PERSONA_MODELS = new Set(['V6', 'V6_WILD', 'V6_MINI', 'V5_5', 'V5']);
  const VARIETY = ['Exact', 'Balanced', 'Distinct', 'Bold', 'Max'];

  const IDEAS = [
    'An upbeat summer anthem about road-tripping with best friends, windows down',
    'A lo-fi hip hop beat for studying on a rainy afternoon',
    'A heartfelt acoustic ballad about calling your grandmother',
    'A cinematic orchestral piece for the final boss of a fantasy game',
    'A funky disco track about a cat who rules the dance floor',
    'A dreamy synthwave song about driving through a neon city at 3am',
    'A sea shanty about debugging code at midnight',
    'An energetic K-pop song about chasing your dreams',
    'A smoky late-night jazz tune with brushed drums and upright bass',
    'A country song about a tractor that falls in love with the moon',
    'A punk rock anthem about Monday mornings',
    'A gentle lullaby with music box and soft female vocals',
    'A reggaeton party track about the first day of summer break',
    'An epic power ballad about finally finishing your thesis',
    'A bossa nova song about coffee and slow Sunday mornings',
  ];
  const QUICK_IDEAS = ['Birthday song for a friend', 'Workout hype track', 'Rainy day lo-fi', 'Epic movie trailer', 'Breakup ballad', 'Song for my dog'];
  const TAGS = {
    Genre: ['pop', 'rock', 'hip hop', 'r&b', 'edm', 'house', 'lo-fi', 'jazz', 'country', 'folk', 'metal', 'synthwave', 'k-pop', 'reggaeton', 'afrobeats', 'cinematic', 'classical', 'indie'],
    Mood: ['uplifting', 'melancholic', 'dreamy', 'energetic', 'dark', 'romantic', 'chill', 'epic', 'playful', 'nostalgic'],
    Sound: ['acoustic guitar', 'piano', '808 bass', 'strings', 'synth pads', 'brass', 'lush reverb', 'four-on-the-floor', 'live drums', 'vinyl crackle'],
    Voice: ['female vocals', 'male vocals', 'duet', 'choir', 'raspy', 'breathy', 'powerful belt', 'rap verses', 'falsetto'],
  };
  const STRUCT = ['[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Drop]', '[Break]', '[Instrumental]', '[Outro]', '[End]'];
  const SOUND_IDEAS = ['Rain on a tin roof', 'Lo-fi drum loop', 'Spaceship engine hum', 'Forest birds at dawn', 'Crowd cheering', '808 trap loop'];
  const LYRIC_IDEAS = ['Falling in love in autumn', 'Leaving my hometown', 'A robot learning to dream', 'Friendship that survives everything', 'Summer night at the beach'];
  const KEYS = ['Any', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];
  const STEMS = ['Lead Vocal', 'Backing Vocals', 'Drum Kit', 'Kick', 'Snare', 'Hi-Hat', 'Bass', 'Electric Bass', '808', 'Piano', 'Electric Guitar', 'Acoustic Guitar', 'Guitar', 'Synth', 'Synth Pad', 'Synth Bass', 'Synth Lead', 'Keyboards', 'Rhodes', 'Organ', 'String Section', 'Violin', 'Cello', 'Brass Section', 'Trumpet', 'Saxophone', 'Woodwinds', 'Flute', 'Choir', 'Percussion', 'Sound Effects', 'Orchestra'];

  const REMIX_OPS = {
    cover: { ic: '🎭', name: 'Cover', blurb: 'Same melody, brand-new style', path: '/api/v1/generate/upload-cover' },
    extend: { ic: '➕', name: 'Extend', blurb: 'Continue your track seamlessly', path: '/api/v1/generate/upload-extend' },
    vocals: { ic: '🎤', name: 'Add vocals', blurb: 'Sing over an instrumental', path: '/api/v1/generate/add-vocals' },
    instrumental: { ic: '🎹', name: 'Add backing', blurb: 'Build music around a vocal', path: '/api/v1/generate/add-instrumental' },
    mashup: { ic: '🔀', name: 'Mashup', blurb: 'Blend two tracks into one', path: '/api/v1/generate/mashup' },
  };

  const MUSIC_STAGES = { PENDING: 1, TEXT_SUCCESS: 2, FIRST_SUCCESS: 3, SUCCESS: 4 };
  const MUSIC_LABEL = { PENDING: 'Queued', TEXT_SUCCESS: 'Writing', FIRST_SUCCESS: 'Streaming', SUCCESS: 'Ready' };
  const KIND_LABEL = { generate: 'Song', extend: 'Extension', replace: 'Section edit', sounds: 'Sound', cover: 'Cover', 'upload-extend': 'Extension', vocals: 'Vocals', instrumental: 'Backing', mashup: 'Mashup', lookup: 'Imported' };

  // ===================================================================
  // State & persistence
  // ===================================================================
  const store = {
    get(k, d) { try { const v = localStorage.getItem('md.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('md.' + k, JSON.stringify(v)); } catch { /* quota / private mode */ } },
    del(k) { try { localStorage.removeItem('md.' + k); } catch { } },
  };
  const S = {
    key: '',
    base: location.protocol.startsWith('http') ? { ...PROXY } : { ...DIRECT },
    jobs: store.get('jobs', []),           // music-type tasks (generate/extend/cover/…)
    extras: store.get('extras', {}),       // per-track extras: wav, video, stems, karaoke, midi
    covers: store.get('covers', {}),       // per-task cover art
    tasks: store.get('tasks', []),         // pending secondary tasks being polled
    personas: store.get('personas', []),
    favs: store.get('favs', {}),
    lyrics: store.get('lyrics', []),
    model: store.get('model', 'V6'),
    mode: store.get('mode', 'simple'),
    credits: null,
    queue: [], playing: null,
  };
  const save = {
    jobs: () => store.set('jobs', S.jobs.slice(0, 200)),
    extras: () => store.set('extras', S.extras),
    covers: () => store.set('covers', S.covers),
    tasks: () => store.set('tasks', S.tasks),
    personas: () => store.set('personas', S.personas),
    favs: () => store.set('favs', S.favs),
    lyrics: () => store.set('lyrics', S.lyrics.slice(0, 20)),
  };

  // ===================================================================
  // Helpers
  // ===================================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => { s = Math.max(0, Math.floor(+s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const ago = (t) => { const d = (Date.now() - t) / 1000; if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`; return `${Math.floor(d / 86400)}d ago`; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const callbackUrl = () => location.protocol.startsWith('http') ? `${location.origin}/.netlify/functions/suno-callback` : 'https://example.com/suno-callback';
  const clean = (o) => { Object.keys(o).forEach((k) => (o[k] === '' || o[k] == null) && delete o[k]); return o; };
  const modelName = (id) => (ALL_MODELS.find((m) => m.id === id) || {}).name || id || '';
  const trackAudio = (t) => t.audio_url || t.stream_audio_url || t.source_audio_url || t.source_stream_audio_url || '';

  function setBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('busy', busy);
    const span = btn.querySelector('span') || btn;
    if (busy) { btn.dataset.label = span.textContent; if (label) span.textContent = label; }
    else if (btn.dataset.label) span.textContent = btn.dataset.label;
  }

  function toast(title, msg = '', type = '', action) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="grow"><b>${esc(title)}</b>${msg ? `<div class="muted small">${esc(msg)}</div>` : ''}${action ? `<button class="link-btn">${esc(action.label)}</button>` : ''}</div><button class="icon-btn" aria-label="Dismiss">✕</button>`;
    el.querySelector('.icon-btn').onclick = () => el.remove();
    if (action) el.querySelector('.link-btn').onclick = () => { action.fn(); el.remove(); };
    $('#toasts').append(el);
    setTimeout(() => el.remove(), type === 'err' ? 9000 : 6000);
  }

  // ===================================================================
  // API client
  // ===================================================================
  class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  const FRIENDLY = {
    400: 'The request was rejected. Check your inputs.',
    401: 'Your API key was rejected. Check it and try again.',
    402: 'Not enough credits for this action.',
    404: 'Not found.',
    405: 'Rate limit hit. Give it a few seconds.',
    409: 'This already exists.',
    413: 'Your text is too long for this model.',
    422: 'Some parameters did not pass validation.',
    429: 'Not enough credits. Top up at sunoapi.org.',
    430: 'Too many requests. Slow down a little.',
    451: 'Could not fetch the source file. Make sure the URL is public.',
    455: 'Suno API is under maintenance. Try again shortly.',
    500: 'Suno API had a server error. Try again.',
  };

  async function api(path, { method = 'GET', body, query, host = 'suno', key } = {}) {
    const doFetch = async (base) => {
      const url = base + path + (query ? '?' + new URLSearchParams(query) : '');
      const headers = { Authorization: 'Bearer ' + (key || S.key) };
      const opts = { method, headers };
      if (body instanceof FormData) opts.body = body;
      else if (body) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      return fetch(url, opts);
    };
    let res;
    const usingProxy = S.base[host] === PROXY[host];
    try {
      res = await doFetch(S.base[host]);
      // If the proxy isn't configured (e.g. a plain static server), fall back to calling the API directly.
      if (usingProxy && !(res.headers.get('content-type') || '').includes('json') && (res.status === 404 || res.status === 405 || res.status === 200)) throw new TypeError('no proxy');
    } catch (e) {
      if (!usingProxy) throw new ApiError('Could not reach Suno API. Check your connection.', 0);
      S.base[host] = DIRECT[host];
      try { res = await doFetch(S.base[host]); } catch { throw new ApiError('Could not reach Suno API. Check your connection.', 0); }
    }
    let j;
    try { j = await res.json(); } catch { throw new ApiError(`Unexpected response from Suno API (HTTP ${res.status}).`, res.status); }
    const code = j.code ?? res.status;
    if (code !== 200) {
      const friendly = FRIENDLY[code];
      const m = j.msg && j.msg !== 'success' ? j.msg : '';
      throw new ApiError(friendly && m ? `${friendly} (${m})` : (m || friendly || `Error ${code}`), code);
    }
    return j.data;
  }

  async function uploadFile(file, onStatus) {
    onStatus && onStatus('Uploading…');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploadPath', 'melodrop');
    fd.append('fileName', `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`);
    const d = await api('/api/file-stream-upload', { method: 'POST', body: fd, host: 'upload' });
    const url = d && (d.downloadUrl || d.fileUrl);
    if (!url) throw new ApiError('Upload finished but no file URL came back.');
    return url;
  }

  async function refreshCredits() {
    try {
      const c = await api('/api/v1/generate/credit');
      S.credits = typeof c === 'number' ? c : +c;
      $('#creditsVal').textContent = Number.isFinite(S.credits) ? S.credits.toLocaleString() : '?';
      const pill = $('#credits');
      pill.classList.toggle('empty', S.credits <= 0);
      pill.classList.toggle('low', S.credits > 0 && S.credits < 30);
    } catch (e) {
      if (e.code === 401) return lockOut('Your API key is no longer valid.');
      $('#creditsVal').textContent = '?';
    }
  }

  // ===================================================================
  // Theme
  // ===================================================================
  const mql = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(choice) {
    const root = document.documentElement;
    root.dataset.themeChoice = choice;
    root.dataset.theme = choice === 'dark' || (choice === 'system' && mql.matches) ? 'dark' : 'light';
    try { localStorage.setItem('md.theme', choice); } catch { }
    $$('[data-theme-control] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === choice)));
  }
  function initTheme() {
    $$('[data-theme-control]').forEach((host) => {
      host.innerHTML = `<div class="seg seg-sm theme-seg" role="radiogroup" aria-label="Theme">
        <button type="button" data-t="light" title="Light theme" aria-label="Light theme">☀︎</button>
        <button type="button" data-t="system" title="Match system" aria-label="System theme">◐</button>
        <button type="button" data-t="dark" title="Dark theme" aria-label="Dark theme">☾</button></div>`;
      host.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) applyTheme(b.dataset.t); });
    });
    let choice = 'system'; try { choice = localStorage.getItem('md.theme') || 'system'; } catch { }
    applyTheme(choice);
    mql.addEventListener('change', () => { if (document.documentElement.dataset.themeChoice === 'system') applyTheme('system'); });
  }

  // ===================================================================
  // Key gate
  // ===================================================================
  function initGate() {
    const saved = store.get('key', '') || sessionStorage.getItem('md.key') || '';
    $('#keyPeek').onclick = () => { const i = $('#keyInput'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#keyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = $('#keyInput').value.trim();
      const btn = $('#keySubmit');
      $('#keyError').textContent = '';
      if (key.length < 8) { $('#keyError').textContent = 'That does not look like a full API key.'; return; }
      setBusy(btn, true, 'Checking key…');
      try {
        const c = await api('/api/v1/generate/credit', { key });
        S.key = key;
        if ($('#keyRemember').checked) store.set('key', key); else { store.del('key'); try { sessionStorage.setItem('md.key', key); } catch { } }
        S.credits = c;
        enterApp(true);
      } catch (err) {
        $('#keyError').textContent = err.code === 401 ? 'That key was rejected by Suno API. Double-check it at sunoapi.org/api-key.' : err.message;
      } finally { setBusy(btn, false); }
    });
    if (saved) { S.key = saved; enterApp(false); }
    else showGate();
  }
  function showGate(msg) {
    $('#app').hidden = true; $('#gate').hidden = false;
    $('#keyError').textContent = msg || '';
    setTimeout(() => $('#keyInput').focus(), 50);
  }
  function lockOut(msg) {
    S.key = ''; store.del('key'); try { sessionStorage.removeItem('md.key'); } catch { }
    pauseAudio();
    showGate(msg);
  }
  let booted = false;
  function enterApp(fresh) {
    $('#gate').hidden = true; $('#app').hidden = false;
    $('#keyInput').value = '';
    if (!booted) { booted = true; bootApp(); }
    refreshCredits();
    if (fresh) toast('Studio unlocked 🎉', 'Describe a song and hit Generate. Your first track takes about a minute.', 'ok');
  }

  // ===================================================================
  // Tabs
  // ===================================================================
  function goto(tab) {
    $$('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab));
    store.set('tab', tab);
    if (tab === 'library') renderLibrary();
    if (tab === 'remix') fillLibrarySelects();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===================================================================
  // Shared UI builders
  // ===================================================================
  function segValue(seg) { const b = seg.querySelector('[aria-pressed="true"]'); return b ? b.dataset.v ?? b.dataset.mode ?? b.dataset.f ?? b.dataset.k : ''; }
  function bindSeg(seg, onChange) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !seg.contains(b)) return;
      $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange && onChange(b);
    });
  }
  function counters() {
    $$('[data-count]').forEach((c) => {
      const el = document.getElementById(c.dataset.count);
      const upd = () => { const max = +el.maxLength; c.textContent = `${el.value.length.toLocaleString()} / ${max.toLocaleString()}`; c.classList.toggle('over', el.value.length > max * 0.95); };
      el.addEventListener('input', upd); upd();
    });
    $$('[data-val]').forEach((v) => {
      const el = document.getElementById(v.dataset.val);
      const upd = () => (v.textContent = Math.round(el.value * 100) + '%');
      el.addEventListener('input', upd); upd();
    });
  }
  function modelOptions(sel, value = 'V6') {
    sel.innerHTML = `<optgroup label="Current">${MODELS.map((m) => `<option value="${m.id}">${m.name} · ${m.tag}</option>`).join('')}</optgroup>
      <optgroup label="Legacy (may be discontinued)">${LEGACY_MODELS.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</optgroup>`;
    sel.value = value;
  }
  function personaSlot(host, prefix) {
    host.innerHTML = `<label for="${prefix}Persona">Persona / custom voice <span class="opt">optional</span></label>
      <div class="persona-pick">
        <select id="${prefix}Persona"><option value="">None</option></select>
        <select id="${prefix}PersonaModel" aria-label="Persona type" style="max-width:160px"><option value="style_persona">Style persona</option><option value="voice_persona">Voice (Suno Voice)</option></select>
      </div>
      <input id="${prefix}PersonaId" placeholder="…or paste a persona / voice ID" spellcheck="false" />
      <span class="muted small">Create personas from any finished track in your library (⋯ → Persona).</span>`;
  }
  function refreshPersonaSelects() {
    $$('select[id$="Persona"]').forEach((sel) => {
      const v = sel.value;
      sel.innerHTML = `<option value="">None</option>` + S.personas.map((p) => `<option value="${esc(p.personaId)}">${esc(p.name)}</option>`).join('');
      sel.value = v;
    });
  }
  function personaValue(prefix) {
    const id = ($(`#${prefix}PersonaId`)?.value.trim()) || $(`#${prefix}Persona`)?.value || '';
    return id ? { personaId: id, personaModel: $(`#${prefix}PersonaModel`).value } : {};
  }
  function dropzone(zone, input, onFiles) {
    const browse = zone.querySelector('[data-browse], [data-pick]');
    if (browse) browse.onclick = (e) => { e.stopPropagation(); input.click(); };
    zone.addEventListener('click', (e) => { if (e.target === zone || e.target.tagName === 'P') input.click(); });
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', (e) => e.dataTransfer.files.length && onFiles([...e.dataTransfer.files]));
    input.addEventListener('change', () => { input.files.length && onFiles([...input.files]); input.value = ''; });
  }

  // ===================================================================
  // CREATE
  // ===================================================================
  const refMedia = []; // {kind, url, name, uploading}

  function initCreate() {
    // Mode
    const setMode = (mode) => {
      S.mode = mode; store.set('mode', mode);
      $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      $$('#createForm [data-show]').forEach((el) => (el.hidden = el.dataset.show !== mode));
      $('#modeHint').textContent = mode === 'simple'
        ? 'Describe it in plain words and we handle lyrics, style and arrangement.'
        : 'Full control: your title, your lyrics, your style, plus fine-tuning.';
    };
    bindSeg($('#modeSeg'), (b) => setMode(b.dataset.mode));
    setMode(S.mode);

    // Ideas
    $('#ideaChips').innerHTML = QUICK_IDEAS.map((i) => `<button type="button" class="chip">${esc(i)}</button>`).join('');
    $('#ideaChips').onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; const t = $('#simplePrompt'); t.value = c.textContent; t.dispatchEvent(new Event('input')); t.focus(); };
    $('#surpriseBtn').onclick = () => { const t = $('#simplePrompt'); let i; do { i = pick(IDEAS); } while (i === t.value && IDEAS.length > 1); t.value = i; t.dispatchEvent(new Event('input')); };

    // Tag tray
    $('#tagTray').innerHTML = Object.entries(TAGS).map(([g, tags]) => `<div class="tag-group"><b>${g}</b>${tags.map((t) => `<button type="button" class="chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`).join('');
    const style = $('#cStyle');
    const syncTags = () => { const cur = style.value.toLowerCase().split(',').map((s) => s.trim()); $$('#tagTray .chip').forEach((c) => c.classList.toggle('on', cur.includes(c.dataset.tag))); };
    $('#tagTray').onclick = (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      let parts = style.value.split(',').map((s) => s.trim()).filter(Boolean);
      const i = parts.findIndex((p) => p.toLowerCase() === c.dataset.tag);
      if (i >= 0) parts.splice(i, 1); else parts.push(c.dataset.tag);
      style.value = parts.join(', '); style.dispatchEvent(new Event('input'));
    };
    style.addEventListener('input', syncTags);

    // Structure tags
    $('#structTags').innerHTML = STRUCT.map((t) => `<button type="button" class="chip">${t}</button>`).join('');
    $('#structTags').onclick = (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      const ta = $('#cLyrics'); const pos = ta.selectionStart; const before = ta.value.slice(0, pos);
      const ins = (before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '') + c.textContent + '\n';
      ta.setRangeText(ins, pos, ta.selectionEnd, 'end'); ta.focus(); ta.dispatchEvent(new Event('input'));
    };

    // Instrumental hides lyrics
    const inst = $('#cInstrumental');
    const syncInst = () => { $('#lyricsField').hidden = inst.checked; $('#vocalField').style.opacity = inst.checked ? .4 : 1; $('#audioWeightField').hidden = inst.checked; };
    inst.addEventListener('change', syncInst); syncInst();
    bindSeg($('#vocalSeg'));

    // Boost style
    $('#boostBtn').onclick = async () => {
      const content = style.value.trim();
      if (!content) { toast('Add a few style words first', 'e.g. "pop, mysterious" and Boost turns it into a rich description.'); style.focus(); return; }
      const btn = $('#boostBtn'); btn.disabled = true; btn.textContent = '✨ Boosting…';
      try {
        const d = await api('/api/v1/style/generate', { method: 'POST', body: { content } });
        if (d && d.result) {
          const prev = style.value;
          style.value = d.result.slice(0, 1000); style.dispatchEvent(new Event('input'));
          $('#boostUndo').innerHTML = `Style boosted. <button type="button" class="link-btn">Undo</button>`;
          $('#boostUndo button').onclick = () => { style.value = prev; style.dispatchEvent(new Event('input')); $('#boostUndo').textContent = ''; };
          refreshCredits();
        } else toast('No boost came back', d?.errorMessage || 'Try different words.', 'err');
      } catch (e) { toast('Could not boost style', e.message, 'err'); }
      finally { btn.disabled = false; btn.textContent = '✨ Boost style'; }
    };

    // AI lyrics inline
    $('#aiLyricsToggle').onclick = () => { const r = $('#aiLyricsRow'); r.hidden = !r.hidden; if (!r.hidden) { $('#aiLyricsPrompt').value ||= $('#cTitle').value; $('#aiLyricsPrompt').focus(); } };
    $('#aiLyricsGo').onclick = async () => {
      const p = $('#aiLyricsPrompt').value.trim();
      if (!p) return $('#aiLyricsPrompt').focus();
      const btn = $('#aiLyricsGo'); setBusy(btn, true);
      try {
        const id = await startLyrics(p);
        toast('Writing lyrics…', 'They will drop into the editor in a few seconds.');
        trackTask({ type: 'lyrics', taskId: id, ref: { into: 'create', prompt: p } });
      } catch (e) { toast('Could not start lyrics', e.message, 'err'); }
      finally { setBusy(btn, false); }
    };

    // Model picker
    renderModelPicker();
    $('#legacyToggle').onclick = () => { S.showLegacy = !S.showLegacy; renderModelPicker(); };

    // Advanced
    const variety = $('#cVariety');
    variety.addEventListener('input', () => ($('#cVarietyVal').textContent = VARIETY[variety.value]));
    $('#cTune').addEventListener('change', (e) => ($('#tuneBox').hidden = !e.target.checked));
    $('#cDurOn').addEventListener('change', (e) => ($('#durRow').hidden = !e.target.checked));
    const dur = $('#cDur'); dur.addEventListener('input', () => ($('#cDurVal').textContent = fmt(dur.value))); $('#cDurVal').textContent = fmt(dur.value);
    personaSlot($('#advanced [data-persona-slot]'), 'c');

    // Reference media
    const addRef = (kind, url, name) => { refMedia.push({ kind, url, name }); renderRefs(); };
    dropzone($('#refDrop'), $('#refFile'), async (files) => {
      for (const f of files) {
        const kind = f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : null;
        if (!kind) { toast('Unsupported file', f.name, 'err'); continue; }
        if (kind === 'image' && refMedia.filter((m) => m.kind === 'image').length >= 5) { toast('Max 5 images'); continue; }
        if (kind === 'video' && refMedia.some((m) => m.kind === 'video')) { toast('Only 1 video allowed'); continue; }
        const item = { kind, name: f.name, uploading: true }; refMedia.push(item); renderRefs();
        try { item.url = await uploadFile(f); item.uploading = false; }
        catch (e) { refMedia.splice(refMedia.indexOf(item), 1); toast('Upload failed', e.message, 'err'); }
        renderRefs();
      }
    });
    $('#refUrlAdd').onclick = () => {
      const u = $('#refUrl').value.trim();
      if (!/^https?:\/\//.test(u)) { toast('Paste a full http(s) URL'); return; }
      addRef($('#refUrlKind').value, u, u.split('/').pop() || u); $('#refUrl').value = '';
    };
    $('#refList').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) { refMedia.splice(+b.dataset.rm, 1); renderRefs(); } };

    $('#createForm').addEventListener('submit', (e) => { e.preventDefault(); submitCreate(); });
  }

  function renderRefs() {
    const ic = { image: '🖼', video: '🎬', audio: '🎧' };
    $('#refList').innerHTML = refMedia.map((m, i) => `<span class="media ${m.uploading ? 'up' : ''}">${ic[m.kind]} <span class="nm" title="${esc(m.name)}">${esc(m.name)}</span>${m.uploading ? '<span class="muted small">uploading…</span>' : `<button type="button" class="icon-btn" data-rm="${i}" aria-label="Remove">✕</button>`}</span>`).join('');
  }

  function renderModelPicker() {
    const list = S.showLegacy ? ALL_MODELS : MODELS;
    if (!list.some((m) => m.id === S.model)) S.model = 'V6';
    $('#modelPicker').innerHTML = list.map((m) => `<button type="button" class="model ${LEGACY_MODELS.includes(m) ? 'legacy' : ''}" data-model="${m.id}" aria-pressed="${m.id === S.model}">
        <span class="m-name">${m.name}<span class="m-tag">${m.tag}</span></span><span class="m-desc">${m.desc}</span></button>`).join('');
    $('#legacyToggle').textContent = S.showLegacy ? 'Hide legacy models' : 'Show legacy models';
    $$('#modelPicker .model').forEach((b) => (b.onclick = () => { S.model = b.dataset.model; store.set('model', S.model); renderModelPicker(); }));
    const durOk = DURATION_MODELS.has(S.model);
    $('#durationBox').hidden = !durOk; $('#durNote').hidden = durOk;
    $('#cStyle').maxLength = S.model === 'V4' ? 200 : 1000;
    $('#cLyrics').maxLength = S.model === 'V4' ? 3000 : 5000;
    $('#cStyle').dispatchEvent(new Event('input')); $('#cLyrics').dispatchEvent(new Event('input'));
  }

  function tuneParams(prefix, instrumental) {
    const p = { variety: +$(`#${prefix}Variety`).value };
    if ($(`#${prefix}Tune`).checked) {
      p.styleWeight = +(+$(`#${prefix}StyleWeight`).value).toFixed(2);
      p.weirdnessConstraint = +(+$(`#${prefix}Weird`).value).toFixed(2);
      if (!instrumental) p.audioWeight = +(+$(`#${prefix}AudioWeight`).value).toFixed(2);
    }
    return p;
  }

  async function submitCreate() {
    const btn = $('#createBtn');
    const model = S.model;
    let body, label;
    if (S.mode === 'simple') {
      const prompt = $('#simplePrompt').value.trim();
      const style = $('#simpleStyle').value.trim();
      if (refMedia.some((m) => m.uploading)) return toast('Hang on, files are still uploading');
      if (!prompt && !style && !refMedia.length) { toast('Tell us what the song is about', 'Or tap 🎲 Surprise me for an idea.'); $('#simplePrompt').focus(); return; }
      body = { customMode: false, instrumental: $('#sInstrumental').checked, model, prompt, style, callBackUrl: callbackUrl() };
      const by = (k) => refMedia.filter((m) => m.kind === k && m.url).map((m) => m.url);
      if (by('image').length) body.imageUrls = by('image');
      if (by('video').length) body.videoUrls = by('video');
      if (by('audio').length) body.audioUrls = by('audio');
      label = prompt || style || 'Inspired by media';
    } else {
      const instrumental = $('#cInstrumental').checked;
      const title = $('#cTitle').value.trim();
      const style = $('#cStyle').value.trim();
      const lyrics = instrumental ? '' : $('#cLyrics').value.trim();
      const negativeTags = $('#cNegative').value.trim();
      if (!style && !lyrics && !negativeTags) { toast('Add a style or some lyrics', 'Custom mode needs at least a style, lyrics, or things to avoid.'); $('#cStyle').focus(); return; }
      body = { customMode: true, instrumental, model, title, style, negativeTags, callBackUrl: callbackUrl(), ...tuneParams('c', instrumental) };
      if (lyrics) { if (model.startsWith('V6')) body.lyrics = lyrics; else body.prompt = lyrics; }
      if (!instrumental) { const v = segValue($('#vocalSeg')); if (v) body.vocalGender = v; }
      if (DURATION_MODELS.has(model) && $('#cDurOn').checked) body.duration = +$('#cDur').value;
      if (PERSONA_MODELS.has(model)) Object.assign(body, personaValue('c'));
      label = title || style || 'Untitled';
    }
    setBusy(btn, true, 'Sending to the studio…');
    try {
      const d = await api('/api/v1/generate', { method: 'POST', body: clean(body) });
      addJob({ taskId: d.taskId, kind: 'generate', label, model });
      toast('Your song is cooking 🎶', 'First take usually streams in under a minute.', 'ok', { label: 'Watch in library', fn: () => goto('library') });
      refreshCredits();
    } catch (e) { handleErr('Could not start the song', e); }
    finally { setBusy(btn, false); }
  }

  function handleErr(title, e) {
    if (e.code === 401) return lockOut('Your API key was rejected. Please enter it again.');
    toast(title, e.message, 'err');
  }

  // ===================================================================
  // REMIX
  // ===================================================================
  const src = { A: { url: '' }, B: { url: '' } };
  let remixOp = 'cover';

  function initRemix() {
    $('#remixOps').innerHTML = Object.entries(REMIX_OPS).map(([k, o]) => `<button type="button" class="op" data-op="${k}" aria-pressed="${k === remixOp}"><span class="o-ic">${o.ic}</span><b>${o.name}</b><span>${o.blurb}</span></button>`).join('');
    $('#remixOps').onclick = (e) => { const b = e.target.closest('.op'); if (b) setRemixOp(b.dataset.op); };
    modelOptions($('#rModel'));
    bindSeg($('#rVocalSeg'));
    $('#rVariety').addEventListener('input', (e) => ($('#rVarietyVal').textContent = VARIETY[e.target.value]));
    $('#rTune').addEventListener('change', (e) => ($('#rTuneBox').hidden = !e.target.checked));
    $('#rDurOn').addEventListener('change', (e) => ($('#rDurRow').hidden = !e.target.checked));
    $('#rDur').addEventListener('input', (e) => ($('#rDurVal').textContent = fmt(e.target.value)));
    $('#rInstrumental').addEventListener('change', (e) => ($('#rLyricsField').hidden = e.target.checked && remixOp !== 'vocals'));
    personaSlot($('#remixForm [data-persona-slot]'), 'r');

    $$('#remixForm .src').forEach((box) => {
      const id = box.dataset.src;
      const status = box.querySelector('[data-src-status]');
      const setUrl = (url, label) => { src[id].url = url; box.classList.toggle('ready', !!url); status.textContent = url ? `✓ ${label || 'Ready'}` : ''; status.classList.toggle('src-status-ok', !!url); };
      bindSeg(box.querySelector('[data-src-tabs]'), (b) => {
        $$('[data-k-pane]', box).forEach((p) => (p.hidden = p.dataset.kPane !== b.dataset.k));
        setUrl('');
      });
      const dz = box.querySelector('[data-k-pane="file"]');
      dropzone(dz, dz.querySelector('input'), async ([f]) => {
        if (!f.type.startsWith('audio')) return toast('Please choose an audio file');
        setUrl(''); status.textContent = `Uploading ${f.name}…`;
        try { setUrl(await uploadFile(f), f.name); }
        catch (e) { status.textContent = ''; toast('Upload failed', e.message + ' You can also paste a public URL instead.', 'err'); }
      });
      box.querySelector('[data-url]').addEventListener('input', (e) => { const v = e.target.value.trim(); setUrl(/^https?:\/\//.test(v) ? v : '', 'URL set'); });
      box.querySelector('[data-lib]').addEventListener('change', (e) => { const t = findTrack(e.target.value); setUrl(t ? trackAudio(t) : '', t?.title); });
      src[id].setUrl = setUrl;
    });
    setRemixOp(remixOp);
    $('#remixForm').addEventListener('submit', (e) => { e.preventDefault(); submitRemix(); });
  }

  function setRemixOp(op) {
    remixOp = op;
    $$('#remixOps .op').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.op === op)));
    $$('#remixForm [data-ops]').forEach((el) => (el.hidden = !el.dataset.ops.split(' ').includes(op)));
    const two = op === 'mashup';
    $('#remixForm [data-src="B"]').hidden = !two;
    $('#remixForm .src-wrap').classList.toggle('two', two);
    $('#remixForm [data-src-label]').textContent = { cover: 'Track to cover', extend: 'Track to extend', vocals: 'Instrumental to sing over', instrumental: 'Vocal / melody track', mashup: 'First track' }[op];
    const required = op === 'vocals' || op === 'instrumental';
    $$('#remixForm [data-req-note]').forEach((n) => (n.textContent = required ? 'required' : 'optional'));
    $('#rLyricsField').hidden = $('#rInstrumental').checked && op !== 'vocals';
    $('#remixHint').textContent = {
      cover: 'Keeps the melody, changes the style. Max 8 min source.',
      extend: 'Continues in the same style. Max 8 min source.',
      vocals: 'Lyrics are optional. Leave blank to let the AI write them.',
      instrumental: 'Builds a backing track that fits your vocal.',
      mashup: 'Blends the two tracks into a new piece.',
    }[op];
  }

  function fillLibrarySelects() {
    const opts = allTracks().filter((t) => t.audio_url).map((t) => `<option value="${esc(t.id)}">${esc(t.title || 'Untitled')}${t.duration ? ` (${fmt(t.duration)})` : ''}</option>`).join('');
    $$('#remixForm [data-lib]').forEach((s) => { const v = s.value; s.innerHTML = `<option value="">${opts ? 'Choose a track…' : 'No finished tracks yet'}</option>${opts}`; s.value = v; });
  }

  async function submitRemix() {
    const op = remixOp;
    const conf = REMIX_OPS[op];
    if (!src.A.url) return toast('Add your source audio first', 'Upload a file, paste a URL or pick from your library.');
    if (op === 'mashup' && !src.B.url) return toast('Add the second track for the mashup');
    const model = $('#rModel').value;
    const title = $('#rTitle').value.trim();
    const style = $('#rStyle').value.trim();
    const lyrics = $('#rLyrics').value.trim();
    const instrumental = (op === 'cover' || op === 'extend') && $('#rInstrumental').checked;
    const vocal = segValue($('#rVocalSeg'));
    const body = { model, callBackUrl: callbackUrl(), ...tuneParams('r', instrumental) };

    if (op === 'vocals' || op === 'instrumental') {
      const neg = $('#rNegative').value.trim();
      if (!title) { $('#rTitle').focus(); return toast('A title is required for this remix'); }
      if (!style) { $('#rStyle').focus(); return toast('A style is required for this remix'); }
      if (!neg) { $('#rNegative').focus(); return toast('Tell us what to avoid', 'Required here. Something like "off-key, distorted" works.'); }
      Object.assign(body, { uploadUrl: src.A.url, title, negativeTags: neg });
      if (op === 'vocals') { body.style = style; if (lyrics) body.lyrics = lyrics; }
      else body.tags = style;
      if (vocal) body.vocalGender = vocal;
    } else {
      Object.assign(body, { title, style, negativeTags: $('#rNegative2').value.trim() });
      if (op === 'mashup') body.uploadUrlList = [src.A.url, src.B.url]; else body.uploadUrl = src.A.url;
      if (op !== 'mashup') body.instrumental = instrumental;
      if (lyrics && !instrumental) { if (model.startsWith('V6')) body.lyrics = lyrics; else body.prompt = lyrics; }
      if (vocal && !instrumental) body.vocalGender = vocal;
      if (op === 'extend' && $('#rContinue').value) body.continueAt = +$('#rContinue').value;
      if ((op === 'cover' || op === 'mashup') && $('#rDurOn').checked && DURATION_MODELS.has(model)) body.duration = +$('#rDur').value;
      if (PERSONA_MODELS.has(model)) Object.assign(body, personaValue('r'));
    }
    const btn = $('#remixBtn'); setBusy(btn, true, 'Starting…');
    try {
      const d = await api(conf.path, { method: 'POST', body: clean(body) });
      addJob({ taskId: d.taskId, kind: op === 'extend' ? 'upload-extend' : op, label: title || `${conf.name}${style ? ' · ' + style : ''}`, model });
      toast(`${conf.name} started ${conf.ic}`, 'Track progress in your library.', 'ok', { label: 'Open library', fn: () => goto('library') });
      refreshCredits();
    } catch (e) { handleErr(`Could not start ${conf.name.toLowerCase()}`, e); }
    finally { setBusy(btn, false); }
  }

  function remixFromTrack(track, op = 'cover') {
    goto('remix'); setRemixOp(op);
    const box = $('#remixForm [data-src="A"]');
    box.querySelector('[data-src-tabs] [data-k="lib"]').click();
    fillLibrarySelects();
    box.querySelector('[data-lib]').value = track.id;
    src.A.setUrl(trackAudio(track), track.title);
    $('#rTitle').value = track.title ? `${track.title} (${REMIX_OPS[op].name})` : '';
  }

  // ===================================================================
  // SOUNDS
  // ===================================================================
  function initSounds() {
    modelOptions($('#sModel'));
    $('#sKey').innerHTML = KEYS.map((k) => `<option>${k}</option>`).join('');
    $('#soundChips').innerHTML = SOUND_IDEAS.map((i) => `<button type="button" class="chip">${esc(i)}</button>`).join('');
    $('#soundChips').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { $('#sPrompt').value = c.textContent; $('#sPrompt').dispatchEvent(new Event('input')); } };
    $('#sBpm').addEventListener('input', (e) => ($('#sBpmVal').textContent = +e.target.value ? `${e.target.value} BPM` : 'Auto'));
    $('#soundsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = $('#sPrompt').value.trim();
      if (!prompt) { $('#sPrompt').focus(); return toast('Describe the sound you want'); }
      const body = { prompt, model: $('#sModel').value, soundLoop: $('#sLoop').checked, soundKey: $('#sKey').value, grabLyrics: $('#sGrab').checked, callBackUrl: callbackUrl() };
      if (+$('#sBpm').value) body.soundTempo = +$('#sBpm').value;
      const btn = $('#soundsBtn'); setBusy(btn, true, 'Starting…');
      try {
        const d = await api('/api/v1/generate/sounds', { method: 'POST', body });
        addJob({ taskId: d.taskId, kind: 'sounds', label: prompt, model: body.model });
        toast('Sound on the way ◉', 'It will appear in your library.', 'ok', { label: 'Open library', fn: () => goto('library') });
        refreshCredits();
      } catch (err) { handleErr('Could not start the sound', err); }
      finally { setBusy(btn, false); }
    });
  }

  // ===================================================================
  // LYRICS
  // ===================================================================
  async function startLyrics(prompt) {
    const d = await api('/api/v1/lyrics', { method: 'POST', body: { prompt, callBackUrl: callbackUrl() } });
    return d.taskId;
  }
  function initLyrics() {
    $('#lyricChips').innerHTML = LYRIC_IDEAS.map((i) => `<button type="button" class="chip">${esc(i)}</button>`).join('');
    $('#lyricChips').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { $('#lPrompt').value = c.textContent; $('#lPrompt').dispatchEvent(new Event('input')); } };
    $('#lyricsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const p = $('#lPrompt').value.trim();
      if (!p) { $('#lPrompt').focus(); return toast('What should the lyrics be about?'); }
      const btn = $('#lyricsBtn'); setBusy(btn, true, 'Writing…');
      try {
        const id = await startLyrics(p);
        S.lyrics.unshift({ taskId: id, prompt: p, status: 'PENDING', items: [], createdAt: Date.now() }); save.lyrics();
        trackTask({ type: 'lyrics', taskId: id, ref: { into: 'lab' } });
        renderLyrics();
      } catch (err) { handleErr('Could not write lyrics', err); }
      finally { setBusy(btn, false); }
    });
    renderLyrics();
  }
  function renderLyrics() {
    const host = $('#lyricsResults');
    if (!S.lyrics.length) { host.innerHTML = `<div class="card empty"><div class="eq"><span></span><span></span><span></span><span></span><span></span></div>Your lyric drafts will show up here.<br/>Each request gives you a couple of options.</div>`; return; }
    host.innerHTML = S.lyrics.map((L, li) => {
      if (L.status === 'PENDING') return `<div class="lyric-card"><div class="job-top"><b>${esc(L.prompt)}</b><span class="status">Writing</span></div><div class="stage" style="margin-top:10px"><i class="live"></i><i></i></div></div>`;
      if (L.error) return `<div class="lyric-card"><div class="job-top"><b>${esc(L.prompt)}</b><span class="status err">Failed</span></div><p class="muted small">${esc(L.error)}</p></div>`;
      return L.items.map((it, ii) => `<div class="lyric-card"><div class="job-top"><b>${esc(it.title || L.prompt)}</b><span class="muted small">Option ${ii + 1} · ${ago(L.createdAt)}</span></div>
        <pre>${esc(it.text)}</pre>
        <div class="lyric-actions"><button class="btn btn-primary" data-use="${li}:${ii}">Use in a song →</button><button class="btn btn-ghost" data-copy="${li}:${ii}">Copy</button></div></div>`).join('');
    }).join('');
    host.onclick = async (e) => {
      const u = e.target.closest('[data-use]'); const c = e.target.closest('[data-copy]');
      const ref = (u || c)?.dataset[u ? 'use' : 'copy']; if (!ref) return;
      const [li, ii] = ref.split(':').map(Number); const it = S.lyrics[li].items[ii];
      if (c) { try { await navigator.clipboard.writeText(it.text); toast('Copied to clipboard', '', 'ok'); } catch { toast('Copy failed'); } return; }
      useLyrics(it.text, it.title);
    };
  }
  function useLyrics(text, title) {
    goto('create');
    $('#modeSeg [data-mode="custom"]').click();
    $('#cInstrumental').checked = false; $('#cInstrumental').dispatchEvent(new Event('change'));
    $('#cLyrics').value = text; $('#cLyrics').dispatchEvent(new Event('input'));
    if (title && !$('#cTitle').value) $('#cTitle').value = title;
    toast('Lyrics loaded ✍️', 'Pick a style and hit Generate.', 'ok');
    setTimeout(() => $('#cStyle').focus(), 300);
  }

  // ===================================================================
  // Jobs (music-producing tasks)
  // ===================================================================
  function addJob({ taskId, kind, label, model, parent }) {
    const job = { taskId, kind, label, model, parent, status: 'PENDING', tracks: [], createdAt: Date.now() };
    S.jobs.unshift(job); save.jobs();
    trackTask({ type: 'music', taskId });
    renderAll();
    return job;
  }
  const findJob = (taskId) => S.jobs.find((j) => j.taskId === taskId);
  const allTracks = () => S.jobs.flatMap((j) => j.tracks.map((t) => Object.assign(t, { _task: j.taskId })));
  const findTrack = (id) => allTracks().find((t) => t.id === id);

  function applyMusicRecord(job, d) {
    const prev = job.status;
    job.status = d.status || job.status;
    job.errorMessage = d.errorMessage || '';
    const list = d.response?.sunoData || [];
    if (list.length) {
      job.tracks = list.map((t) => ({
        id: t.id, title: t.title || job.label, tags: t.tags, prompt: t.prompt, duration: t.duration,
        audio_url: t.audio_url || t.source_audio_url || '', stream_audio_url: t.stream_audio_url || t.source_stream_audio_url || '',
        image_url: t.image_url || t.source_image_url || '', model_name: t.model_name, createTime: t.createTime,
      }));
    }
    if (job.status === 'CALLBACK_EXCEPTION' && job.tracks.some((t) => t.audio_url)) job.status = 'SUCCESS';
    return prev !== job.status;
  }
  const isFail = (s) => /FAIL|ERROR|EXCEPTION/.test(s || '');
  const isDone = (job) => job.status === 'SUCCESS' || isFail(job.status) || job.timedOut;

  // ===================================================================
  // Task poller (all async tasks)
  // ===================================================================
  const POLL = {
    music: { path: '/api/v1/generate/record-info' },
    lyrics: { path: '/api/v1/lyrics/record-info' },
    wav: { path: '/api/v1/wav/record-info' },
    stems: { path: '/api/v1/vocal-removal/record-info' },
    video: { path: '/api/v1/mp4/record-info' },
    coverart: { path: '/api/v1/suno/cover/record-info' },
    midi: { path: '/api/v1/midi/record-info' },
  };
  function trackTask(t) {
    if (S.tasks.some((x) => x.taskId === t.taskId && x.type === t.type)) return;
    S.tasks.push({ ...t, startedAt: Date.now() }); save.tasks();
    kickPoll();
  }
  let polling = false, pollTimer = null;
  function kickPoll(delay = 1500) { clearTimeout(pollTimer); pollTimer = setTimeout(pollOnce, delay); }
  async function pollOnce() {
    if (polling || !S.key) return;
    polling = true;
    let changed = false;
    for (const t of [...S.tasks]) {
      try {
        const d = await api(POLL[t.type].path, { query: { taskId: t.taskId } });
        if (d && handleTaskResult(t, d)) { S.tasks = S.tasks.filter((x) => x !== t); changed = true; }
        else if (Date.now() - t.startedAt > TASK_TIMEOUT_MS) { S.tasks = S.tasks.filter((x) => x !== t); onTimeout(t); changed = true; }
      } catch (e) {
        if (e.code === 401) { polling = false; return lockOut('Your API key was rejected. Please enter it again.'); }
        if (Date.now() - t.startedAt > TASK_TIMEOUT_MS) { S.tasks = S.tasks.filter((x) => x !== t); onTimeout(t); changed = true; }
      }
    }
    if (changed) save.tasks();
    polling = false;
    if (S.tasks.length) kickPoll(POLL_MS);
  }
  function onTimeout(t) {
    if (t.type === 'music') { const j = findJob(t.taskId); if (j) { j.timedOut = true; save.jobs(); renderAll(); } }
    toast('A task is taking unusually long', 'Use "Check again" on it in the library later.', 'err');
  }

  // returns true when the task is finished (success or failure)
  function handleTaskResult(t, d) {
    switch (t.type) {
      case 'music': {
        const job = findJob(t.taskId);
        if (!job) return true;
        const changed = applyMusicRecord(job, d);
        if (changed || job.status === 'FIRST_SUCCESS') { save.jobs(); renderAll(); }
        if (changed && job.status === 'FIRST_SUCCESS') toast(`“${job.tracks[0]?.title || job.label}” is streaming`, 'You can listen while it finishes.', 'ok', { label: '▶ Play now', fn: () => playTrack(job.tracks[0].id) });
        if (job.status === 'SUCCESS') {
          if (changed) { toast(`“${job.tracks[0]?.title || job.label}” is ready ✨`, `${job.tracks.length} take${job.tracks.length > 1 ? 's' : ''} in your library.`, 'ok', { label: '▶ Play', fn: () => playTrack(job.tracks[0].id) }); refreshCredits(); }
          return true;
        }
        if (isFail(job.status)) { toast('Generation failed', job.errorMessage || friendlyStatus(job.status), 'err'); refreshCredits(); return true; }
        return false;
      }
      case 'lyrics': {
        const items = (d.response?.data || []).filter((x) => x.status !== 'failed' && x.text);
        const done = d.status === 'SUCCESS' || isFail(d.status);
        if (!done) return false;
        if (t.ref.into === 'create') {
          if (items.length) { const ta = $('#cLyrics'); ta.value = items[0].text; ta.dispatchEvent(new Event('input')); if (!$('#cTitle').value && items[0].title) $('#cTitle').value = items[0].title; $('#aiLyricsRow').hidden = true; toast('Lyrics written ✍️', items.length > 1 ? 'More options are waiting in the Lyrics tab.' : '', 'ok'); }
          else toast('Lyrics failed', d.errorMessage || friendlyStatus(d.status), 'err');
          S.lyrics.unshift({ taskId: t.taskId, prompt: t.ref.prompt, status: 'SUCCESS', items, createdAt: Date.now(), error: items.length ? '' : (d.errorMessage || 'Failed') });
        } else {
          const L = S.lyrics.find((x) => x.taskId === t.taskId);
          if (L) { L.status = 'SUCCESS'; L.items = items; if (!items.length) L.error = d.errorMessage || friendlyStatus(d.status); }
          if (items.length) toast('Lyrics are ready ✍️', `${items.length} option${items.length > 1 ? 's' : ''} in the Lyrics lab.`, 'ok', { label: 'View', fn: () => goto('lyrics') });
        }
        save.lyrics(); renderLyrics(); refreshCredits();
        return true;
      }
      case 'wav': case 'video': case 'stems': {
        const flag = d.successFlag;
        const ex = extrasFor(t.ref.trackId);
        const slot = ex[t.type] = ex[t.type] || {};
        if (flag === 'SUCCESS') {
          if (t.type === 'wav') slot.url = d.response?.audioWavUrl;
          if (t.type === 'video') slot.url = d.response?.videoUrl;
          if (t.type === 'stems') slot.data = d.response;
          slot.status = 'done';
          toast({ wav: 'WAV is ready 🎚', video: 'Music video is ready 🎬', stems: 'Stems are separated 🎛' }[t.type], findTrack(t.ref.trackId)?.title || '', 'ok', { label: 'Open', fn: () => openTrackSheet(t.ref.trackId) });
        } else if (flag && flag !== 'PENDING') { slot.status = 'error'; slot.error = d.errorMessage || friendlyStatus(flag); toast('Task failed', slot.error, 'err'); }
        else return false;
        save.extras(); rerenderSheet(t.ref.trackId); refreshCredits();
        return true;
      }
      case 'coverart': {
        const flag = d.successFlag;
        const slot = S.covers[t.ref.jobId] = S.covers[t.ref.jobId] || {};
        if (flag === 1 || flag === '1' || flag === 'SUCCESS') { slot.status = 'done'; slot.images = d.response?.images || []; toast('Cover art is ready 🖼', '', 'ok'); }
        else if (flag === 3 || flag === '3' || isFail(String(flag))) { slot.status = 'error'; slot.error = d.errorMessage || 'Generation failed'; toast('Cover art failed', slot.error, 'err'); }
        else return false;
        save.covers(); renderAll(); rerenderSheet(t.ref.trackId); refreshCredits();
        return true;
      }
      case 'midi': {
        const ex = extrasFor(t.ref.trackId); const slot = ex.midi = ex.midi || {};
        const inst = d.midiData?.instruments;
        const failed = !!d.errorMessage || /FAIL/i.test(String(d.successFlag)) || d.midiData?.state === 'failed';
        if (inst && inst.length) { slot.status = 'done'; slot.instruments = inst; toast('MIDI is ready 🎹', `${inst.length} instrument${inst.length > 1 ? 's' : ''} detected.`, 'ok'); }
        else if (failed || d.midiData?.state === 'complete') { slot.status = 'error'; slot.error = d.errorMessage || (failed ? 'MIDI generation failed' : 'No notes were detected'); toast('MIDI failed', slot.error, 'err'); }
        else return false;
        save.extras(); rerenderSheet(t.ref.trackId); refreshCredits();
        return true;
      }
    }
    return true;
  }
  function friendlyStatus(s) {
    return ({
      SENSITIVE_WORD_ERROR: 'The prompt or lyrics tripped the content filter. Try rephrasing.',
      CREATE_TASK_FAILED: 'The task could not be created.',
      GENERATE_AUDIO_FAILED: 'Audio generation failed. Try again or change your prompt.',
      GENERATE_LYRICS_FAILED: 'Lyrics generation failed.',
      CALLBACK_EXCEPTION: 'The task finished with an error.',
    })[s] || 'Something went wrong.';
  }
  const extrasFor = (id) => (S.extras[id] = S.extras[id] || {});

  // ===================================================================
  // Rendering: job cards, library
  // ===================================================================
  function stageBar(job) {
    const n = MUSIC_STAGES[job.status] || 0;
    return `<div class="stage">${[1, 2, 3, 4].map((i) => `<i class="${i < n || job.status === 'SUCCESS' ? 'on' : i === n ? 'live' : ''}"></i>`).join('')}</div>`;
  }
  function statusPill(job) {
    if (job.timedOut && !isDone({ status: job.status })) return `<span class="status err">Stalled</span>`;
    if (isFail(job.status)) return `<span class="status err">Failed</span>`;
    return `<span class="status ${job.status === 'SUCCESS' ? 'ok' : ''}">${MUSIC_LABEL[job.status] || job.status}</span>`;
  }
  function artFor(t, job) {
    const c = job && S.covers[job.taskId];
    return (c && c.images && c.images[0]) || t.image_url || '';
  }

  function renderRecent() {
    const host = $('#recentJobs');
    const jobs = S.jobs.slice(0, 4);
    if (!jobs.length) {
      host.innerHTML = `<div class="empty"><div class="eq"><span></span><span></span><span></span><span></span><span></span></div>Nothing cooking yet.<br/>Your songs will appear here as they generate.</div>`;
      return;
    }
    host.innerHTML = jobs.map((j) => `<div class="job">
      <div class="job-top"><span class="job-title">${esc(j.tracks[0]?.title || j.label)}</span>${statusPill(j)}</div>
      ${isDone(j) ? '' : stageBar(j)}
      <div class="job-meta">${KIND_LABEL[j.kind] || 'Song'} · ${esc(modelName(j.model))} · ${ago(j.createdAt)}</div>
      ${j.tracks.length ? `<div class="mini-tracks">${j.tracks.map((t) => `<div class="mini-track">${artFor(t, j) ? `<img src="${esc(artFor(t, j))}" alt="" loading="lazy" />` : '<span class="ph"></span>'}<span class="t">${esc(t.title)}<small>${t.duration ? fmt(t.duration) : trackAudio(t) ? 'streaming' : '…'}</small></span>${trackAudio(t) ? `<button class="icon-btn" data-play="${esc(t.id)}" aria-label="Play">${S.playing === t.id && !audio.paused ? '❚❚' : '▶'}</button>` : ''}</div>`).join('')}</div>` : ''}
      ${isFail(j.status) ? `<div class="muted small">${esc(j.errorMessage || friendlyStatus(j.status))}</div>` : ''}
    </div>`).join('');
  }

  let libFilter = 'all';
  function renderLibrary() {
    const host = $('#libGrid');
    const q = $('#libSearch').value.trim().toLowerCase();
    const parts = [];
    const pending = S.jobs.filter((j) => !isDone(j) || (j.timedOut && !j.tracks.length) || (isFail(j.status) && !j.tracks.length));
    if (libFilter !== 'fav') for (const j of pending) {
      if (q && !(j.label || '').toLowerCase().includes(q)) continue;
      const failed = isFail(j.status) || j.timedOut;
      parts.push(`<div class="job-pending ${failed ? 'err' : ''}">
        ${failed ? '<span style="font-size:1.6rem">⚠️</span>' : '<div class="eq"><span></span><span></span><span></span><span></span><span></span><span></span></div>'}
        <div class="grow"><div class="job-top"><b class="job-title">${esc(j.label)}</b>${statusPill(j)}</div>
        ${failed ? `<div class="muted small">${esc(j.errorMessage || (j.timedOut ? 'No answer yet from Suno API.' : friendlyStatus(j.status)))}</div>` : stageBar(j)}
        <div class="job-meta">${KIND_LABEL[j.kind] || 'Song'} · ${esc(modelName(j.model))} · started ${ago(j.createdAt)} · <span class="ids">${esc(j.taskId)}</span></div></div>
        ${failed ? `<div class="t-actions">${j.timedOut ? `<button class="btn btn-ghost" data-recheck="${esc(j.taskId)}">Check again</button>` : ''}<button class="btn btn-ghost" data-dismiss="${esc(j.taskId)}">Dismiss</button></div>` : ''}
      </div>`);
    }
    let tracks = [];
    for (const j of S.jobs) for (const t of j.tracks) tracks.push([t, j]);
    if (libFilter === 'fav') tracks = tracks.filter(([t]) => S.favs[t.id]);
    if (libFilter === 'active') tracks = tracks.filter(([, j]) => !isDone(j));
    if (q) tracks = tracks.filter(([t, j]) => `${t.title} ${t.tags} ${j.label}`.toLowerCase().includes(q));
    for (const [t, j] of tracks) {
      const art = artFor(t, j); const playable = !!trackAudio(t);
      parts.push(`<article class="track ${S.playing === t.id ? 'playing' : ''}" data-track="${esc(t.id)}">
        <div class="art">${art ? `<img src="${esc(art)}" alt="" loading="lazy" />` : `<div class="ph-ic">${esc((t.title || '♪').slice(0, 1).toUpperCase())}</div>`}
          <button class="fav ${S.favs[t.id] ? 'on' : ''}" data-fav="${esc(t.id)}" aria-label="Favourite">${S.favs[t.id] ? '★' : '☆'}</button>
          ${!t.audio_url && t.stream_audio_url ? '<span class="streaming">● LIVE STREAM</span>' : ''}
          ${playable ? `<button class="play-over" data-play="${esc(t.id)}" aria-label="Play">${S.playing === t.id && !audio.paused ? '❚❚' : '▶'}</button>` : ''}</div>
        <div class="t-body"><div class="t-title" title="${esc(t.title)}">${esc(t.title || 'Untitled')}</div>
          <div class="t-tags">${esc(t.tags || j.label || '')}</div>
          <div class="t-foot"><span class="m">${esc(modelName(j.model) || t.model_name || '')}${t.duration ? ' · ' + fmt(t.duration) : ''}</span>
            <span class="t-actions">${t.audio_url ? `<a class="icon-btn" href="${esc(t.audio_url)}" download target="_blank" rel="noopener" aria-label="Download MP3" title="Download MP3">⤓</a>` : ''}<button class="icon-btn" data-more="${esc(t.id)}" aria-label="More actions" title="Extend, stems, video…">⋯</button></span></div></div>
      </article>`);
    }
    if (!parts.length) {
      host.innerHTML = libFilter === 'all' && !q
        ? `<div class="card empty"><div class="eq"><span></span><span></span><span></span><span></span><span></span><span></span></div><b>Your library is empty, for now.</b><br/>Everything you make lands here: play it, download it, extend it, split it into stems.<br/><button class="btn btn-primary" data-goto="create">✦ Make your first song</button></div>`
        : `<div class="card empty">Nothing matches.</div>`;
    } else host.innerHTML = parts.join('');
    $('#libCount').textContent = allTracks().length;
  }

  function renderAll() {
    renderRecent();
    if (!$('[data-panel="library"]').hidden) renderLibrary(); else $('#libCount').textContent = allTracks().length;
  }

  // ===================================================================
  // Track action sheet
  // ===================================================================
  const sheet = $('#sheet');
  let sheetTrack = null;
  function openSheet(title, html) {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = html;
    if (!sheet.open) sheet.showModal();
  }
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });
  sheet.addEventListener('close', () => (sheetTrack = null));
  function rerenderSheet(trackId) { if (sheet.open && sheetTrack === trackId && !$('#sheetBody form')) openTrackSheet(trackId); }

  function openTrackSheet(id) {
    const t = findTrack(id); if (!t) return;
    const job = findJob(t._task);
    sheetTrack = id;
    const ex = extrasFor(id);
    const cov = S.covers[job.taskId];
    const ready = !!t.audio_url && job.status === 'SUCCESS';
    const st = (slot) => !slot ? '' : slot.status === 'done' ? '<span class="st ok">✓ Ready</span>' : slot.status === 'error' ? '<span class="st err">Failed</span>' : '<span class="st">Working…</span>';
    const actions = [
      ['extend', '➕', 'Extend', 'Keep the song going from any point'],
      ['replace', '✂️', 'Replace section', 'Rewrite 10s+ of the song'],
      ['karaoke', '🎤', 'Sing along', 'Word-synced lyrics', ex.karaoke ? { status: 'done' } : null],
      ['stems', '🎛', 'Split stems', 'Vocals, drums, bass & more', ex.stems],
      ['wav', '🎚', 'Get WAV', 'Lossless, studio-ready', ex.wav],
      ['video', '🎬', 'Music video', 'Visualizer MP4', ex.video],
      ['coverart', '🖼', 'Cover art', 'AI artwork for this song', cov],
      ['cover', '🎭', 'Restyle', 'Cover it in a new style'],
      ['persona', '🧬', 'Persona', 'Reuse this voice & vibe'],
    ];
    openSheet(t.title || 'Track', `
      <div class="track-hero"><div class="a" style="${artFor(t, job) ? `background-image:url('${esc(artFor(t, job))}')` : ''}"></div>
        <div class="info"><b>${esc(t.title || 'Untitled')}</b><small>${esc(t.tags || '')}</small><small>${esc(modelName(job.model))}${t.duration ? ' · ' + fmt(t.duration) : ''} · ${ago(job.createdAt)}</small>
        <div class="ids">task ${esc(job.taskId)} · audio ${esc(t.id)}</div></div></div>
      <div class="submit-row" style="margin:0 0 16px">
        ${trackAudio(t) ? `<button class="btn btn-primary" data-sa="play">▶ Play</button>` : ''}
        ${t.audio_url ? `<a class="btn btn-ghost" href="${esc(t.audio_url)}" download target="_blank" rel="noopener">⤓ MP3</a>` : ''}
        ${t.prompt ? `<button class="btn btn-ghost" data-sa="copylyrics">Copy lyrics</button>` : ''}
        <button class="btn btn-ghost" data-sa="reuse">Reuse settings</button>
      </div>
      ${ready ? '' : '<p class="muted small">Some tools unlock when the track has finished generating.</p>'}
      <div class="act-grid">${actions.map(([k, ic, name, d, slot]) => `<button class="act" data-sa="${k}" ${ready ? '' : 'disabled style="opacity:.5"'}><span class="ic">${ic}</span><b>${name}</b><span>${d}</span>${st(slot)}</button>`).join('')}</div>
      <div class="extras">${extrasHtml(t, job, ex, cov)}</div>
      <div class="submit-row" style="margin-top:18px"><button class="btn btn-danger" data-sa="remove">Remove from library</button></div>`);
    $('#sheetBody').onclick = (e) => {
      const b = e.target.closest('[data-sa]'); if (!b || b.disabled) return;
      sheetAction(b.dataset.sa, t, job);
    };
  }

  function extrasHtml(t, job, ex, cov) {
    const out = [];
    if (ex.wav?.status === 'done' && ex.wav.url) out.push(`<div class="extra"><span>🎚 WAV file</span><span class="links"><a href="${esc(ex.wav.url)}" target="_blank" rel="noopener" download>Download WAV</a></span></div>`);
    if (ex.video?.status === 'done' && ex.video.url) out.push(`<div class="extra"><span>🎬 Music video</span><span class="links"><a href="${esc(ex.video.url)}" target="_blank" rel="noopener">Watch / download MP4</a></span></div>`);
    if (cov?.status === 'done' && cov.images?.length) out.push(`<div class="extra"><span>🖼 Cover art</span><div class="covers">${cov.images.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Cover art" /></a>`).join('')}</div></div>`);
    if (ex.stems?.status === 'done' && ex.stems.data) {
      const d = ex.stems.data;
      const named = [['Vocals', d.vocalUrl], ['Instrumental', d.instrumentalUrl], ['Backing vocals', d.backingVocalsUrl], ['Drums', d.drumsUrl], ['Bass', d.bassUrl], ['Guitar', d.guitarUrl], ['Keyboard', d.keyboardUrl], ['Percussion', d.percussionUrl], ['Strings', d.stringsUrl], ['Synth', d.synthUrl], ['FX', d.fxUrl], ['Brass', d.brassUrl], ['Woodwinds', d.woodwindsUrl]].filter(([, u]) => u);
      const origin = (d.originData || []).filter((o) => o.audio_url && !named.some(([, u]) => u === o.audio_url)).map((o) => [o.stem_type_group_name || 'Stem', o.audio_url]);
      const all = [...named, ...origin];
      out.push(`<div class="extra"><span>🎛 Stems ${ex.stems.type === 'split_stem' ? '(multi-track)' : ''}</span>
        ${ex.stems.type === 'split_stem' && ex.midi?.status !== 'done' ? `<button class="btn btn-soft" data-sa="midi">${ex.midi?.status === 'pending' ? 'MIDI: working…' : '🎹 Generate MIDI'}</button>` : ''}
        <div class="stems">${all.map(([n, u]) => `<div class="stem"><b>${esc(n)}</b><audio controls preload="none" src="${esc(u)}"></audio><a href="${esc(u)}" target="_blank" rel="noopener" download>⤓</a></div>`).join('') || '<span class="muted small">No stems returned.</span>'}</div></div>`);
    }
    if (ex.midi?.status === 'done' && ex.midi.instruments) out.push(`<div class="extra"><span>🎹 MIDI · ${ex.midi.instruments.map((i) => `${esc(i.name)} (${i.notes?.length || 0})`).join(', ')}</span><span class="links"><button class="btn btn-soft" data-sa="midifile">⤓ .mid file</button><button class="btn btn-ghost" data-sa="midijson">JSON</button></span></div>`);
    for (const [k, slot] of [['WAV', ex.wav], ['Video', ex.video], ['Stems', ex.stems], ['MIDI', ex.midi], ['Cover art', cov]]) if (slot?.status === 'error') out.push(`<div class="extra"><span>⚠️ ${k} failed: ${esc(slot.error || '')}</span></div>`);
    return out.join('');
  }

  function backBtn(t) { return `<button type="button" class="link-btn back-link" data-back>← Back to ${esc(t.title || 'track')}</button>`; }
  function sheetForm(t, title, inner, submitLabel, onSubmit) {
    openSheet(title, `${backBtn(t)}<form class="sheet-form" novalidate>${inner}<div class="submit-row"><button class="btn btn-primary" type="submit"><span>${submitLabel}</span></button></div></form>`);
    $('#sheetBody [data-back]').onclick = () => openTrackSheet(t.id);
    const form = $('#sheetBody form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      setBusy(btn, true);
      try { await onSubmit(form); } catch (err) { handleErr('That did not work', err); } finally { if (btn.isConnected) setBusy(btn, false); }
    });
    $('#sheetBody').onclick = null;
  }

  async function sheetAction(a, t, job) {
    const ex = extrasFor(t.id);
    switch (a) {
      case 'play': playTrack(t.id); break;
      case 'copylyrics': try { await navigator.clipboard.writeText(t.prompt); toast('Lyrics copied', '', 'ok'); } catch { toast('Copy failed'); } break;
      case 'reuse': {
        sheet.close(); goto('create'); $('#modeSeg [data-mode="custom"]').click();
        $('#cTitle').value = t.title || ''; $('#cStyle').value = t.tags || ''; $('#cStyle').dispatchEvent(new Event('input'));
        if (t.prompt) { $('#cInstrumental').checked = false; $('#cLyrics').value = t.prompt; } else $('#cInstrumental').checked = true;
        $('#cInstrumental').dispatchEvent(new Event('change')); $('#cLyrics').dispatchEvent(new Event('input'));
        toast('Settings loaded', 'Tweak anything and generate again.', 'ok');
        break;
      }
      case 'remove': {
        if (!confirm(`Remove “${t.title}” from your library? (This only affects this browser.)`)) return;
        job.tracks = job.tracks.filter((x) => x.id !== t.id);
        if (!job.tracks.length) S.jobs = S.jobs.filter((j) => j !== job);
        delete S.extras[t.id]; save.jobs(); save.extras(); sheet.close(); renderAll();
        break;
      }
      case 'cover': sheet.close(); remixFromTrack(t, 'cover'); break;
      case 'extend': {
        const max = Math.max(1, Math.floor(t.duration || 120));
        sheetForm(t, 'Extend this song', `
          <p class="muted small">Continue the song from any point. The new part picks up the same style unless you change it.</p>
          <div class="field"><div class="label-row"><label for="xAt">Continue from</label><span class="val" id="xAtVal">${fmt(max)}</span></div><input type="range" id="xAt" min="1" max="${max}" step="1" value="${Math.max(1, max - 1)}" /></div>
          <div class="grid-2"><div class="field"><label for="xTitle">Title</label><input id="xTitle" maxlength="100" value="${esc(t.title || '')}" /></div>
          <div class="field"><label for="xModel">Model</label><select id="xModel"></select></div></div>
          <div class="field"><label for="xStyle">Style <span class="opt">optional</span></label><input id="xStyle" maxlength="1000" value="${esc(t.tags || '')}" /></div>
          <label class="switch"><input type="checkbox" id="xInst" /><span></span> Instrumental</label>
          <div class="field" id="xLyrBox"><label for="xLyrics">Lyrics for the new part <span class="opt">optional</span></label><textarea id="xLyrics" rows="6" maxlength="5000" placeholder="[Verse 3]&#10;…"></textarea></div>`,
          '➕ Extend', async () => {
            const model = $('#xModel').value; const inst = $('#xInst').checked;
            const body = clean({ audioId: t.id, taskId: job.taskId, model, continueAt: +$('#xAt').value, title: $('#xTitle').value.trim(), style: $('#xStyle').value.trim(), instrumental: inst, callBackUrl: callbackUrl() });
            const ly = $('#xLyrics').value.trim();
            if (ly && !inst) { if (model.startsWith('V6')) body.lyrics = ly; else body.prompt = ly; }
            const d = await api('/api/v1/generate/extend', { method: 'POST', body });
            addJob({ taskId: d.taskId, kind: 'extend', label: `${body.title || t.title} (extended)`, model, parent: t.id });
            sheet.close(); toast('Extension started ➕', 'Watch it in your library.', 'ok'); refreshCredits();
          });
        modelOptions($('#xModel'));
        $('#xAt').addEventListener('input', (e) => ($('#xAtVal').textContent = fmt(e.target.value))); $('#xAtVal').textContent = fmt($('#xAt').value);
        $('#xInst').addEventListener('change', (e) => ($('#xLyrBox').hidden = e.target.checked));
        break;
      }
      case 'replace': {
        const dur = t.duration || 120;
        const maxLen = Math.max(10, dur / 2);
        const start = Math.max(0, Math.min(dur - 10, dur * 0.3)).toFixed(1);
        sheetForm(t, 'Replace a section', `
          <p class="muted small">Pick 10 seconds up to half the song (${fmt(maxLen)}). The new part blends into what is around it.</p>
          <div class="grid-2"><div class="field"><label for="rpS">Start (s)</label><input id="rpS" type="number" min="0" max="${dur}" step="0.5" value="${start}" /></div>
          <div class="field"><label for="rpE">End (s)</label><input id="rpE" type="number" min="0" max="${dur}" step="0.5" value="${Math.min(dur, +start + 15).toFixed(1)}" /></div></div>
          <div class="field"><label for="rpPrompt">Lyrics for the replaced part</label><textarea id="rpPrompt" rows="4" maxlength="5000" placeholder="New words for just this section"></textarea></div>
          <div class="field"><label for="rpFull">Full song lyrics after the change</label><textarea id="rpFull" rows="8" maxlength="5000">${esc(t.prompt || '')}</textarea></div>
          <div class="grid-2"><div class="field"><label for="rpTags">Style</label><input id="rpTags" value="${esc(t.tags || '')}" /></div>
          <div class="field"><label for="rpTitle">Title</label><input id="rpTitle" maxlength="80" value="${esc(t.title || '')}" /></div></div>`,
          '✂️ Replace section', async () => {
            const s = +$('#rpS').value, e2 = +$('#rpE').value;
            if (!(e2 > s)) throw new ApiError('End must be after start.');
            if (e2 - s < 10) throw new ApiError('The section must be at least 10 seconds long.');
            if (t.duration && e2 - s > t.duration / 2) throw new ApiError(`The section can be at most half the song (${fmt(t.duration / 2)}).`);
            const prompt = $('#rpPrompt').value.trim(), full = $('#rpFull').value.trim(), tags = $('#rpTags').value.trim(), title = $('#rpTitle').value.trim();
            if (!prompt || !full || !tags || !title) throw new ApiError('Lyrics for the section, full lyrics, style and title are all required.');
            const d = await api('/api/v1/generate/replace-section', { method: 'POST', body: { taskId: job.taskId, audioId: t.id, prompt, fullLyrics: full, tags, title, infillStartS: +s.toFixed(2), infillEndS: +e2.toFixed(2), callBackUrl: callbackUrl() } });
            addJob({ taskId: d.taskId, kind: 'replace', label: `${title} (edited)`, model: job.model, parent: t.id });
            sheet.close(); toast('Section edit started ✂️', '', 'ok'); refreshCredits();
          });
        break;
      }
      case 'stems': {
        sheetForm(t, 'Split into stems', `
          <div class="field"><span class="label">Separation</span>
            <div class="op-grid" style="grid-template-columns:repeat(3,1fr)" id="stType">
              <button type="button" class="op" data-v="separate_vocal" aria-pressed="true"><b>Vocals + backing</b><span>2 tracks: a cappella and instrumental</span></button>
              <button type="button" class="op" data-v="split_stem" aria-pressed="false"><b>Full split</b><span>Up to 12 instrument stems, unlocks MIDI</span></button>
              <button type="button" class="op" data-v="split_stem_advanced" aria-pressed="false"><b>Single instrument</b><span>Extract one specific part</span></button>
            </div></div>
          <div class="field" id="stNameBox" hidden><label for="stName">Instrument</label><select id="stName">${STEMS.map((s) => `<option>${s}</option>`).join('')}</select></div>
          <p class="muted small">Separation uses credits. Full split costs more than vocals + backing.</p>`,
          '🎛 Separate', async () => {
            const type = segValue($('#stType')) || $('#stType [aria-pressed="true"]').dataset.v;
            const body = { taskId: job.taskId, audioId: t.id, type, callBackUrl: callbackUrl() };
            if (type === 'split_stem_advanced') body.stemName = $('#stName').value;
            const d = await api('/api/v1/vocal-removal/generate', { method: 'POST', body });
            ex.stems = { status: 'pending', taskId: d.taskId, type }; delete ex.midi; save.extras();
            trackTask({ type: 'stems', taskId: d.taskId, ref: { trackId: t.id } });
            toast('Separating stems 🎛', 'Usually takes about a minute.', 'ok'); openTrackSheet(t.id); refreshCredits();
          });
        bindSeg($('#stType'), (b) => ($('#stNameBox').hidden = b.dataset.v !== 'split_stem_advanced'));
        break;
      }
      case 'midi': {
        if (!ex.stems?.taskId) return;
        try {
          const d = await api('/api/v1/midi/generate', { method: 'POST', body: { taskId: ex.stems.taskId, callBackUrl: callbackUrl() } });
          ex.midi = { status: 'pending', taskId: d.taskId }; save.extras();
          trackTask({ type: 'midi', taskId: d.taskId, ref: { trackId: t.id } });
          toast('Transcribing to MIDI 🎹', 'Takes 30 to 90 seconds.', 'ok'); openTrackSheet(t.id);
        } catch (e) { handleErr('Could not start MIDI', e); }
        break;
      }
      case 'midifile': downloadBlob(midiFile(ex.midi.instruments), `${slug(t.title)}.mid`, 'audio/midi'); break;
      case 'midijson': downloadBlob(JSON.stringify(ex.midi.instruments, null, 2), `${slug(t.title)}-midi.json`, 'application/json'); break;
      case 'wav': case 'video': {
        if (ex[a]?.status === 'done') { window.open(ex[a].url, '_blank', 'noopener'); return; }
        if (ex[a]?.status === 'pending') return toast('Already working on it');
        if (a === 'video') {
          sheetForm(t, 'Create a music video', `
            <p class="muted small">Generates an MP4 visualizer with the cover art and title.</p>
            <div class="field"><label for="vAuthor">Artist name <span class="opt">optional</span></label><input id="vAuthor" maxlength="50" placeholder="Your artist name" /></div>
            <div class="field"><label for="vDomain">Watermark <span class="opt">optional</span></label><input id="vDomain" maxlength="50" placeholder="yourwebsite.com" /></div>`,
            '🎬 Make video', async () => {
              const d = await api('/api/v1/mp4/generate', { method: 'POST', body: clean({ taskId: job.taskId, audioId: t.id, author: $('#vAuthor').value.trim(), domainName: $('#vDomain').value.trim(), callBackUrl: callbackUrl() }) });
              ex.video = { status: 'pending', taskId: d.taskId }; save.extras();
              trackTask({ type: 'video', taskId: d.taskId, ref: { trackId: t.id } });
              toast('Rendering video 🎬', '', 'ok'); openTrackSheet(t.id); refreshCredits();
            });
          return;
        }
        try {
          const d = await api('/api/v1/wav/generate', { method: 'POST', body: { taskId: job.taskId, audioId: t.id, callBackUrl: callbackUrl() } });
          ex.wav = { status: 'pending', taskId: d.taskId }; save.extras();
          trackTask({ type: 'wav', taskId: d.taskId, ref: { trackId: t.id } });
          toast('Converting to WAV 🎚', '', 'ok'); openTrackSheet(t.id);
        } catch (e) { handleErr('Could not convert to WAV', e); }
        break;
      }
      case 'coverart': {
        const cov = S.covers[job.taskId];
        if (cov?.status === 'pending') return toast('Already painting');
        if (cov?.status === 'done') return toast('Cover art already made', 'Each song gets one set, shown below.');
        try {
          const d = await api('/api/v1/suno/cover/generate', { method: 'POST', body: { taskId: job.taskId, callBackUrl: callbackUrl() } });
          S.covers[job.taskId] = { status: 'pending', taskId: d.taskId }; save.covers();
          trackTask({ type: 'coverart', taskId: d.taskId, ref: { jobId: job.taskId, trackId: t.id } });
          toast('Painting cover art 🖼', '', 'ok'); openTrackSheet(t.id);
        } catch (e) {
          if (e.code === 409 || e.code === 400) toast('Cover art already exists', 'This song already has cover art.');
          else handleErr('Could not start cover art', e);
        }
        break;
      }
      case 'karaoke': openKaraoke(t, job); break;
      case 'persona': {
        const dur = t.duration || 60;
        sheetForm(t, 'Create a persona', `
          <p class="muted small">A persona captures this track's voice and style so you can reuse it in new songs (Create → Advanced → Persona).</p>
          <div class="field"><label for="pName">Name</label><input id="pName" maxlength="80" placeholder="Velvet night singer" value="${esc(t.title ? t.title + ' voice' : '')}" /></div>
          <div class="field"><label for="pDesc">Description</label><textarea id="pDesc" rows="3" placeholder="Warm, breathy female vocal over dreamy synth-pop">${esc(t.tags || '')}</textarea></div>
          <div class="grid-2"><div class="field"><label for="pS">Analyse from (s)</label><input id="pS" type="number" min="0" step="1" value="0" /></div><div class="field"><label for="pE">to (s)</label><input id="pE" type="number" min="1" step="1" value="${Math.min(30, Math.floor(dur))}" /></div></div>
          <div class="field"><label for="pStyle">Style label <span class="opt">optional</span></label><input id="pStyle" value="${esc((t.tags || '').split(',')[0] || '')}" /></div>`,
          '🧬 Create persona', async () => {
            const name = $('#pName').value.trim(), description = $('#pDesc').value.trim();
            if (!name || !description) throw new ApiError('Name and description are required.');
            const vs = +$('#pS').value, ve = +$('#pE').value;
            if (!(ve > vs)) throw new ApiError('End must be after start.');
            const d = await api('/api/v1/generate/generate-persona', { method: 'POST', body: clean({ taskId: job.taskId, audioId: t.id, name, description, vocalStart: vs, vocalEnd: ve, style: $('#pStyle').value.trim() }) });
            S.personas.unshift({ personaId: d.personaId, name: d.name || name, from: t.title }); save.personas(); refreshPersonaSelects();
            toast(`Persona “${d.name || name}” created 🧬`, 'Find it under Create → Advanced controls.', 'ok', { label: 'Use it now', fn: () => { goto('create'); $('#modeSeg [data-mode="custom"]').click(); $('#advanced').open = true; $('#cPersona').value = d.personaId; } });
            openTrackSheet(t.id);
          });
        break;
      }
    }
  }

  // ===================================================================
  // Karaoke
  // ===================================================================
  let kWords = null, kIdx = -1, kTrackId = null;
  async function openKaraoke(t, job) {
    const ex = extrasFor(t.id);
    if (!ex.karaoke) {
      toast('Syncing lyrics…');
      try {
        const d = await api('/api/v1/generate/get-timestamped-lyrics', { method: 'POST', body: { taskId: job.taskId, audioId: t.id } });
        const words = (d?.alignedWords || []).filter((w) => w.word != null);
        if (!words.length) return toast('No synced lyrics for this track', 'Instrumentals have no words to sync.');
        ex.karaoke = words.map((w) => ({ w: w.word, s: w.startS, e: w.endS })); save.extras();
      } catch (e) { return handleErr('Could not sync lyrics', e); }
    }
    if (sheet.open) sheet.close();
    if (S.playing !== t.id) playTrack(t.id);
    showKaraoke(t, ex.karaoke);
  }
  function showKaraoke(t, words) {
    kWords = words; kIdx = -1; kTrackId = t.id;
    $('#kTitle').textContent = t.title || 'Sing along';
    let html = '<div class="k-line">'; let i = 0;
    for (const w of words) {
      const pieces = String(w.w).split('\n');
      pieces.forEach((p, pi) => {
        if (pi > 0) html += '</div><div class="k-line">';
        const sec = p.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
        if (sec) { html += `</div><div class="k-sec">${esc(sec[1])}</div><div class="k-line">`; p = sec[2]; }
        if (p.trim()) html += `<span data-i="${i}">${esc(p)} </span>`;
      });
      i++;
    }
    html += '</div>';
    $('#kBody').innerHTML = html.replace(/<div class="k-line"><\/div>/g, '');
    $('#kBody').onclick = (e) => { const s = e.target.closest('[data-i]'); if (s) { audio.currentTime = kWords[+s.dataset.i].s; if (audio.paused) audio.play(); } };
    $('#karaoke').hidden = false; $('#plKaraoke').classList.add('on');
  }
  function closeKaraoke() { $('#karaoke').hidden = true; $('#plKaraoke').classList.remove('on'); }
  function updateKaraoke() {
    if ($('#karaoke').hidden || !kWords || S.playing !== kTrackId) return;
    const tm = audio.currentTime;
    let lo = 0, hi = kWords.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (kWords[m].s <= tm) { idx = m; lo = m + 1; } else hi = m - 1; }
    if (idx === kIdx) return; kIdx = idx;
    $$('#kBody [data-i]').forEach((s) => { const i = +s.dataset.i; s.classList.toggle('sung', i < idx); s.classList.toggle('now', i === idx); });
    $$('#kBody .k-line.active').forEach((l) => l.classList.remove('active'));
    const cur = $(`#kBody [data-i="${idx}"]`);
    if (cur) { const line = cur.closest('.k-line'); line.classList.add('active'); const body = $('#kBody'); body.scrollTop = line.offsetTop - body.clientHeight * 0.38; }
  }

  // ===================================================================
  // Player
  // ===================================================================
  const audio = $('#audio');
  function playTrack(id) {
    const t = findTrack(id); if (!t) return;
    const url = trackAudio(t);
    if (!url) return toast('Not playable yet', 'Hang tight while it generates.');
    if (S.playing === id) { audio.paused ? audio.play() : audio.pause(); return; }
    S.playing = id;
    S.queue = allTracks().filter((x) => trackAudio(x)).map((x) => x.id);
    audio.src = url; audio.play().catch(() => toast('Playback was blocked', 'Tap play again.'));
    const job = findJob(t._task);
    $('#player').hidden = false;
    $('#plTitle').textContent = t.title || 'Untitled';
    $('#plSub').textContent = t.tags || job?.label || '';
    const art = artFor(t, job); $('#plArt').style.backgroundImage = art ? `url('${art.replace(/'/g, '%27')}')` : '';
    if (!$('#karaoke').hidden && kTrackId !== id) { const ex = extrasFor(id); if (ex.karaoke) showKaraoke(t, ex.karaoke); else closeKaraoke(); }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title || 'Untitled', artist: 'Melodrop', album: t.tags || '', artwork: art ? [{ src: art, sizes: '512x512' }] : [] });
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    }
    renderAll();
  }
  function pauseAudio() { try { audio.pause(); } catch { } }
  function step(dir) {
    const i = S.queue.indexOf(S.playing); if (i < 0 || !S.queue.length) return;
    const next = S.queue[(i + dir + S.queue.length) % S.queue.length];
    if (next && next !== S.playing) playTrack(next);
  }
  function initPlayer() {
    $('#plPlay').onclick = () => { if (!audio.src) return; audio.paused ? audio.play() : audio.pause(); };
    $('#plPrev').onclick = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1));
    $('#plNext').onclick = () => step(1);
    $('#plClose').onclick = () => { audio.pause(); $('#player').hidden = true; closeKaraoke(); S.playing = null; renderAll(); };
    $('#plMore').onclick = () => S.playing && openTrackSheet(S.playing);
    $('#plKaraoke').onclick = () => { if (!$('#karaoke').hidden) return closeKaraoke(); const t = findTrack(S.playing); if (t) openKaraoke(t, findJob(t._task)); };
    $('#kClose').onclick = closeKaraoke;
    const seek = $('#plSeek'); let dragging = false;
    seek.addEventListener('input', () => { dragging = true; $('#plCur').textContent = fmt((seek.value / 100) * (audio.duration || 0)); });
    seek.addEventListener('change', () => { if (audio.duration && isFinite(audio.duration)) audio.currentTime = (seek.value / 100) * audio.duration; dragging = false; });
    audio.addEventListener('timeupdate', () => {
      if (!dragging && audio.duration && isFinite(audio.duration)) seek.value = (audio.currentTime / audio.duration) * 100;
      $('#plCur').textContent = fmt(audio.currentTime);
      updateKaraoke();
    });
    audio.addEventListener('loadedmetadata', () => ($('#plDur').textContent = isFinite(audio.duration) ? fmt(audio.duration) : 'live'));
    const sync = () => { $('#plPlay').textContent = audio.paused ? '▶' : '❚❚'; $$('[data-play]').forEach((b) => (b.textContent = b.dataset.play === S.playing && !audio.paused ? '❚❚' : '▶')); $$('.track').forEach((el) => el.classList.toggle('playing', el.dataset.track === S.playing)); };
    audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
    audio.addEventListener('ended', () => step(1));
    audio.addEventListener('error', () => { if (audio.src) toast('Could not play this audio', 'The link may have expired (files are kept ~14 days).', 'err'); });
  }

  // ===================================================================
  // MIDI writer (Standard MIDI File, format 1)
  // ===================================================================
  function midiFile(instruments) {
    const TPQ = 480, TICKS_PER_SEC = 960; // 120 BPM
    const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
    const str = (s) => [...new TextEncoder().encode(s)];
    const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const chunk = (type, data) => [...str(type), ...u32(data.length), ...data];
    const tracks = [chunk('MTrk', [0, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, 0, 0xff, 0x2f, 0])];
    const MELODIC_CH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
    let ch = 0;
    for (const inst of instruments) {
      const drum = /drum|kick|snare|hat|perc|cymbal/i.test(inst.name || '');
      const channel = drum ? 9 : MELODIC_CH[ch++ % MELODIC_CH.length];
      const evs = [];
      for (const n of inst.notes || []) {
        const p = Math.max(0, Math.min(127, Math.round(n.pitch)));
        const v = Math.max(1, Math.min(127, Math.round((n.velocity <= 1 ? n.velocity * 127 : n.velocity) || 90)));
        const s = Math.round(n.start * TICKS_PER_SEC), e = Math.max(s + 1, Math.round(n.end * TICKS_PER_SEC));
        evs.push([s, 1, [0x90 | channel, p, v]], [e, 0, [0x80 | channel, p, 0]]);
      }
      evs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const data = [0, 0xff, 0x03, ...vlq(str(inst.name || 'Track').length), ...str(inst.name || 'Track')];
      let last = 0;
      for (const [tk, , msg] of evs) { data.push(...vlq(tk - last), ...msg); last = tk; }
      data.push(0, 0xff, 0x2f, 0);
      tracks.push(chunk('MTrk', data));
    }
    const header = chunk('MThd', [0, 1, 0, tracks.length, (TPQ >> 8) & 255, TPQ & 255]);
    return new Uint8Array([...header, ...tracks.flat()]);
  }
  const slug = (s) => (s || 'track').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'track';
  function downloadBlob(data, name, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ===================================================================
  // Library interactions
  // ===================================================================
  function initLibrary() {
    $('#libSearch').addEventListener('input', renderLibrary);
    bindSeg($('#libFilter'), (b) => { libFilter = b.dataset.f; renderLibrary(); });
    $('#lookupBtn').onclick = () => {
      openSheet('Load a task by ID', `<form class="sheet-form" novalidate><p class="muted small">Have a task ID from the Suno API dashboard or another app? Paste it to pull those tracks into your library.</p>
        <div class="field"><label for="lkId">Task ID</label><input id="lkId" spellcheck="false" placeholder="5c79…be8e" /></div>
        <div class="submit-row"><button class="btn btn-primary" type="submit"><span>Load</span></button></div></form>`);
      $('#sheetBody').onclick = null;
      $('#sheetBody form').onsubmit = async (e) => {
        e.preventDefault(); const id = $('#lkId').value.trim(); if (!id) return;
        if (findJob(id)) { sheet.close(); return toast('Already in your library'); }
        const btn = e.target.querySelector('button'); setBusy(btn, true);
        try {
          const d = await api('/api/v1/generate/record-info', { query: { taskId: id } });
          const job = { taskId: id, kind: 'lookup', label: 'Imported task', model: '', status: 'PENDING', tracks: [], createdAt: Date.now() };
          applyMusicRecord(job, d);
          let model = ''; try { model = JSON.parse(d.param || '{}').model || ''; } catch { }
          job.model = model; job.label = job.tracks[0]?.title || 'Imported task';
          S.jobs.unshift(job); save.jobs();
          if (!isDone(job)) trackTask({ type: 'music', taskId: id });
          sheet.close(); renderAll(); toast('Task loaded', `${job.tracks.length} track(s) found.`, 'ok');
        } catch (err) { handleErr('Could not load that task', err); }
        finally { if (btn.isConnected) setBusy(btn, false); }
      };
    };
  }

  // global delegated clicks
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]'); if (g) { goto(g.dataset.goto); return; }
    const p = e.target.closest('[data-play]'); if (p) { playTrack(p.dataset.play); return; }
    const m = e.target.closest('[data-more]'); if (m) { openTrackSheet(m.dataset.more); return; }
    const f = e.target.closest('[data-fav]'); if (f) { const id = f.dataset.fav; S.favs[id] ? delete S.favs[id] : (S.favs[id] = 1); save.favs(); renderLibrary(); return; }
    const d = e.target.closest('[data-dismiss]'); if (d) { S.jobs = S.jobs.filter((j) => j.taskId !== d.dataset.dismiss); S.tasks = S.tasks.filter((t) => t.taskId !== d.dataset.dismiss); save.jobs(); save.tasks(); renderAll(); return; }
    const r = e.target.closest('[data-recheck]'); if (r) { const j = findJob(r.dataset.recheck); if (j) { j.timedOut = false; save.jobs(); } trackTask({ type: 'music', taskId: r.dataset.recheck }); renderAll(); return; }
    const card = e.target.closest('.track'); if (card && !e.target.closest('a,button')) openTrackSheet(card.dataset.track);
  });

  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const panel = $$('[data-panel]').find((p) => !p.hidden);
      const form = panel && panel.querySelector('form');
      if (form && !sheet.open) { e.preventDefault(); form.requestSubmit(); }
    } else if (e.key === ' ' && !typing && !sheet.open && audio.src) { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
    else if (e.key === 'Escape' && !$('#karaoke').hidden) closeKaraoke();
  });

  // ===================================================================
  // Boot
  // ===================================================================
  function bootApp() {
    $$('.tabs [data-tab]').forEach((b) => (b.onclick = () => goto(b.dataset.tab)));
    $('#credits').onclick = refreshCredits;
    $('#lockBtn').onclick = () => {
      openSheet('API key', `<p>Your key is saved ${store.get('key', '') ? 'on this device' : 'for this session only'}.</p>
        <div class="submit-row"><button class="btn btn-ghost" data-k="switch">Use a different key</button><button class="btn btn-danger" data-k="forget">Forget key &amp; lock</button></div>
        <p class="muted small">Your library stays in this browser either way.</p>`);
      $('#sheetBody').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; sheet.close(); lockOut(b.dataset.k === 'forget' ? 'Key forgotten. Paste a key to unlock again.' : ''); };
    };
    initCreate(); initRemix(); initSounds(); initLyrics(); initLibrary(); initPlayer();
    counters(); refreshPersonaSelects();
    goto(store.get('tab', 'create'));
    renderAll();
    // Resume polling for anything left unfinished (e.g. after a reload)
    for (const j of S.jobs) if (!isDone(j) && !S.tasks.some((t) => t.taskId === j.taskId)) S.tasks.push({ type: 'music', taskId: j.taskId, startedAt: Date.now() });
    S.tasks.forEach((t) => (t.startedAt = Math.max(t.startedAt, Date.now() - TASK_TIMEOUT_MS / 2)));
    if (S.tasks.length) kickPoll(500);
    setInterval(() => { if (!document.hidden) renderRecent(); }, 30000);
  }

  initTheme();
  initGate();
})();
