(function () {
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    canvas: $("memoryBookCanvas"),
    previewCanvas: $("pagePreviewCanvas"),
    previewModal: $("pagePreviewModal"),
    previewTitle: $("previewTitle"),
    photoInput: $("photoInput"),
    photoPreview: $("photoPreview"),
    title: $("memoryTitle"),
    date: $("memoryDate"),
    text: $("memoryText"),
    location: $("memoryLocation"),
    activeUser: $("activeUser"),
    permission: $("pagePermission"),
    layoutTemplate: $("layoutTemplate"),
    pagePicker: $("pagePicker"),
    pageStrip: $("pageStrip"),
    finalizeBtn: $("finalizePageBtn"),
    voiceStatus: $("voiceStatus"),
    voiceBtn: $("voiceBtn"),
    toolbar: $("toolbar"),
    ribbonType: $("ribbonTypeSelect"),
    ribbonColor: $("ribbonColorSelect"),
    stickerType: $("stickerTypeSelect"),
    stickerColor: $("stickerColorSelect"),
    stampType: $("stampTypeSelect"),
    theme: $("canvasThemeSelect"),
    coverPreview: $("coverPreview"),
    coverHolder: $("coverPhotoHolder"),
    coverColor: $("coverColorSelect"),
    coverX: $("coverX"),
    coverY: $("coverY"),
    coverZoom: $("coverZoom"),
    coverHint: $("coverHint"),
    iEmpty: $("inspectorEmpty"),
    iFields: $("inspectorFields"),
    iScale: $("inspectorScale"),
    iColor: $("inspectorColor"),
    iVariant: $("inspectorVariant"),
    iText: $("inspectorText")
  };

  const OPT = {
    quotes: ["golden hour", "we should do this again", "small moment, big memory", "this felt like home", "sunday energy"],
    stamps: ["KEEP", "WILD", "WEEKEND", "MEMORY", "SHARED", "ARCHIVE", "BEST DAY"],
    papers: [{ value: "1", label: "Paper sand" }, { value: "2", label: "Paper cream" }, { value: "3", label: "Paper peach" }, { value: "4", label: "Paper moss" }, { value: "5", label: "Paper violet" }],
    ribbonVariants: [{ value: "strip", label: "Strip" }, { value: "short", label: "Short" }, { value: "torn", label: "Torn" }, { value: "cross", label: "Cross hatch" }],
    ribbonColors: [{ value: "amber", label: "Amber" }, { value: "sky", label: "Sky" }, { value: "rose", label: "Rose" }, { value: "sage", label: "Sage" }, { value: "smoke", label: "Smoke" }, { value: "violet", label: "Violet" }],
    stickerVariants: [{ value: "cut", label: "Cut quote" }, { value: "ticket", label: "Ticket" }, { value: "label", label: "Label" }, { value: "postcard", label: "Postcard" }, { value: "star", label: "Star burst" }],
    stickerColors: [{ value: "warm", label: "Warm" }, { value: "sage", label: "Sage" }, { value: "blush", label: "Blush" }, { value: "mist", label: "Mist" }, { value: "ink", label: "Ink" }],
    stampColors: [{ value: "rust", label: "Rust" }, { value: "forest", label: "Forest" }, { value: "ink", label: "Ink" }]
  };

  let seq = 1;
  let pages = [];
  let activeId = "";
  let selectedId = "";
  let drag = null;
  let coverDrag = false;
  let recognition = null;
  let recording = false;

  let mainPhoto = "";
  let coverColor = "sand";
  let cover = { x: 50, y: 50, zoom: 100 };

  const clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  const rand = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
  const pick = function (arr) { return arr[rand(0, arr.length - 1)]; };
  const today = function () { return new Date().toISOString().split("T")[0]; };
  const status = function (msg) { if (el.voiceStatus) el.voiceStatus.textContent = msg || ""; };
  const user = function () { return (el.activeUser && el.activeUser.value) || "you"; };
  const nextId = function (pfx) { seq += 1; return pfx + "_" + Date.now() + "_" + seq; };
  const userTag = function (id) { return id === "you" ? "you" : id; };

  function page() { return pages.find(function (p) { return p.id === activeId; }) || null; }
  function layers() { const p = page(); return p && p.layers ? p.layers : []; }
  function layerById(id) { return layers().find(function (l) { return l.id === id; }) || null; }
  function selectedLayer() { return selectedId ? layerById(selectedId) : null; }
  function nextZ() { return layers().reduce(function (m, l) { return Math.max(m, l.z || 1); }, 0) + 1; }

  function canEdit() {
    const p = page();
    if (!p || p.finalized) return false;
    if (p.permission === "collab") return true;
    return user() === "you";
  }

  function ensureEditable() {
    const p = page();
    if (!p) return false;
    if (p.finalized) { status("This page is finalized. Unfinalize to edit."); return false; }
    if (!canEdit()) { status("Owner-arranged mode: switch to owner to edit."); return false; }
    return true;
  }

  function makePage(index) {
    return {
      id: nextId("page"),
      title: "Page " + index,
      date: today(),
      description: "",
      location: "",
      permission: "owner",
      finalized: false,
      theme: "warm",
      layers: []
    };
  }

  function base(type) {
    return { id: nextId("layer"), type: type, author: user(), x: rand(16, 340), y: rand(14, 280), rotate: rand(-8, 8), scale: 1, z: nextZ() };
  }

  function noteLayer(text) { const l = base("note"); l.text = (text || "").trim() || "Add your memory note..."; l.paper = String(rand(1, 5)); return l; }
  function photoLayer(src) { const l = base("photo"); l.src = src; return l; }
  function tapeLayer() { const l = base("tape"); l.variant = el.ribbonType.value; l.color = el.ribbonColor.value; l.width = rand(92, 150); l.scale = rand(80, 120) / 100; l.rotate = rand(-20, 20); return l; }
  function stickerLayer(kind) { const l = base("sticker"); l.variant = kind; l.color = el.stickerColor.value; l.text = (el.text.value || "").trim() || pick(OPT.quotes); l.scale = rand(90, 120) / 100; return l; }
  function stampLayer() { const l = base("stamp"); l.text = el.stampType.value || pick(OPT.stamps); l.color = "rust"; l.scale = rand(90, 120) / 100; return l; }
  function mapLayer(src, label) { const l = base("map"); l.src = src; l.label = label || "Map"; return l; }

  function addLayer(layer) { layers().push(layer); selectedId = layer.id; render(); }
  function removeLayer(id) { const p = page(); p.layers = p.layers.filter(function (l) { return l.id !== id; }); if (selectedId === id) selectedId = ""; render(); }

  function syncFields() {
    const p = page();
    if (!p) return;
    el.title.value = p.title || "";
    el.date.value = p.date || today();
    el.text.value = p.description || "";
    el.location.value = p.location || "";
    el.permission.value = p.permission || "owner";
    el.theme.value = p.theme || "warm";
  }

  function pullFields() {
    const p = page();
    if (!p) return;
    p.title = (el.title.value || "").trim() || "Untitled page";
    p.date = el.date.value || today();
    p.description = el.text.value || "";
    p.location = el.location.value || "";
    p.permission = el.permission.value || "owner";
    renderPageControls();
  }

  function setPage(id) {
    const p = pages.find(function (item) { return item.id === id; });
    if (!p) return;
    activeId = id;
    selectedId = "";
    syncFields();
    render();
  }

  function addPage() { const p = makePage(pages.length + 1); pages.push(p); setPage(p.id); status("Added " + p.title + "."); }

  function deletePage() {
    if (pages.length <= 1) { status("At least one page is required."); return; }
    const idx = pages.findIndex(function (p) { return p.id === activeId; });
    if (idx < 0) return;
    const removed = pages[idx];
    pages.splice(idx, 1);
    const fallback = pages[Math.max(0, idx - 1)] || pages[0];
    setPage(fallback.id);
    status("Deleted " + removed.title + ".");
  }

  function toggleFinalize() {
    const p = page();
    if (!p) return;
    p.finalized = !p.finalized;
    if (p.finalized) selectedId = "";
    status(p.finalized ? "Page finalized." : "Page unfinalized.");
    render();
    if (!el.previewModal.classList.contains("hidden")) previewCurrentPage();
  }

  function renderPageControls() {
    el.pagePicker.innerHTML = "";
    el.pageStrip.innerHTML = "";

    pages.forEach(function (p, i) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = (p.title || "Page " + (i + 1)) + (p.finalized ? " (Final)" : "");
      el.pagePicker.appendChild(option);

      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "page-pill" + (p.id === activeId ? " active" : "") + (p.finalized ? " finalized" : "");
      pill.textContent = "P" + (i + 1);
      pill.addEventListener("click", function () { setPage(p.id); });
      el.pageStrip.appendChild(pill);
    });

    el.pagePicker.value = activeId;
  }
  function setTheme(theme) {
    const p = page();
    if (!p) return;
    p.theme = theme || "warm";
    render();
  }

  function layerBody(layer, wrapper, interactive) {
    if (layer.type === "photo") {
      const body = document.createElement("div");
      body.className = "layer-photo" + (mainPhoto && mainPhoto === layer.src ? " main-photo" : "");
      const img = document.createElement("img");
      img.src = layer.src;
      img.alt = "memory photo";
      body.appendChild(img);
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "map") {
      const body = document.createElement("div");
      body.className = "layer-map";
      const img = document.createElement("img");
      img.src = layer.src;
      img.alt = "map sticker";
      body.appendChild(img);
      const label = document.createElement("div");
      label.className = "map-label";
      label.textContent = layer.label || "Map";
      body.appendChild(label);
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "tape") {
      const body = document.createElement("div");
      body.className = "layer-tape tape-color-" + (layer.color || "amber") + " tape-variant-" + (layer.variant || "strip");
      if (layer.width) body.style.width = layer.width + "px";
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "sticker") {
      const body = document.createElement("div");
      body.className = "layer-sticker sticker-type-" + (layer.variant || "cut") + " sticker-color-" + (layer.color || "warm");
      body.textContent = layer.text || "";
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "stamp") {
      const body = document.createElement("div");
      body.className = "layer-stamp stamp-color-" + (layer.color || "rust");
      body.textContent = layer.text || "MEMORY";
      wrapper.appendChild(body);
      return;
    }

    const body = document.createElement("div");
    body.className = "layer-note paper-" + (layer.paper || "1");
    const text = document.createElement("div");
    text.className = "note-text";
    text.contentEditable = interactive && canEdit() ? "true" : "false";
    text.textContent = layer.text || "";
    text.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    text.addEventListener("input", function () {
      layer.text = text.textContent || "";
      if (selectedId === layer.id) renderInspector();
    });
    body.appendChild(text);
    wrapper.appendChild(body);
  }

  function addActions(layer, wrapper) {
    const actions = document.createElement("div");
    actions.className = "layer-actions";
    actions.innerHTML =
      "<button data-act='left'>L</button>" +
      "<button data-act='right'>R</button>" +
      "<button data-act='big'>+</button>" +
      "<button data-act='small'>-</button>" +
      (layer.type === "photo" ? "<button data-act='main'>M</button>" : "") +
      "<button data-act='front'>F</button>" +
      "<button data-act='delete'>X</button>";

    actions.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    actions.addEventListener("click", function (event) {
      const btn = event.target.closest("button");
      if (!btn || !ensureEditable()) return;
      const act = btn.dataset.act;
      if (act === "left") layer.rotate -= 5;
      if (act === "right") layer.rotate += 5;
      if (act === "big") layer.scale = clamp((layer.scale || 1) + 0.08, 0.55, 1.9);
      if (act === "small") layer.scale = clamp((layer.scale || 1) - 0.08, 0.55, 1.9);
      if (act === "main" && layer.type === "photo") setMainPhoto(layer.src);
      if (act === "front") layer.z = nextZ();
      if (act === "delete") { removeLayer(layer.id); return; }
      render();
    });

    wrapper.appendChild(actions);
  }

  function renderLayer(layer, interactive) {
    const wrapper = document.createElement("div");
    wrapper.className = "layer" + (interactive && layer.id === selectedId ? " selected" : "");
    wrapper.dataset.id = layer.id;
    wrapper.style.zIndex = String(layer.z || 1);
    wrapper.style.transform = "translate(" + layer.x + "px," + layer.y + "px) rotate(" + layer.rotate + "deg) scale(" + (layer.scale || 1) + ")";

    layerBody(layer, wrapper, interactive);

    const author = document.createElement("div");
    author.className = "layer-author";
    author.textContent = userTag(layer.author || "you");
    wrapper.appendChild(author);

    if (interactive) {
      addActions(layer, wrapper);
      wrapper.addEventListener("pointerdown", startDrag);
      wrapper.addEventListener("click", function (event) {
        event.stopPropagation();
        selectedId = layer.id;
        render();
      });
    }

    return wrapper;
  }

  function renderCanvas(target, interactive) {
    const p = page();
    if (!target || !p) return;

    target.innerHTML = "";
    target.classList.remove("theme-warm", "theme-sage", "theme-blush", "theme-mist", "finalized");
    target.classList.add("theme-" + (p.theme || "warm"));
    if (interactive && p.finalized) target.classList.add("finalized");

    if (!p.layers.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Start by adding a note or layering photos. Keep it messy and personal.";
      target.appendChild(empty);
      return;
    }

    p.layers.slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); }).forEach(function (layer) {
      target.appendChild(renderLayer(layer, interactive));
    });
  }

  function startDrag(event) {
    const layer = layerById(event.currentTarget.dataset.id);
    if (!layer) return;
    if (!canEdit()) { status("This page is locked for this user."); return; }

    layer.z = nextZ();
    selectedId = layer.id;

    const rect = el.canvas.getBoundingClientRect();
    drag = { id: layer.id, ox: event.clientX - rect.left - layer.x, oy: event.clientY - rect.top - layer.y };

    window.addEventListener("pointermove", dragMove);
    window.addEventListener("pointerup", dragEnd);
    render();
  }

  function dragMove(event) {
    if (!drag) return;
    const layer = layerById(drag.id);
    if (!layer) return;

    const rect = el.canvas.getBoundingClientRect();
    layer.x = clamp(event.clientX - rect.left - drag.ox, -120, rect.width - 20);
    layer.y = clamp(event.clientY - rect.top - drag.oy, -120, rect.height - 20);

    renderCanvas(el.canvas, true);
    renderInspector();
  }

  function dragEnd() {
    drag = null;
    window.removeEventListener("pointermove", dragMove);
    window.removeEventListener("pointerup", dragEnd);
  }

  function fillSelect(node, options, value) {
    node.innerHTML = "";
    options.forEach(function (opt) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      node.appendChild(option);
    });
    if (!options.length) return;
    const values = options.map(function (item) { return item.value; });
    node.value = values.indexOf(value) === -1 ? options[0].value : value;
  }

  function colorOptions(layer) {
    if (!layer) return [];
    if (layer.type === "note") return OPT.papers;
    if (layer.type === "tape") return OPT.ribbonColors;
    if (layer.type === "sticker") return OPT.stickerColors;
    if (layer.type === "stamp") return OPT.stampColors;
    return [];
  }

  function variantOptions(layer) {
    if (!layer) return [];
    if (layer.type === "tape") return OPT.ribbonVariants;
    if (layer.type === "sticker") return OPT.stickerVariants;
    return [];
  }

  function layerColorValue(layer) {
    if (!layer) return "";
    if (layer.type === "note") return String(layer.paper || "1");
    return layer.color || "";
  }

  function layerVariantValue(layer) {
    if (!layer) return "";
    return layer.variant || "";
  }

  function renderInspector() {
    const layer = selectedLayer();
    if (!layer) {
      el.iEmpty.classList.remove("hidden");
      el.iFields.classList.add("hidden");
      return;
    }

    el.iEmpty.classList.add("hidden");
    el.iFields.classList.remove("hidden");

    el.iScale.value = String(Math.round((layer.scale || 1) * 100));

    const cOpts = colorOptions(layer);
    fillSelect(el.iColor, cOpts, layerColorValue(layer));
    el.iColor.disabled = !cOpts.length;

    const vOpts = variantOptions(layer);
    fillSelect(el.iVariant, vOpts, layerVariantValue(layer));
    el.iVariant.disabled = !vOpts.length;

    el.iText.value = layer.text || "";
    el.iText.disabled = !(layer.type === "note" || layer.type === "sticker" || layer.type === "stamp");
  }

  function updateFinalizeUi() {
    const p = page();
    if (!p) return;
    const lock = !!p.finalized;
    el.finalizeBtn.textContent = lock ? "Unfinalize page" : "Finalize page";

    [el.title, el.date, el.text, el.location, el.permission].forEach(function (node) { if (node) node.disabled = lock; });
    Array.from(el.toolbar.querySelectorAll("button, select")).forEach(function (node) { node.disabled = lock; });
    if (el.voiceBtn) el.voiceBtn.disabled = lock;
  }
  function markThumbs() {
    Array.from(el.photoPreview.querySelectorAll("img")).forEach(function (img) {
      img.classList.toggle("main-selected", !!mainPhoto && img.src === mainPhoto);
    });
  }

  function setMainPhoto(src) {
    if (!src) return;
    mainPhoto = src;
    markThumbs();
    renderCover();
    render();
  }

  function setCoverColor(next) {
    coverColor = next || "sand";
    if (el.coverColor) el.coverColor.value = coverColor;
    renderCover();
  }

  function syncCoverInputs() {
    el.coverX.value = String(Math.round(cover.x));
    el.coverY.value = String(Math.round(cover.y));
    el.coverZoom.value = String(Math.round(cover.zoom));
    el.coverHint.textContent = "Center X " + Math.round(cover.x) + " | Y " + Math.round(cover.y) + " | Zoom " + Math.round(cover.zoom) + "%";
  }

  function renderCover() {
    el.coverPreview.className = "cover-preview cover-" + coverColor;
    if (!mainPhoto) {
      el.coverHolder.classList.remove("has-photo");
      el.coverHolder.textContent = "No main photo yet";
      el.coverHint.textContent = "Pick a photo then drag to re-center.";
      return;
    }

    el.coverHolder.classList.add("has-photo");
    el.coverHolder.innerHTML = "";
    const img = document.createElement("img");
    img.src = mainPhoto;
    img.alt = "main cover";
    img.style.objectPosition = cover.x + "% " + cover.y + "%";
    img.style.transform = "scale(" + (cover.zoom / 100).toFixed(2) + ")";
    img.style.transformOrigin = "center center";
    el.coverHolder.appendChild(img);
    syncCoverInputs();
  }

  function coverFromPointer(clientX, clientY) {
    const rect = el.coverHolder.getBoundingClientRect();
    cover.x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    cover.y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    renderCover();
  }

  function coverDragStart(event) {
    if (!mainPhoto) return;
    coverDrag = true;
    coverFromPointer(event.clientX, event.clientY);
    window.addEventListener("pointermove", coverDragMove);
    window.addEventListener("pointerup", coverDragEnd);
  }

  function coverDragMove(event) { if (coverDrag) coverFromPointer(event.clientX, event.clientY); }
  function coverDragEnd() {
    coverDrag = false;
    window.removeEventListener("pointermove", coverDragMove);
    window.removeEventListener("pointerup", coverDragEnd);
  }

  function recenterCover() {
    cover = { x: 50, y: 50, zoom: 100 };
    renderCover();
  }

  function uniquePreviewSources() {
    const seen = new Set();
    return Array.from(el.photoPreview.querySelectorAll("img")).map(function (img) { return img.src; }).filter(function (src) {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  function onPhotos(event) {
    Array.from(event.target.files || []).forEach(function (file) {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = document.createElement("img");
        img.src = ev.target.result;
        img.alt = "preview";
        img.addEventListener("click", function () { setMainPhoto(img.src); });
        el.photoPreview.appendChild(img);
        if (!mainPhoto) setMainPhoto(img.src);
      };
      reader.readAsDataURL(file);
    });
  }

  function addLooseNote() { if (ensureEditable()) addLayer(noteLayer("")); }
  function addFromDescription() { if (ensureEditable()) addLayer(noteLayer(el.text.value)); }

  function importPhotos() {
    if (!ensureEditable()) return;
    const existing = new Set(layers().filter(function (l) { return l.type === "photo"; }).map(function (l) { return l.src; }));
    uniquePreviewSources().forEach(function (src) { if (!existing.has(src)) addLayer(photoLayer(src)); });
    if (!mainPhoto) {
      const first = uniquePreviewSources()[0];
      if (first) setMainPhoto(first);
    }
    render();
  }

  function addRibbon() { if (ensureEditable()) addLayer(tapeLayer()); }

  function addStickerFromSelection() {
    const kind = el.stickerType.value;
    if (kind === "map") { addMapSticker(); return; }
    if (ensureEditable()) addLayer(stickerLayer(kind));
  }

  function addStampFromSelection() { if (ensureEditable()) addLayer(stampLayer()); }

  function parseLatLng(raw) {
    if (!raw) return null;
    const m = String(raw).trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    return m ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]), label: raw } : null;
  }

  function mapUrl(lat, lon) {
    return "https://staticmap.openstreetmap.de/staticmap.php?center=" + lat + "," + lon + "&zoom=13&size=300x190&maptype=mapnik&markers=" + lat + "," + lon + ",red-pushpin";
  }

  async function resolveLocation(query) {
    const parsed = parseLatLng(query);
    if (parsed) return parsed;
    const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query));
    if (!res.ok) throw new Error("Location search failed");
    const data = await res.json();
    if (!data || !data.length) throw new Error("Location not found");
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name || query };
  }

  async function addMapSticker() {
    if (!ensureEditable()) return;
    const query = (el.location.value || (page() && page().location) || "").trim();
    if (!query) { status("Add a location first to generate a map sticker."); return; }
    status("Building map sticker...");
    try {
      const coord = await resolveLocation(query);
      addLayer(mapLayer(mapUrl(coord.lat, coord.lon), coord.label || query));
      status("Map sticker added.");
    } catch (err) {
      status("Map sticker failed: " + err.message);
    }
  }

  function rotateSelected(delta) {
    const layer = selectedLayer();
    if (!layer || !ensureEditable()) return;
    layer.rotate += delta;
    render();
  }

  function shuffle() {
    if (!ensureEditable()) return;
    layers().forEach(function (layer, idx) {
      layer.x = rand(16, 360);
      layer.y = rand(14, 330);
      layer.rotate = rand(-16, 16);
      layer.scale = clamp((layer.scale || 1) * (rand(88, 115) / 100), 0.55, 1.9);
      layer.z = idx + 1;
    });
    render();
  }

  function clearPage() {
    if (!ensureEditable()) return;
    const p = page();
    p.layers = [];
    selectedId = "";
    render();
  }

  function applyTemplate() {
    if (!ensureEditable()) return;

    const p = page();
    const mode = (el.layoutTemplate && el.layoutTemplate.value) || "free";
    if (!p || !p.layers.length) {
      status("Add a few layers before applying a layout.");
      return;
    }

    const width = Math.max(360, el.canvas.clientWidth || 360);
    const height = Math.max(420, el.canvas.clientHeight || 420);
    const all = p.layers.slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); });

    if (mode === "free") {
      status("Free form layout selected.");
      render();
      return;
    }

    if (mode === "grid") {
      const cols = 3;
      const cellW = (width - 40) / cols;
      const cellH = (height - 40) / 3;
      all.forEach(function (layer, idx) {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        layer.x = 18 + c * cellW;
        layer.y = 18 + r * cellH;
        layer.rotate = 0;
        layer.scale = layer.type === "photo" ? 0.92 : 1;
        layer.z = idx + 1;
      });
      status("Applied grid 3x3 layout.");
      render();
      return;
    }

    if (mode === "zigzag") {
      const leftX = 26;
      const rightX = Math.max(160, width - 210);
      all.forEach(function (layer, idx) {
        layer.x = idx % 2 === 0 ? leftX : rightX;
        layer.y = 18 + idx * 84;
        layer.rotate = idx % 2 === 0 ? -4 : 4;
        layer.scale = layer.type === "photo" ? 0.95 : 1;
        layer.z = idx + 1;
      });
      status("Applied zig zag layout.");
      render();
      return;
    }

    if (mode === "story") {
      const notes = all.filter(function (l) { return l.type === "note"; });
      const photos = all.filter(function (l) { return l.type === "photo" || l.type === "map"; });
      const stickers = all.filter(function (l) { return l.type === "sticker"; });
      const extras = all.filter(function (l) { return l.type === "tape" || l.type === "stamp"; });
      const pairs = Math.max(notes.length, photos.length, 1);
      const photoX = Math.max(170, width * 0.44);
      let z = 1;

      for (let i = 0; i < pairs; i += 1) {
        const y = 18 + i * 176;
        if (notes[i]) {
          notes[i].x = 24;
          notes[i].y = y;
          notes[i].rotate = -2;
          notes[i].scale = 1;
          notes[i].z = z++;
        }
        if (photos[i]) {
          photos[i].x = photoX;
          photos[i].y = y + 20;
          photos[i].rotate = 2;
          photos[i].scale = 1;
          photos[i].z = z++;
        }
        if (stickers[i]) {
          stickers[i].x = photoX;
          stickers[i].y = y + 144;
          stickers[i].rotate = 0;
          stickers[i].scale = 1;
          stickers[i].variant = "label";
          stickers[i].color = stickers[i].color || "ink";
          if (!stickers[i].text || stickers[i].text.length < 3) stickers[i].text = "----------------";
          stickers[i].z = z++;
        }
      }

      extras.forEach(function (layer, idx) {
        layer.x = 24 + (idx % 2) * 120;
        layer.y = 24 + idx * 92;
        layer.rotate = idx % 2 === 0 ? -6 : 6;
        layer.z = z++;
      });

      status("Applied text - picture - line layout.");
      render();
      return;
    }
  }

  function previewCurrentPage() {
    const p = page();
    if (!p) return;
    el.previewModal.classList.remove("hidden");
    el.previewTitle.textContent = (p.title || "Page preview") + (p.finalized ? " (Finalized)" : "");
    renderCanvas(el.previewCanvas, false);
  }

  function closePreview() { el.previewModal.classList.add("hidden"); }

  function initVoice() {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      status("Voice input is not available in this browser.");
      return false;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = function () { recording = true; el.voiceBtn.classList.add("recording"); status("Listening..."); };
    recognition.onerror = function (event) { status("Voice error: " + event.error); stopVoice(); };
    recognition.onend = function () { if (!recording) return; try { recognition.start(); } catch (err) { stopVoice(); } };
    recognition.onresult = function (event) {
      if (!ensureEditable()) return;
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      if (final.trim()) {
        addLayer(noteLayer(final.trim()));
        const p = page();
        p.description = (p.description ? p.description + " " : "") + final.trim();
        el.text.value = p.description;
      }
      if (interim.trim()) status(interim.trim());
    };

    return true;
  }

  function startVoice() {
    if (!ensureEditable()) return;
    if (!recognition && !initVoice()) return;
    try { recognition.start(); } catch (err) { status("Unable to start voice input."); }
  }

  function stopVoice() {
    recording = false;
    if (recognition) {
      try { recognition.stop(); } catch (err) { }
    }
    el.voiceBtn.classList.remove("recording");
  }

  function toggleVoice() { if (recording) stopVoice(); else startVoice(); }
  function render() {
    if (!pages.length) {
      const first = makePage(1);
      pages = [first];
      activeId = first.id;
      syncFields();
    }
    renderPageControls();
    renderCanvas(el.canvas, true);
    renderInspector();
    renderCover();
    updateFinalizeUi();
    markThumbs();
  }

  function bindEvents() {
    el.photoInput.addEventListener("change", onPhotos);
    [el.title, el.date, el.text, el.location].forEach(function (node) { node.addEventListener("input", pullFields); });
    el.permission.addEventListener("change", function () { pullFields(); render(); });
    el.activeUser.addEventListener("change", function () { status("Editing as " + userTag(user()) + "."); render(); });
    el.pagePicker.addEventListener("change", function () { setPage(el.pagePicker.value); });

    el.coverColor.addEventListener("change", function () { setCoverColor(el.coverColor.value); });
    el.coverX.addEventListener("input", function () { cover.x = clamp(parseInt(el.coverX.value, 10) || 50, 0, 100); renderCover(); });
    el.coverY.addEventListener("input", function () { cover.y = clamp(parseInt(el.coverY.value, 10) || 50, 0, 100); renderCover(); });
    el.coverZoom.addEventListener("input", function () { cover.zoom = clamp(parseInt(el.coverZoom.value, 10) || 100, 40, 260); renderCover(); });
    el.coverHolder.addEventListener("pointerdown", coverDragStart);

    el.canvas.addEventListener("pointerdown", function (event) {
      if (event.target === el.canvas) {
        selectedId = "";
        render();
      }
    });

    el.iScale.addEventListener("input", function () {
      const layer = selectedLayer();
      if (!layer || !ensureEditable()) return;
      layer.scale = clamp((parseInt(el.iScale.value, 10) || 100) / 100, 0.55, 1.9);
      renderCanvas(el.canvas, true);
      renderInspector();
    });

    el.iColor.addEventListener("change", function () {
      const layer = selectedLayer();
      if (!layer || !ensureEditable()) return;
      if (layer.type === "note") layer.paper = el.iColor.value;
      else layer.color = el.iColor.value;
      render();
    });

    el.iVariant.addEventListener("change", function () {
      const layer = selectedLayer();
      if (!layer || !ensureEditable()) return;
      layer.variant = el.iVariant.value;
      render();
    });

    el.iText.addEventListener("input", function () {
      const layer = selectedLayer();
      if (!layer || !ensureEditable()) return;
      if (layer.type === "note" || layer.type === "sticker" || layer.type === "stamp") {
        layer.text = el.iText.value;
        renderCanvas(el.canvas, true);
        renderInspector();
      }
    });

    window.addEventListener("keydown", function (event) { if (event.key === "Escape") closePreview(); });
  }

  window.memoryBook = {
    addPage: addPage,
    deletePage: deletePage,
    previewCurrentPage: previewCurrentPage,
    closePreview: closePreview,
    toggleFinalize: toggleFinalize,
    addLooseNote: addLooseNote,
    addFromDescription: addFromDescription,
    importPhotos: importPhotos,
    addRibbon: addRibbon,
    addStickerFromSelection: addStickerFromSelection,
    addStampFromSelection: addStampFromSelection,
    addMapSticker: addMapSticker,
    applyTemplate: applyTemplate,
    setCanvasTheme: setTheme,
    setCoverColor: setCoverColor,
    recenterCover: recenterCover,
    setMainPhoto: setMainPhoto,
    rotateSelected: rotateSelected,
    toggleVoice: toggleVoice,
    shuffle: shuffle,
    clear: clearPage
  };

  const first = makePage(1);
  pages = [first];
  activeId = first.id;
  el.date.value = today();
  syncFields();
  bindEvents();
  setCoverColor("sand");
  recenterCover();
  render();
})();

