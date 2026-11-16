(() => {
  "use strict";

  /* ---------- Settings you may want to edit ---------- */
  const CONFIG = {
    channelId: "UCUtd2SHjXu9aiCNgktUU9Gg",
    channelUrl: "https://www.youtube.com/@malik.cinematics",
    maxVideos: 9,
    maxShorts: 10,
    // Optional: paste the Google Drive FILE id of the vertical sample here.
    // Drive file link looks like https://drive.google.com/file/d/FILE_ID/view
    // The file must be shared as "Anyone with the link: Viewer".
    verticalDriveFileId: ""
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    kids.forEach((kid) => kid && node.append(kid));
    return node;
  }

  const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const validId = (id) => typeof id === "string" && /^[\w-]{11}$/.test(id);

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Player (opens on the same page) ---------- */
  const dialog = $("#player");
  const frame = $("#player-frame");

  function openPlayer(video) {
    if (!dialog || !validId(video.id)) return;
    frame.replaceChildren(
      h("iframe", {
        src: `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`,
        title: video.title || "Video",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
        allowfullscreen: "",
        referrerpolicy: "strict-origin-when-cross-origin"
      })
    );
    dialog.classList.toggle("is-short", Boolean(video.short));
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function closePlayer() {
    if (!dialog) return;
    frame.replaceChildren();
    if (dialog.open) dialog.close();
  }

  if (dialog) {
    $("#player-close").addEventListener("click", closePlayer);
    dialog.addEventListener("click", (e) => { if (e.target === dialog) closePlayer(); });
    dialog.addEventListener("close", () => frame.replaceChildren());
  }

  /* ---------- Work section ---------- */
  function thumbBlock(video) {
    return h("span", { class: "thumb" },
      h("img", { src: thumbUrl(video.id), alt: "", loading: "lazy", width: "480", height: "360" }),
      h("span", { class: "play", "aria-hidden": "true" })
    );
  }

  function caption(video) {
    return h("span", { class: "cap" },
      h("span", { class: "cap-title", text: video.title }),
      h("span", { class: "cap-date", text: formatDate(video.published) })
    );
  }

  function videoButton(video, cls) {
    const btn = h("button", { class: cls, type: "button", "aria-label": `Play ${video.title}` },
      thumbBlock(video), caption(video));
    btn.addEventListener("click", () => openPlayer(video));
    return btn;
  }

  function renderWork(videos) {
    const featureBox = $("#work-feature");
    const grid = $("#work-grid");
    const longs = videos.filter((v) => !v.short).slice(0, CONFIG.maxVideos);

    if (!longs.length) return false;

    featureBox.replaceChildren(videoButton(longs[0], "feature"));
    grid.replaceChildren(...longs.slice(1).map((v) => videoButton(v, "item")));
    return true;
  }

  function renderShorts(videos) {
    const shorts = videos.filter((v) => v.short).slice(0, CONFIG.maxShorts);
    const box = $("#shorts");
    if (!shorts.length) { box.hidden = true; return; }
    $("#shorts-rail").replaceChildren(...shorts.map((v) => {
      const btn = h("button", { class: "item", type: "button", "aria-label": `Play ${v.title}` }, thumbBlock(v));
      btn.addEventListener("click", () => openPlayer(v));
      return btn;
    }));
    box.hidden = false;
  }

  // Shown when videos.json is empty or cannot be loaded: YouTube's own uploads playlist.
  function renderFallback() {
    const uploads = "UU" + CONFIG.channelId.slice(2);
    $("#work-feature").replaceChildren(
      h("div", { class: "empty" },
        h("div", { class: "embed" },
          h("iframe", {
            src: `https://www.youtube.com/embed/videoseries?list=${uploads}`,
            title: "Latest uploads from Malik Cinematics",
            allow: "encrypted-media; picture-in-picture; fullscreen",
            allowfullscreen: "",
            loading: "lazy",
            referrerpolicy: "strict-origin-when-cross-origin"
          })
        )
      )
    );
    $("#work-grid").replaceChildren();
    $("#shorts").hidden = true;
  }

  async function loadVideos() {
    try {
      const res = await fetch("videos.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("videos.json not found");
      const data = await res.json();
      const list = (Array.isArray(data) ? data : data.videos || []).filter((v) => validId(v.id) && v.title);
      if (!renderWork(list)) { renderFallback(); return; }
      renderShorts(list);
    } catch (err) {
      renderFallback();
    }
  }

  /* ---------- Vertical sample ---------- */
  function initVertical() {
    const id = CONFIG.verticalDriveFileId.trim();
    if (!/^[\w-]{10,}$/.test(id)) return;
    $("#phone").replaceChildren(
      h("iframe", {
        src: `https://drive.google.com/file/d/${id}/preview`,
        title: "Vertical talking head sample",
        allow: "autoplay; fullscreen",
        allowfullscreen: "",
        loading: "lazy"
      })
    );
  }

  /* ---------- Timeline bar (scroll progress and navigation) ---------- */
  function initTimeline() {
    const track = $("#tl-track");
    const playhead = $("#tl-playhead");
    const timeEl = $("#tl-time");
    const markers = $$(".tl-marker");
    const FPS = 24;
    const TOTAL_FRAMES = FPS * 120;
    const pad = (n) => String(n).padStart(2, "0");

    function timecode(frames) {
      const ff = frames % FPS;
      const totalSec = Math.floor(frames / FPS);
      return `${pad(Math.floor(totalSec / 3600))}:${pad(Math.floor(totalSec / 60) % 60)}:${pad(totalSec % 60)}:${pad(ff)}`;
    }

    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    function place() {
      const max = maxScroll();
      markers.forEach((m) => {
        const target = document.getElementById(m.dataset.target);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY;
        const p = Math.min(0.96, Math.max(0.02, top / max));
        m.style.left = `${p * 100}%`;
        m.dataset.pos = String(p);
        m.classList.toggle("flip", p > 0.86);
      });
    }

    function update() {
      const p = Math.min(1, Math.max(0, window.scrollY / maxScroll()));
      playhead.style.left = `${p * 100}%`;
      timeEl.textContent = timecode(Math.round(p * TOTAL_FRAMES));
      let active = null;
      markers.forEach((m) => {
        m.classList.remove("is-active");
        if (parseFloat(m.dataset.pos) <= p + 0.005) active = m;
      });
      if (active) active.classList.add("is-active");
    }

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });

    const refresh = () => { place(); update(); };
    window.addEventListener("resize", refresh);
    window.addEventListener("load", refresh);

    // Click anywhere on the bar to jump there, like scrubbing a timeline.
    track.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      window.scrollTo({ top: ratio * maxScroll() });
    });

    refresh();
    return refresh;
  }

  /* ---------- Start ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initVertical();
  const refreshTimeline = initTimeline();
  loadVideos().then(refreshTimeline);
  window.addEventListener("load", refreshTimeline);
})();
