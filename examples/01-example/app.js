/* ==========================================================================
   AI Coding Agent · DeckForge runtime
   Presenter + audience + overview + notes + builds + transitions
   Vanilla JS, no dependencies.
   ========================================================================== */
"use strict";

(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const TRANSITION_MS = 380;

  const $ = (id) => document.getElementById(id);

  /* ---------- helpers ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ---------- state ---------- */

  const state = {
    deck: null,
    slideIndex: 0,
    buildIndex: 0,
    overviewOpen: false,
    blackout: "none",
    notesVisible: false,
    fullscreen: false,
    defaultAnimOrder: 0,
    timerStartedAt: null,
    timerInterval: null,
    reflow: false,
    motion: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animatedBlocks: new Map(), // slideId -> Set(blockId) already animated
    currentEl: null,
  };

  /* ---------- deck loading ---------- */

  async function loadDeck() {
    const embedded = $("deck-json").textContent;
    try {
      const res = await fetch("deck.json", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (_) { /* file:// fallback below */ }
    return JSON.parse(embedded);
  }

  /* ---------- build-step model ---------- */

  function revealCount(block) {
    const c = block.content;
    if (c && (c.reveal === "steps" || c.reveal === "rows")) {
      if (Array.isArray(c.steps)) return c.steps.length;
      if (Array.isArray(c.rows)) return c.rows.length;
      if (c.items && Array.isArray(c.items)) return c.items.length;
    }
    return 1;
  }

  function computeBuildModel(slide) {
    const events = [];
    slide.blocks.forEach((block, idx) => {
      if (!block.animation) return;
      events.push({
        order: block.animation.order ?? 0,
        idx,
        trig: block.animation.trigger,
        block,
      });
    });
    events.sort((a, b) => a.order - b.order || a.idx - b.idx);

    const byBlock = new Map();
    const steps = [];
    let cursor = 0;

    for (const ev of events) {
      if (ev.trig !== "on-click") continue;
      const n = revealCount(ev.block);
      byBlock.set(ev.block.id, { entrance: false, start: cursor, count: n });
      steps.push({ blockId: ev.block.id, count: n });
      cursor += n;
    }

    for (const ev of events) {
      if (ev.trig === "on-click") continue;
      let gateAt = 0;
      const idx = events.indexOf(ev);
      for (let i = idx - 1; i >= 0; i--) {
        if (events[i].trig === "on-click") {
          const m = byBlock.get(events[i].block.id);
          gateAt = m.start + m.count;
          break;
        }
      }
      byBlock.set(ev.block.id, {
        entrance: true,
        gateAt,
        anim: ev.block.animation,
      });
    }

    return { steps, byBlock, total: cursor };
  }

  function visibilityFor(slide, model, b) {
    const vis = new Map();
    for (const block of slide.blocks) {
      const m = model.byBlock.get(block.id);
      if (!m) {
        vis.set(block.id, { visible: true, count: null, sub: false });
        continue;
      }
      if (m.entrance) {
        vis.set(block.id, { visible: b >= m.gateAt, count: null, sub: false });
      } else {
        const revealed = Math.min(Math.max(b - m.start, 0), m.count);
        vis.set(block.id, {
          visible: revealed >= m.count,
          count: revealed,
          sub: m.count > 1,
        });
      }
    }
    return vis;
  }

  /* ---------- SVG diagram renderer ---------- */

  function wrapLines(text, maxChars) {
    if (maxChars <= 0) return [text];
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      if (line && (line + " " + w).length > maxChars) {
        lines.push(line);
        line = w;
      } else {
        line = line ? line + " " + w : w;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function renderDiagram(content, alt) {
    const W = content.width || 800;
    const H = content.height || 500;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", alt || "Sơ đồ minh họa");
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = alt || "Sơ đồ";
    svg.appendChild(title);

    const markerId = "arr-" + Math.random().toString(36).slice(2, 8);
    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto-start-reverse");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    path.setAttribute("fill", "#94a3b8");
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const nodes = {};
    for (const n of content.nodes || []) {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "dg-node");
      g.setAttribute("data-kind", n.kind || "data");
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", n.x);
      rect.setAttribute("y", n.y);
      rect.setAttribute("width", n.w);
      rect.setAttribute("height", n.h);
      if (n.kind === "chip") rect.setAttribute("rx", n.h / 2);
      else rect.setAttribute("rx", 9);
      g.appendChild(rect);

      const fs = n.kind === "chip" ? 13 : 16;
      const lines = String(n.label || "").split("\n");
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("font-size", fs);
      const cx = n.x + n.w / 2;
      const firstY = n.y + n.h / 2 - ((lines.length - 1) * (fs + 4)) / 2 + fs / 3;
      lines.forEach((ln, i) => {
        const tspan = document.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", cx);
        if (i === 0) tspan.setAttribute("y", firstY);
        else tspan.setAttribute("dy", fs + 4);
        tspan.textContent = ln;
        text.appendChild(tspan);
      });
      g.appendChild(text);
      svg.appendChild(g);
      nodes[n.id] = n;
    }

    const center = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

    for (const e of content.edges || []) {
      const s = nodes[e.from];
      const t = nodes[e.to];
      if (!s || !t) continue;
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "dg-edge");
      let line, mid;
      const sc = center(s);
      const tc = center(t);

      if (e.bend === "down") {
        const off = 72;
        const p1 = { x: sc.x, y: s.y + s.h };
        const p2 = { x: tc.x, y: t.y + t.h };
        line = document.createElementNS(SVG_NS, "path");
        line.setAttribute(
          "d",
          `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + off}, ${p2.x} ${p2.y + off}, ${p2.x} ${p2.y}`
        );
        mid = { x: (p1.x + p2.x) / 2, y: Math.max(p1.y, p2.y) + off * 0.75 };
      } else {
        const dx = tc.x - sc.x;
        const dy = tc.y - sc.y;
        let p1, p2;
        if (Math.abs(dx) > Math.abs(dy)) {
          p1 = { x: dx > 0 ? s.x + s.w : s.x, y: sc.y };
          p2 = { x: dx > 0 ? t.x : t.x + t.w, y: tc.y };
        } else {
          p1 = { x: sc.x, y: dy > 0 ? s.y + s.h : s.y };
          p2 = { x: tc.x, y: dy > 0 ? t.y : t.y + t.h };
        }
        line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", p1.x);
        line.setAttribute("y1", p1.y);
        line.setAttribute("x2", p2.x);
        line.setAttribute("y2", p2.y);
        mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
      line.setAttribute("marker-end", `url(#${markerId})`);
      g.appendChild(line);
      svg.appendChild(g);

      if (e.label) {
        const lg = document.createElementNS(SVG_NS, "g");
        lg.setAttribute("class", "dg-edge-label");
        const ltext = document.createElementNS(SVG_NS, "text");
        ltext.setAttribute("x", mid.x);
        ltext.setAttribute("y", mid.y - 7);
        ltext.textContent = e.label;
        lg.appendChild(ltext);
        svg.appendChild(lg);
        const b = ltext.getBBox();
        const bg = document.createElementNS(SVG_NS, "rect");
        bg.setAttribute("x", b.x - 6);
        bg.setAttribute("y", b.y - 2);
        bg.setAttribute("width", b.width + 12);
        bg.setAttribute("height", b.height + 4);
        bg.setAttribute("rx", 5);
        lg.insertBefore(bg, ltext);
        svg.appendChild(lg);
      }
    }

    for (const note of content.notes || []) {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "dg-note");
      if (note.tone) g.setAttribute("data-tone", note.tone);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", note.x);
      rect.setAttribute("y", note.y);
      rect.setAttribute("width", note.w);
      rect.setAttribute("height", note.h);
      rect.setAttribute("rx", 9);
      g.appendChild(rect);
      const lines = wrapLines(note.text || "", Math.floor((note.w - 28) / 8.6));
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", note.x + 16);
      const startY = note.y + Math.max(note.h / 2 - ((lines.length - 1) * 22) / 2, note.h / 2 - 18);
      lines.forEach((ln, i) => {
        const tspan = document.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", note.x + 16);
        tspan.setAttribute("y", startY + i * 22);
        tspan.textContent = ln;
        text.appendChild(tspan);
      });
      g.appendChild(text);
      svg.appendChild(g);
    }

    return svg;
  }

  /* ---------- block renderers ---------- */

  function buildBlockEl(block) {
    const wrap = el("div", "block block-" + block.type);
    wrap.setAttribute("data-block-id", block.id);
    const fr = block.frame || {};
    wrap.style.left = (fr.x ?? 0) + "px";
    wrap.style.top = (fr.y ?? 0) + "px";
    wrap.style.width = (fr.w ?? 200) + "px";
    wrap.style.height = (fr.h ?? 100) + "px";

    const sub = []; // {node, setVisible}
    const c = block.content || {};

    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max((block.style && block.style.level) || 2, 1), 3);
        wrap.appendChild(el("h" + level, null, typeof c === "string" ? c : ""));
        break;
      }
      case "text": {
        const variant = (block.style && block.style.variant) || "body";
        const p = el("p", "block-text variant-" + variant, typeof c === "string" ? c : "");
        wrap.appendChild(p);
        break;
      }
      case "bullets": {
        const items = c.items || [];
        const ordered = !!c.ordered;
        const list = el(ordered ? "ol" : "ul", "bullets-list");
        if (block.style && block.style.big) wrap.classList.add("big");
        if (block.style && block.style.marker) wrap.setAttribute("data-marker", block.style.marker);
        for (const it of items) {
          const li = el("li", null, it);
          list.appendChild(li);
        }
        wrap.appendChild(list);
        break;
      }
      case "callout": {
        const tone = c.tone || "info";
        wrap.setAttribute("data-tone", tone);
        if (c.title) wrap.appendChild(el("div", "callout-title", c.title));
        wrap.appendChild(el("div", "callout-text", c.text || ""));
        break;
      }
      case "caption": {
        wrap.appendChild(el("p", "caption-inner", typeof c === "string" ? c : c.text || ""));
        break;
      }
      case "citation": {
        const src = c.sourceId;
        const source = (state.deck.sources || []).find((s) => s.id === src);
        const p = el("p", "citation-inner");
        if (c.text) p.appendChild(document.createTextNode(c.text + " "));
        if (source) {
          const a = el("a", null, source.title);
          a.href = source.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          p.appendChild(a);
        }
        wrap.appendChild(p);
        break;
      }
      case "metric": {
        wrap.appendChild(el("div", "metric-value", c.value || ""));
        if (c.label) wrap.appendChild(el("div", "metric-label", c.label));
        if (c.context) wrap.appendChild(el("div", "metric-context", c.context));
        break;
      }
      case "table": {
        const holder = el("div", "table-wrap");
        const scroll = el("div", "table-scroll");
        const table = el("table", "deck-table");
        const tones = c.columnTones || [];
        const thead = el("thead");
        const headRow = el("tr");
        (c.headers || []).forEach((h, i) => {
          const th = el("th", null, h);
          if (tones[i]) th.setAttribute("data-tone", tones[i]);
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody = el("tbody");
        (c.rows || []).forEach((row) => {
          const tr = el("tr");
          row.forEach((cell, i) => {
            const td = el("td", null, cell);
            if (tones[i]) td.setAttribute("data-tone", tones[i]);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
          sub.push({
            node: tr,
            setVisible: (on) => {
              tr.classList.toggle("row-visible", on);
              tr.classList.toggle("row-hidden", !on);
            },
          });
        });
        table.appendChild(tbody);
        scroll.appendChild(table);
        holder.appendChild(scroll);
        if (c.caption) {
          const cap = el("p", "block-caption", c.caption);
          cap.style.marginTop = "8px";
          holder.appendChild(cap);
        }
        wrap.appendChild(holder);
        break;
      }
      case "process": {
        const holder = el("div", "process-steps");
        (c.steps || []).forEach((step, i) => {
          const rail = el("div", "process-rail");
          const card = el("div", "process-step");
          card.appendChild(el("div", "step-num", String(i + 1).padStart(2, "0")));
          card.appendChild(el("div", "step-title", step.title));
          if (step.text) card.appendChild(el("div", "step-text", step.text));
          rail.appendChild(card);
          holder.appendChild(rail);
          sub.push({
            node: card,
            setVisible: (on) => {
              card.classList.toggle("step-visible", on);
              card.classList.toggle("step-hidden", !on);
            },
          });
        });
        wrap.appendChild(holder);
        break;
      }
      case "diagram": {
        const svg = renderDiagram(c, block.alt);
        wrap.appendChild(svg);
        break;
      }
      default: {
        wrap.appendChild(el("p", "block-text", typeof c === "string" ? c : ""));
      }
    }

    wrap._sub = sub;
    return wrap;
  }

  /* ---------- slide rendering ---------- */

  function buildSlideEl(slide, completed) {
    const slideEl = el("div", "slide");
    slideEl.setAttribute("data-slide-id", slide.id);
    slideEl.setAttribute("data-layout", slide.layout);
    for (const block of slide.blocks) {
      const bEl = buildBlockEl(block);
      slideEl.appendChild(bEl);
    }
    if (completed) slideEl.classList.add("completed");
    return slideEl;
  }

  function getModel(slide) {
    if (!slide.__model) slide.__model = computeBuildModel(slide);
    return slide.__model;
  }

  function applyState(slideEl, slide, buildIndex) {
    const model = getModel(slide);
    const vis = visibilityFor(slide, model, buildIndex);
    const key = slide.id;
    if (!state.animatedBlocks.has(key)) state.animatedBlocks.set(key, new Set());
    const done = state.animatedBlocks.get(key);

    for (const bEl of slideEl.children) {
      const bid = bEl.getAttribute("data-block-id");
      const v = vis.get(bid);
      const block = slide.blocks.find((b) => b.id === bid);
      if (!v) continue;

      if (v.visible) {
        bEl.classList.add("build-visible");
        bEl.classList.remove("build-hidden");
        const anim = block && block.animation;
        const useDefault = state.motion && (!anim || anim.trigger === "on-enter") && !done.has(bid);
        if (anim && state.motion && !done.has(bid)) {
          bEl.classList.add("anim-in");
          bEl.style.animationDelay = ((anim.order ?? 0) * 160) + "ms";
          done.add(bid);
        } else if (useDefault) {
          bEl.classList.add("anim-in");
          bEl.style.animationDelay = ((state.defaultAnimOrder ?? 0) * 160) + "ms";
          done.add(bid);
          state.defaultAnimOrder += 1;
        }
        if (v.sub && v.count != null) {
          (bEl._sub || []).forEach((it, i) => it.setVisible(i < v.count));
        } else {
          (bEl._sub || []).forEach((it) => it.setVisible(true));
        }
      } else {
        bEl.classList.add("build-hidden");
        bEl.classList.remove("build-visible");
        if (v.sub && v.count != null) {
          (bEl._sub || []).forEach((it, i) => it.setVisible(i < v.count));
        }
      }
    }
  }

  function renderCurrentSlide(opts) {
    state.defaultAnimOrder = 0;
    const { completed, animate } = opts || {};
    const slide = state.deck.slides[state.slideIndex];
    const slideEl = buildSlideEl(slide, completed);

    const prev = state.currentEl;
    stage.appendChild(slideEl);
    state.currentEl = slideEl;

    const b = completed ? Number.MAX_SAFE_INTEGER : state.buildIndex;
    if (animate && state.motion) {
      slideEl.classList.add("entering");
      applyState(slideEl, slide, b);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          slideEl.classList.add("active");
          slideEl.classList.remove("entering");
        });
      });
    } else {
      slideEl.classList.add("instant");
      slideEl.classList.add("active");
      applyState(slideEl, slide, b);
      requestAnimationFrame(() => slideEl.classList.remove("instant"));
    }

    if (prev && prev !== slideEl) {
      if (animate && state.motion) {
        prev.classList.remove("active");
        prev.classList.add("leaving");
        window.setTimeout(() => prev.remove(), TRANSITION_MS + 40);
      } else {
        prev.remove();
      }
    }
    return slideEl;
  }

  /* ---------- stage scaling / mode ---------- */

  const stage = $("stage");

  function updateMode() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h / Math.max(w, 1) > 0.95;
    const narrow = w <= 900;
    const reflow = narrow || portrait;
    if (reflow === state.reflow) {
      applyScale(w, h);
      return;
    }
    state.reflow = reflow;
    document.body.classList.toggle("reflow", reflow);
    rebuildStage();
  }

  function applyScale(w, h) {
    if (state.reflow) return;
    const scale = Math.min(w / 1600, h / 900);
    stage.style.transform = "scale(" + scale.toFixed(4) + ")";
  }

  function rebuildStage() {
    stage.innerHTML = "";
    state.currentEl = null;
    if (state.reflow) {
      state.deck.slides.forEach((slide, i) => {
        const el = buildSlideEl(slide, true);
        applyState(el, slide, Number.MAX_SAFE_INTEGER);
        el.style.display = i === state.slideIndex ? "block" : "none";
        stage.appendChild(el);
      });
    } else {
      renderCurrentSlide({ completed: false, animate: false });
    }
  }

  /* ---------- navigation ---------- */

  function totalBuilds(slide) {
    return getModel(slide).total;
  }

  function goToSlide(index, opts) {
    const { buildIndex, pushHistory } = opts || {};
    const slides = state.deck.slides;
    if (state.overviewOpen) closeOverview();
    const next = Math.max(0, Math.min(index, slides.length - 1));
    const slide = slides[next];
    const maxBuild = totalBuilds(slide);
    const b = buildIndex == null ? state.buildIndex : Math.max(0, Math.min(buildIndex, maxBuild));
    state.slideIndex = next;
    state.buildIndex = b;

    if (state.reflow) {
      const all = stage.children;
      for (let i = 0; i < all.length; i++) {
        all[i].style.display = i === next ? "block" : "none";
      }
    } else {
      renderCurrentSlide({ completed: false, animate: true });
    }

    if (pushHistory !== false) {
      try { history.pushState(null, "", "#s" + (next + 1)); } catch (_) {}
    }
    updateHud();
    announceSlide();
  }

  function next() {
    const slide = state.deck.slides[state.slideIndex];
    if (!state.reflow && state.buildIndex < totalBuilds(slide)) {
      state.buildIndex += 1;
      renderCurrentSlide({ completed: false, animate: false });
      updateHud();
      return;
    }
    if (state.slideIndex < state.deck.slides.length - 1) {
      goToSlide(state.slideIndex + 1, { buildIndex: 0 });
    }
  }

  function prev() {
    if (!state.reflow && state.buildIndex > 0) {
      state.buildIndex -= 1;
      renderCurrentSlide({ completed: false, animate: false });
      updateHud();
      return;
    }
    if (state.slideIndex > 0) {
      const prevSlide = state.deck.slides[state.slideIndex - 1];
      goToSlide(state.slideIndex - 1, { buildIndex: totalBuilds(prevSlide) });
    }
  }

  function parseHash() {
    const m = location.hash.match(/^#s(\d+)$/);
    if (!m) return null;
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < state.deck.slides.length) return idx;
    return null;
  }

  /* ---------- HUD ---------- */

  const progressFill = $("progress-fill");
  const slideCounter = $("slide-counter");

  function updateHud() {
    const total = state.deck.slides.length;
    slideCounter.textContent = (state.slideIndex + 1) + " / " + total;
    progressFill.style.width = ((state.slideIndex + 1) / total) * 100 + "%";
    updateOverviewCurrent();
  }

  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("role", "status");
  liveRegion.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;";
  document.body.appendChild(liveRegion);

  function announceSlide() {
    const slide = state.deck.slides[state.slideIndex];
    liveRegion.textContent = "Slide " + (state.slideIndex + 1) + ": " + slide.title;
  }

  /* ---------- timer ---------- */

  const timerChip = $("timer-chip");
  const timerText = $("timer-text");

  function startTimerIfNeeded() {
    if (state.timerStartedAt == null) state.timerStartedAt = Date.now();
  }

  function tickTimer() {
    if (state.timerStartedAt == null) return;
    const s = Math.floor((Date.now() - state.timerStartedAt) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    timerText.textContent = mm + ":" + ss;
  }

  function toggleTimerChip() {
    startTimerIfNeeded();
    timerChip.hidden = !timerChip.hidden;
    if (!timerChip.hidden) {
      tickTimer();
      state.timerInterval = setInterval(tickTimer, 1000);
    } else {
      clearInterval(state.timerInterval);
    }
  }

  /* ---------- overview ---------- */

  const overviewEl = $("overview");
  const overviewGrid = $("overview-grid");
  const miniScale = 1; // recomputed per item

  function openOverview() {
    if (state.overviewOpen) return;
    overviewGrid.innerHTML = "";
    state.deck.slides.forEach((slide, i) => {
      const item = el("div", "overview-item");
      if (i === state.slideIndex) item.classList.add("current");
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", "Đi đến slide " + (i + 1) + ": " + slide.title);

      const miniStage = el("div", "mini-stage");
      const mini = buildSlideEl(slide, true);
      applyState(mini, slide, Number.MAX_SAFE_INTEGER);
      mini.classList.add("mini-slide");
      miniStage.appendChild(mini);
      item.appendChild(el("div", "ov-label", String(i + 1)));
      item.appendChild(miniStage);
      item.appendChild(el("div", "ov-title", slide.title));

      overviewGrid.appendChild(item);
      const w = miniStage.clientWidth || 300;
      const scale = w / 1600;
      mini.style.transform = "scale(" + scale.toFixed(4) + ")";

      item.addEventListener("click", () => goToSlide(i, { buildIndex: 0 }));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToSlide(i, { buildIndex: 0 });
        }
      });
    });
    overviewEl.hidden = false;
    state.overviewOpen = true;
    $("btn-overview-close").focus();
  }

  function closeOverview() {
    overviewEl.hidden = true;
    state.overviewOpen = false;
    $("btn-overview").focus();
  }

  function updateOverviewCurrent() {
    const items = overviewGrid.children;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle("current", i === state.slideIndex);
    }
  }

  /* ---------- notes / blackout / fullscreen ---------- */

  const notesPanel = $("notes-panel");
  const notesText = $("notes-text");

  function toggleNotes() {
    state.notesVisible = !state.notesVisible;
    notesPanel.hidden = !state.notesVisible;
    if (state.notesVisible) {
      notesText.textContent = state.deck.slides[state.slideIndex].speakerNotes || "Không có ghi chú cho slide này.";
      $("btn-notes-close").focus();
    } else {
      $("btn-notes").focus();
    }
  }

  const blackoutEl = $("blackout");
  function cycleBlackout() {
    if (state.blackout === "none") state.blackout = "black";
    else state.blackout = "none";
    blackoutEl.hidden = state.blackout === "none";
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ---------- keyboard ---------- */

  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (state.overviewOpen) {
      if (e.key === "Escape" || e.key === "o" || e.key === "O") closeOverview();
      return;
    }
    if (state.blackout !== "none") {
      if (e.key === "b" || e.key === "B" || e.key === "Escape") cycleBlackout();
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        e.preventDefault();
        startTimerIfNeeded();
        next();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        startTimerIfNeeded();
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        if (e.key === "PageUp" || e.key === "Backspace") e.preventDefault();
        startTimerIfNeeded();
        prev();
        break;
      case "Home":
        goToSlide(0, { buildIndex: 0 });
        break;
      case "End":
        goToSlide(state.deck.slides.length - 1, { buildIndex: 0 });
        break;
      case "o": case "O": openOverview(); break;
      case "n": case "N": toggleNotes(); break;
      case "b": case "B": cycleBlackout(); break;
      case "f": case "F": toggleFullscreen(); break;
      case "t": case "T": toggleTimerChip(); break;
      case "Escape":
        if (document.fullscreenElement) document.exitFullscreen();
        break;
    }
  });

  /* ---------- touch ---------- */

  let touchX = null;
  let touchY = null;
  stage.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchX = t.clientX;
    touchY = t.clientY;
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      startTimerIfNeeded();
      if (dx < 0) next(); else prev();
    }
    touchX = touchY = null;
  }, { passive: true });

  /* ---------- controls visibility ---------- */

  const controlsEl = document.querySelector(".deck-controls");
  let hideTimer = null;
  function pokeControls() {
    controlsEl.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => controlsEl.classList.remove("show"), 3000);
  }
  window.addEventListener("pointermove", pokeControls);
  window.addEventListener("pointerdown", pokeControls);
  pokeControls();

  /* ---------- wire controls ---------- */

  $("btn-prev").addEventListener("click", () => { startTimerIfNeeded(); prev(); });
  $("btn-next").addEventListener("click", () => { startTimerIfNeeded(); next(); });
  $("btn-overview").addEventListener("click", openOverview);
  $("btn-overview-close").addEventListener("click", closeOverview);
  $("btn-notes").addEventListener("click", toggleNotes);
  $("btn-notes-close").addEventListener("click", toggleNotes);
  $("btn-blackout").addEventListener("click", cycleBlackout);
  $("btn-timer").addEventListener("click", toggleTimerChip);
  $("btn-fullscreen").addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", () => {
    state.fullscreen = !!document.fullscreenElement;
    applyScale(window.innerWidth, window.innerHeight);
  });

  /* ---------- deep links & resize ---------- */

  window.addEventListener("hashchange", () => {
    const idx = parseHash();
    if (idx != null && idx !== state.slideIndex) {
      goToSlide(idx, { buildIndex: 0, pushHistory: false });
    }
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyScale(window.innerWidth, window.innerHeight);
      updateMode();
      if (state.overviewOpen) openOverview();
    }, 80);
  });

  /* ---------- init ---------- */

  function setMotion() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.motion = !reduce;
    document.body.classList.toggle("motion-on", state.motion);
    document.body.classList.toggle("motion-off", !state.motion);
  }

  (async function init() {
    setMotion();
    state.deck = await loadDeck();
    document.title = state.deck.meta.title;

    const idx = parseHash();
    if (idx != null) {
      state.slideIndex = idx;
      state.buildIndex = totalBuilds(state.deck.slides[idx]);
    }

    updateMode();
    if (!state.reflow) renderCurrentSlide({ completed: false, animate: false });
    updateHud();
    announceSlide();
    applyScale(window.innerWidth, window.innerHeight);
  })();
})();
