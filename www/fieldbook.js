(function () {
  const META_KEY = "lifestack_fieldbook_meta";
  const ROTATE_STEP = 5;

  const PAPER_OPTIONS = [
    { value: "1", label: "Paper sand" },
    { value: "2", label: "Paper cream" },
    { value: "3", label: "Paper peach" },
    { value: "4", label: "Paper moss" },
    { value: "5", label: "Paper violet" }
  ];

  const RIBBON_VARIANTS = [
    { value: "strip", label: "Strip" },
    { value: "short", label: "Short" },
    { value: "torn", label: "Torn" },
    { value: "cross", label: "Cross hatch" }
  ];

  const RIBBON_COLORS = [
    { value: "amber", label: "Amber" },
    { value: "sky", label: "Sky" },
    { value: "rose", label: "Rose" },
    { value: "sage", label: "Sage" },
    { value: "smoke", label: "Smoke" },
    { value: "violet", label: "Violet" }
  ];

  const STICKER_VARIANTS = [
    { value: "cut", label: "Cut quote" },
    { value: "ticket", label: "Ticket" },
    { value: "label", label: "Label" },
    { value: "postcard", label: "Postcard" },
    { value: "star", label: "Star burst" }
  ];

  const STICKER_COLORS = [
    { value: "warm", label: "Warm" },
    { value: "sage", label: "Sage" },
    { value: "blush", label: "Blush" },
    { value: "mist", label: "Mist" },
    { value: "ink", label: "Ink" }
  ];

  const STAMP_COLORS = [
    { value: "rust", label: "Rust" },
    { value: "forest", label: "Forest" },
    { value: "ink", label: "Ink" }
  ];

  const CUT_QUOTES = [
    "golden hour",
    "we should do this again",
    "small moment, big memory",
    "this felt like home",
    "sunday energy"
  ];

  const STAMP_WORDS = ["KEEP", "WILD", "WEEKEND", "MEMORY", "SHARED", "ARCHIVE"];

  const state = {
    seq: 1,
    editingMemoryId: "",
    photos: [],
    selectedPeopleIds: [],
    cover: { photoId: "", x: 50, y: 50, zoom: 100 },
    pages: [],
    activePageId: "",
    selectedLayerId: "",
    drag: null,
    coverDrag: false,
    locationSelectionIndex: -1,
    locationSearchTimeout: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function safeArray(data) {
    return Array.isArray(data) ? data : [];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(list) {
    return list[rand(0, list.length - 1)];
  }

  function esc(text) {
    if (text === undefined || text === null) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function nextId(prefix) {
    state.seq += 1;
    return prefix + "_" + Date.now() + "_" + state.seq;
  }

  function getMemories() {
    return typeof memories !== "undefined" ? safeArray(memories) : [];
  }

  function setMemories(next) {
    if (typeof memories !== "undefined") memories = safeArray(next);
  }

  function getPeopleList() {
    return typeof people !== "undefined" ? safeArray(people) : [];
  }

  function getFriendList() {
    if (typeof friendships === "undefined" || !friendships) return [];
    return safeArray(friendships.friends);
  }

  function getCurrentUser() {
    return typeof currentUser !== "undefined" ? currentUser : null;
  }

  function getCurrentYearView() {
    return typeof currentViewYear !== "undefined" ? currentViewYear : new Date().getFullYear();
  }

  function showToastSafe(message) {
    if (typeof showToast === "function") showToast(message);
  }

  function showErrorSafe(message) {
    if (typeof showError === "function") showError(message);
  }

  function readMetaStore() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Fieldbook meta read failed:", error);
      return {};
    }
  }

  function writeMetaStore(store) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(store || {}));
    } catch (error) {
      console.warn("Fieldbook meta write failed:", error);
    }
  }

  function getMeta(memoryId) {
    const store = readMetaStore();
    return store[memoryId] || null;
  }

  function saveMeta(memoryId, payload) {
    if (!memoryId) return;
    const store = readMetaStore();
    store[memoryId] = payload;
    writeMetaStore(store);
  }

  function parseDateSafe(raw) {
    const parsed = raw ? new Date(raw) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  function memoryTimestamp(memory) {
    const parsed = parseDateSafe(memory && (memory.occurredAt || memory.createdAt));
    return parsed ? parsed.getTime() : 0;
  }

  function userTag() {
    const user = getCurrentUser();
    return (user && (user.name || user.firstName)) ? (user.name || user.firstName) : "you";
  }

  function statusText(message, type) {
    const node = byId("fieldbookLocationStatus");
    if (!node) return;
    node.textContent = message || "";
    node.className = type ? ("location-status " + type) : "location-status";
  }

  function resetCoreState() {
    state.editingMemoryId = "";
    state.photos = [];
    state.selectedPeopleIds = [];
    state.cover = { photoId: "", x: 50, y: 50, zoom: 100 };
    state.pages = [];
    state.activePageId = "";
    state.selectedLayerId = "";
    state.drag = null;
  }

  function normalizePhoto(photo, index) {
    if (!photo) return null;
    if (typeof photo === "string") {
      return {
        id: "remote_" + index + "_" + Date.now(),
        url: photo,
        key: "",
        file: null,
        source: "remote"
      };
    }
    const url = photo.url || photo.viewUrl || "";
    if (!url) return null;
    return {
      id: "remote_" + index + "_" + Date.now(),
      url: url,
      key: photo.key || "",
      file: null,
      source: "remote"
    };
  }

  function getPhotoById(photoId) {
    return state.photos.find(function (photo) { return photo.id === photoId; }) || null;
  }

  function currentCoverPhoto() {
    let selected = getPhotoById(state.cover.photoId);
    if (!selected && state.photos.length) {
      selected = state.photos[0];
      state.cover.photoId = selected.id;
    }
    return selected;
  }

  function renderCoverPreview() {
    const holder = byId("fieldbookCoverPreview");
    if (!holder) return;

    const photo = currentCoverPhoto();
    if (!photo || !photo.url) {
      holder.classList.remove("has-image");
      holder.innerHTML = "Choose a photo";
      return;
    }

    holder.classList.add("has-image");
    holder.innerHTML = "";
    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = "cover";
    img.style.objectPosition = state.cover.x + "% " + state.cover.y + "%";
    img.style.transform = "scale(" + (state.cover.zoom / 100).toFixed(2) + ")";
    img.style.transformOrigin = "center center";
    holder.appendChild(img);

    if (window.innerWidth <= 768) {
      const hint = document.createElement("div");
      hint.style.cssText = "position:absolute;bottom:4px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.9);border-radius:999px;padding:4px 8px;font-size:0.65rem;color:var(--text-tertiary);pointer-events:none";
      hint.textContent = "Drag to pan, pinch to zoom";
      holder.appendChild(hint);
    }

    const xSlider = byId("fieldbookCoverX");
    const ySlider = byId("fieldbookCoverY");
    const zSlider = byId("fieldbookCoverZoom");
    if (xSlider) xSlider.value = String(Math.round(state.cover.x));
    if (ySlider) ySlider.value = String(Math.round(state.cover.y));
    if (zSlider) zSlider.value = String(Math.round(state.cover.zoom));
  }

  function renderPhotoThumbs() {
    const node = byId("fieldbookPhotoThumbs");
    if (!node) return;
    if (!state.photos.length) {
      node.innerHTML = "";
      return;
    }
    node.innerHTML = state.photos.map(function (photo) {
      return "" +
        "<div class=\"fieldbook-photo-thumb " + (photo.id === state.cover.photoId ? "selected" : "") + "\">" +
          "<img src=\"" + esc(photo.url) + "\" alt=\"thumb\" onclick=\"setFieldbookCoverPhoto('" + esc(photo.id) + "')\">" +
          "<button type=\"button\" onclick=\"event.stopPropagation();removeFieldbookPhoto('" + esc(photo.id) + "')\">x</button>" +
        "</div>";
    }).join("");
  }

  function setCoverPhoto(photoId) {
    state.cover.photoId = photoId;
    renderPhotoThumbs();
    renderCoverPreview();
    renderEditorCanvas();
  }

  function removeEditorPhoto(photoId) {
    state.photos = state.photos.filter(function (photo) { return photo.id !== photoId; });
    if (state.cover.photoId === photoId) {
      state.cover.photoId = state.photos.length ? state.photos[0].id : "";
    }
    renderPhotoThumbs();
    renderCoverPreview();
    renderEditorCanvas();
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addFilesToEditor(files) {
    const valid = safeArray(files).filter(function (file) {
      return file && file.type && file.type.indexOf("image/") === 0;
    });

    for (const file of valid) {
      try {
        const preview = await fileToDataUrl(file);
        state.photos.push({
          id: "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          url: preview,
          key: "",
          file: file,
          source: "file"
        });
      } catch (error) {
        console.warn("Fieldbook file read error:", error);
      }
    }

    if (!state.cover.photoId && state.photos.length) {
      state.cover.photoId = state.photos[0].id;
    }
    renderPhotoThumbs();
    renderCoverPreview();
  }

  function hideLocationDropdown() {
    const dropdown = byId("fieldbookLocationAutocomplete");
    if (!dropdown) return;
    dropdown.classList.remove("active");
    dropdown.innerHTML = "";
    state.locationSelectionIndex = -1;
  }

  function clearFieldbookLocationInternal() {
    byId("fieldbookLocation").value = "";
    byId("fieldbookLat").value = "";
    byId("fieldbookLng").value = "";
    byId("fieldbookPlaceId").value = "";
    byId("fieldbookLocationClearBtn").style.display = "none";
    statusText("");
    hideLocationDropdown();
  }

  function getSelectablePeople() {
    const fromPeople = getPeopleList().map(function (person) {
      return { id: person.id, name: person.name || "Person", avatar: person.avatar || "P" };
    });

    const fromFriends = getFriendList().map(function (friend) {
      const id = friend.odId || friend.friendUserId || friend.id;
      return { id: id, name: friend.name || friend.email || "Friend", avatar: friend.avatar || "F" };
    }).filter(function (friend) { return !!friend.id; });

    const all = fromPeople.concat(fromFriends);
    const seen = new Set();
    const unique = [];
    all.forEach(function (entry) {
      if (!entry.id || seen.has(entry.id)) return;
      seen.add(entry.id);
      unique.push(entry);
    });
    unique.sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return unique;
  }

  function renderPeopleChips() {
    const node = byId("fieldbookPeopleGrid");
    if (!node) return;
    if (!state.selectedPeopleIds.length) {
      node.innerHTML = "<span class=\"fieldbook-person-chip\">No people selected</span>";
      return;
    }
    const map = {};
    getSelectablePeople().forEach(function (person) { map[person.id] = person; });
    node.innerHTML = state.selectedPeopleIds.map(function (personId) {
      const person = map[personId];
      if (!person) return "";
      return "<span class=\"fieldbook-person-chip\">" + esc(person.avatar || "P") + " " + esc(person.name) + "</span>";
    }).join("");
  }

  function openPeoplePicker() {
    const modal = byId("fieldbookPeopleModal");
    const list = byId("fieldbookPeopleList");
    if (!modal || !list) return;
    const options = getSelectablePeople();
    if (!options.length) {
      list.innerHTML = "<p style=\"color:var(--text-tertiary);text-align:center;padding:10px;\">No people found. Add friends or people first.</p>";
      modal.classList.add("active");
      return;
    }
    list.innerHTML = options.map(function (person) {
      const checked = state.selectedPeopleIds.indexOf(person.id) >= 0 ? "checked" : "";
      return "" +
        "<label class=\"fieldbook-person-item\">" +
          "<span class=\"fieldbook-person-left\">" +
            "<span class=\"fieldbook-person-avatar\">" + esc(person.avatar || "P") + "</span>" +
            "<span>" + esc(person.name) + "</span>" +
          "</span>" +
          "<input type=\"checkbox\" value=\"" + esc(person.id) + "\" " + checked + ">" +
        "</label>";
    }).join("");
    modal.classList.add("active");
  }

  function closePeoplePicker() {
    const modal = byId("fieldbookPeopleModal");
    if (modal) modal.classList.remove("active");
  }

  function confirmPeoplePicker() {
    const list = byId("fieldbookPeopleList");
    if (!list) return;
    state.selectedPeopleIds = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map(function (node) {
      return node.value;
    });
    renderPeopleChips();
    closePeoplePicker();
  }
  function createPage(index) {
    return {
      id: nextId("page"),
      title: "Page " + index,
      finalized: false,
      layers: []
    };
  }

  function ensurePages() {
    if (!state.pages.length) {
      const page = createPage(1);
      state.pages = [page];
      state.activePageId = page.id;
    }
    if (!state.activePageId && state.pages.length) state.activePageId = state.pages[0].id;
  }

  function activePage() {
    ensurePages();
    return state.pages.find(function (page) { return page.id === state.activePageId; }) || state.pages[0];
  }

  function pageLayers(page) {
    return page && Array.isArray(page.layers) ? page.layers : [];
  }

  function findLayer(layerId) {
    const page = activePage();
    return pageLayers(page).find(function (layer) { return layer.id === layerId; }) || null;
  }

  function selectedLayer() {
    return state.selectedLayerId ? findLayer(state.selectedLayerId) : null;
  }

  function nextZ(page) {
    return pageLayers(page).reduce(function (maxZ, layer) {
      return Math.max(maxZ, layer.z || 1);
    }, 0) + 1;
  }

  function baseLayer(page, type) {
    return {
      id: nextId("layer"),
      type: type,
      author: userTag(),
      x: rand(16, 340),
      y: rand(14, 280),
      rotate: rand(-8, 8),
      scale: 1,
      z: nextZ(page)
    };
  }

  function noteLayer(page, text) {
    const layer = baseLayer(page, "note");
    layer.text = (text || "").trim() || "Add your memory note...";
    layer.paper = String(rand(1, 5));
    return layer;
  }

  function photoLayer(page, photo) {
    const layer = baseLayer(page, "photo");
    layer.src = photo.url;
    layer.photoId = photo.id;
    return layer;
  }

  function mapLayer(page, src, label) {
    const layer = baseLayer(page, "map");
    layer.src = src;
    layer.label = label || "Map";
    return layer;
  }

  function tapeLayer(page) {
    const layer = baseLayer(page, "tape");
    layer.variant = byId("fieldbookRibbonType").value || "strip";
    layer.color = byId("fieldbookRibbonColor").value || "amber";
    layer.width = rand(92, 150);
    layer.scale = rand(80, 120) / 100;
    layer.rotate = rand(-20, 20);
    return layer;
  }

  function stickerLayer(page, variant) {
    const layer = baseLayer(page, "sticker");
    layer.variant = variant || "cut";
    layer.color = byId("fieldbookStickerColor").value || "warm";
    layer.text = ((byId("fieldbookText").value || "").trim() || pick(CUT_QUOTES));
    layer.scale = rand(90, 120) / 100;
    return layer;
  }

  function stampLayer(page) {
    const layer = baseLayer(page, "stamp");
    layer.text = byId("fieldbookStampType").value || pick(STAMP_WORDS);
    layer.color = "rust";
    layer.scale = rand(90, 120) / 100;
    return layer;
  }

  function addLayer(layer) {
    const page = activePage();
    pageLayers(page).push(layer);
    state.selectedLayerId = layer.id;
    renderEditorCanvas();
  }

  function removeLayer(layerId) {
    const page = activePage();
    page.layers = pageLayers(page).filter(function (layer) { return layer.id !== layerId; });
    if (state.selectedLayerId === layerId) state.selectedLayerId = "";
    renderEditorCanvas();
  }

  function bringToFront(layer) {
    layer.z = nextZ(activePage());
  }

  function canEditCurrentPage() {
    const page = activePage();
    return page && !page.finalized;
  }

  function renderPageControls() {
    const picker = byId("fieldbookPagePicker");
    const strip = byId("fieldbookPageStrip");
    if (!picker || !strip) return;

    ensurePages();
    picker.innerHTML = "";
    strip.innerHTML = "";

    state.pages.forEach(function (page, index) {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.title + (page.finalized ? " (Final)" : "");
      picker.appendChild(option);

      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "fieldbook-page-pill" + (page.id === state.activePageId ? " active" : "") + (page.finalized ? " finalized" : "");
      pill.textContent = "P" + (index + 1);
      pill.addEventListener("click", function () {
        state.activePageId = page.id;
        state.selectedLayerId = "";
        renderEditorCanvas();
      });
      strip.appendChild(pill);
    });

    picker.value = state.activePageId;
    const finalizeBtn = byId("fieldbookFinalizeBtn");
    if (finalizeBtn) finalizeBtn.textContent = activePage().finalized ? "Unfinalize page" : "Finalize page";
  }

  function emptyCanvas(target) {
    const empty = document.createElement("div");
    empty.className = "fieldbook-empty-canvas";
    empty.textContent = "Start by adding notes, photos and stickers.";
    target.appendChild(empty);
  }

  function createLayerBody(layer, wrapper, interactive) {
    if (layer.type === "photo") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-photo" + (currentCoverPhoto() && layer.photoId === state.cover.photoId ? " main-photo" : "");
      const img = document.createElement("img");
      img.src = layer.src;
      img.alt = "photo";
      body.appendChild(img);
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "map") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-map";
      const img = document.createElement("img");
      img.src = layer.src;
      img.alt = "map";
      body.appendChild(img);
      const label = document.createElement("div");
      label.className = "fieldbook-map-label";
      label.textContent = layer.label || "Map";
      body.appendChild(label);
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "tape") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-tape fieldbook-tape-color-" + (layer.color || "amber") + " fieldbook-tape-variant-" + (layer.variant || "strip");
      if (layer.width) body.style.width = layer.width + "px";
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "sticker") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-sticker fieldbook-sticker-type-" + (layer.variant || "cut") + " fieldbook-sticker-color-" + (layer.color || "warm");
      body.textContent = layer.text || "";
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "stamp") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-stamp fieldbook-stamp-color-" + (layer.color || "rust");
      body.textContent = layer.text || "MEMORY";
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "note") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-note fieldbook-paper-" + (layer.paper || "1");
      const text = document.createElement("div");
      text.className = "fieldbook-note-text";
      text.contentEditable = interactive && canEditCurrentPage() ? "true" : "false";
      text.textContent = layer.text || "";
      text.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
      text.addEventListener("touchstart", function (event) { event.stopPropagation(); }, { passive: true });
      text.addEventListener("input", function () {
        layer.text = text.textContent || "";
        if (state.selectedLayerId === layer.id) syncInspector();
      });
      body.appendChild(text);
      wrapper.appendChild(body);
      return;
    }

    const body = document.createElement("div");
    body.className = "fieldbook-layer-unknown";
    body.textContent = "Unknown layer type";
    wrapper.appendChild(body);
  }

  function createActions(layer, wrapper) {
    const actions = document.createElement("div");
    actions.className = "fieldbook-layer-actions";
    actions.innerHTML =
      "<button data-act='left'>L</button>" +
      "<button data-act='right'>R</button>" +
      "<button data-act='big'>+</button>" +
      "<button data-act='small'>-</button>" +
      (layer.type === "photo" ? "<button data-act='main'>M</button>" : "") +
      "<button data-act='front'>F</button>" +
      "<button data-act='delete'>X</button>";

    actions.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    actions.addEventListener("touchstart", function (event) { event.stopPropagation(); }, { passive: true });
    actions.addEventListener("click", function (event) {
      const btn = event.target.closest("button");
      if (!btn || !canEditCurrentPage()) return;
      event.preventDefault();
      event.stopPropagation();
      const action = btn.dataset.act;
      if (action === "left") layer.rotate -= ROTATE_STEP;
      if (action === "right") layer.rotate += ROTATE_STEP;
      if (action === "big") layer.scale = clamp((layer.scale || 1) + 0.08, 0.55, 1.9);
      if (action === "small") layer.scale = clamp((layer.scale || 1) - 0.08, 0.55, 1.9);
      if (action === "main" && layer.type === "photo" && layer.photoId) setCoverPhoto(layer.photoId);
      if (action === "front") bringToFront(layer);
      if (action === "delete") {
        removeLayer(layer.id);
        return;
      }
      renderEditorCanvas();
    });
    wrapper.appendChild(actions);
  }

  function renderCanvas(target, page, interactive) {
    if (!target || !page) return;
    target.innerHTML = "";
    target.classList.toggle("finalized", !!page.finalized && interactive);

    const layers = pageLayers(page);
    if (!layers.length) {
      emptyCanvas(target);
      return;
    }

    layers.slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); }).forEach(function (layer) {
      const wrapper = document.createElement("div");
      wrapper.className = "fieldbook-layer" + (interactive && layer.id === state.selectedLayerId ? " selected" : "");
      wrapper.dataset.id = layer.id;
      wrapper.style.zIndex = String(layer.z || 1);
      wrapper.style.transform = "translate(" + layer.x + "px," + layer.y + "px) rotate(" + layer.rotate + "deg) scale(" + (layer.scale || 1) + ")";

      createLayerBody(layer, wrapper, interactive);

      const author = document.createElement("div");
      author.className = "fieldbook-layer-author";
      author.textContent = layer.author || "you";
      wrapper.appendChild(author);

      if (interactive) {
        createActions(layer, wrapper);
        wrapper.addEventListener("pointerdown", startDrag);
        wrapper.addEventListener("touchstart", startDrag, { passive: false });
        wrapper.addEventListener("click", function (event) {
          event.stopPropagation();
          state.selectedLayerId = layer.id;
          renderEditorCanvas();
        });
      }
      target.appendChild(wrapper);
    });

    if (interactive && layers.length > 0) {
      const hint = document.createElement("div");
      hint.className = "fieldbook-mobile-hint";
      hint.textContent = "Drag to move, pinch to zoom";
      target.appendChild(hint);
    }
  }

  function renderEditorCanvas() {
    ensurePages();
    renderPageControls();
    renderCanvas(byId("fieldbookCanvas"), activePage(), true);
    syncInspector();
  }

  function getEventCoords(event) {
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function startDrag(event) {
    if (!canEditCurrentPage()) return;
    const layer = findLayer(event.currentTarget.dataset.id);
    if (!layer) return;

    event.preventDefault();
    event.stopPropagation();

    bringToFront(layer);
    state.selectedLayerId = layer.id;
    const rect = byId("fieldbookCanvas").getBoundingClientRect();
    const coords = getEventCoords(event);

    state.drag = {
      id: layer.id,
      offsetX: coords.x - rect.left - layer.x,
      offsetY: coords.y - rect.top - layer.y,
      initialDistance: null,
      initialScale: layer.scale || 1
    };

    window.addEventListener("pointermove", onDragMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", endDrag);
    renderEditorCanvas();
  }

  function onDragMove(event) {
    if (!state.drag) return;
    event.preventDefault();

    const layer = findLayer(state.drag.id);
    if (!layer) return;
    const canvas = byId("fieldbookCanvas");
    const rect = canvas.getBoundingClientRect();

    if (event.touches && event.touches.length === 2) {
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (state.drag.initialDistance === null) {
        state.drag.initialDistance = distance;
      } else {
        const scale = distance / state.drag.initialDistance;
        layer.scale = clamp(state.drag.initialScale * scale, 0.55, 1.9);
      }
    } else {
      const coords = getEventCoords(event);
      layer.x = clamp(coords.x - rect.left - state.drag.offsetX, -120, rect.width - 20);
      layer.y = clamp(coords.y - rect.top - state.drag.offsetY, -120, rect.height - 20);
    }

    renderCanvas(canvas, activePage(), true);
    syncInspector();
  }

  function endDrag() {
    state.drag = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", endDrag);
  }
  function fillSelect(select, options, value) {
    if (!select) return;
    select.innerHTML = "";
    options.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      select.appendChild(option);
    });
    if (!options.length) return;
    const valid = options.map(function (entry) { return entry.value; });
    select.value = valid.indexOf(value) >= 0 ? value : options[0].value;
  }

  function colorOptions(layer) {
    if (!layer) return [];
    if (layer.type === "note") return PAPER_OPTIONS;
    if (layer.type === "tape") return RIBBON_COLORS;
    if (layer.type === "sticker") return STICKER_COLORS;
    if (layer.type === "stamp") return STAMP_COLORS;
    return [];
  }

  function variantOptions(layer) {
    if (!layer) return [];
    if (layer.type === "tape") return RIBBON_VARIANTS;
    if (layer.type === "sticker") return STICKER_VARIANTS;
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

  function syncInspector() {
    const layer = selectedLayer();
    const empty = byId("fieldbookInspectorEmpty");
    const fields = byId("fieldbookInspectorFields");
    if (!layer) {
      if (empty) empty.classList.remove("hidden");
      if (fields) fields.classList.add("hidden");
      return;
    }

    if (empty) empty.classList.add("hidden");
    if (fields) fields.classList.remove("hidden");

    const scale = byId("fieldbookInspectorScale");
    const color = byId("fieldbookInspectorColor");
    const variant = byId("fieldbookInspectorVariant");
    const text = byId("fieldbookInspectorText");

    if (scale) scale.value = String(Math.round((layer.scale || 1) * 100));

    const colorOpts = colorOptions(layer);
    fillSelect(color, colorOpts, layerColorValue(layer));
    if (color) color.disabled = !colorOpts.length;

    const variantOpts = variantOptions(layer);
    fillSelect(variant, variantOpts, layerVariantValue(layer));
    if (variant) variant.disabled = !variantOpts.length;

    if (text) {
      text.value = layer.text || "";
      text.disabled = !(layer.type === "note" || layer.type === "sticker" || layer.type === "stamp");
    }
  }

  function selectPage(pageId) {
    const page = state.pages.find(function (entry) { return entry.id === pageId; });
    if (!page) return;
    state.activePageId = pageId;
    state.selectedLayerId = "";
    renderEditorCanvas();
  }

  function addPage() {
    const page = createPage(state.pages.length + 1);
    state.pages.push(page);
    state.activePageId = page.id;
    state.selectedLayerId = "";
    renderEditorCanvas();
  }

  function deletePage() {
    if (state.pages.length <= 1) {
      showToastSafe("At least one page is required.");
      return;
    }
    const index = state.pages.findIndex(function (page) { return page.id === state.activePageId; });
    if (index < 0) return;
    state.pages.splice(index, 1);
    state.activePageId = state.pages[Math.max(0, index - 1)].id;
    state.selectedLayerId = "";
    renderEditorCanvas();
  }

  function toggleFinalize() {
    const page = activePage();
    page.finalized = !page.finalized;
    state.selectedLayerId = "";
    renderEditorCanvas();
    const previewOpen = byId("fieldbookPreviewModal") && byId("fieldbookPreviewModal").classList.contains("active");
    if (previewOpen) previewPage();
  }

  function previewPage() {
    const modal = byId("fieldbookPreviewModal");
    const title = byId("fieldbookPreviewTitle");
    if (!modal) return;
    const page = activePage();
    if (title) title.textContent = page.title + (page.finalized ? " (Finalized)" : "");
    renderCanvas(byId("fieldbookPreviewCanvas"), page, false);
    modal.classList.add("active");
  }

  function closePreview() {
    const modal = byId("fieldbookPreviewModal");
    if (modal) modal.classList.remove("active");
  }

  function addNote() {
    if (!canEditCurrentPage()) return;
    addLayer(noteLayer(activePage(), ""));
  }

  function addFromDescription() {
    if (!canEditCurrentPage()) return;
    addLayer(noteLayer(activePage(), byId("fieldbookText").value || ""));
  }

  function importPhotosToLayer() {
    if (!canEditCurrentPage()) return;
    const page = activePage();
    const existing = new Set(pageLayers(page).filter(function (layer) { return layer.type === "photo"; }).map(function (layer) { return layer.photoId; }));
    state.photos.forEach(function (photo) {
      if (!existing.has(photo.id)) addLayer(photoLayer(page, photo));
    });
  }

  function addRibbon() {
    if (!canEditCurrentPage()) return;
    addLayer(tapeLayer(activePage()));
  }

  function parseLatLng(raw) {
    const match = String(raw || "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]), label: raw };
  }

  function mapUrl(lat, lon) {
    return "https://staticmap.openstreetmap.de/staticmap.php?center=" + lat + "," + lon + "&zoom=13&size=300x190&maptype=mapnik&markers=" + lat + "," + lon + ",red-pushpin";
  }

  async function resolveLocation(query) {
    const parsed = parseLatLng(query);
    if (parsed) return parsed;
    const response = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query));
    if (!response.ok) throw new Error("Location search failed");
    const data = await response.json();
    if (!data || !data.length) throw new Error("Location not found");
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      label: data[0].display_name || query
    };
  }

  async function addMapSticker() {
    if (!canEditCurrentPage()) return;
    const query = (byId("fieldbookLocation").value || "").trim();
    if (!query) {
      showToastSafe("Add a location first.");
      return;
    }
    try {
      const coords = await resolveLocation(query);
      addLayer(mapLayer(activePage(), mapUrl(coords.lat, coords.lon), coords.label || query));
    } catch (error) {
      showErrorSafe("Map sticker failed.");
    }
  }

  function addSticker() {
    if (!canEditCurrentPage()) return;
    const type = byId("fieldbookStickerType").value;
    if (type === "map") {
      addMapSticker();
      return;
    }
    addLayer(stickerLayer(activePage(), type));
  }

  function addStamp() {
    if (!canEditCurrentPage()) return;
    addLayer(stampLayer(activePage()));
  }

  function rotateSelected(delta) {
    const layer = selectedLayer();
    if (!layer || !canEditCurrentPage()) return;
    layer.rotate += delta;
    renderEditorCanvas();
  }

  function shuffleLayers() {
    if (!canEditCurrentPage()) return;
    pageLayers(activePage()).forEach(function (layer, index) {
      layer.x = rand(16, 360);
      layer.y = rand(14, 330);
      layer.rotate = rand(-16, 16);
      layer.scale = clamp((layer.scale || 1) * (rand(88, 115) / 100), 0.55, 1.9);
      layer.z = index + 1;
    });
    renderEditorCanvas();
  }

  function clearLayers() {
    if (!canEditCurrentPage()) return;
    activePage().layers = [];
    state.selectedLayerId = "";
    renderEditorCanvas();
  }

  function applyTemplate() {
    if (!canEditCurrentPage()) return;
    const mode = byId("fieldbookTemplate").value || "free";
    const page = activePage();
    const layers = pageLayers(page).slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); });
    if (!layers.length) return;
    const canvas = byId("fieldbookCanvas");
    const width = Math.max(360, canvas.clientWidth || 360);
    const height = Math.max(420, canvas.clientHeight || 420);

    if (mode === "grid") {
      const cols = 3;
      const cellW = (width - 40) / cols;
      const cellH = (height - 40) / 3;
      layers.forEach(function (layer, index) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        layer.x = 18 + col * cellW;
        layer.y = 18 + row * cellH;
        layer.rotate = 0;
        layer.scale = layer.type === "photo" ? 0.92 : 1;
        layer.z = index + 1;
      });
      renderEditorCanvas();
      return;
    }

    if (mode === "zigzag") {
      const leftX = 26;
      const rightX = Math.max(160, width - 210);
      layers.forEach(function (layer, index) {
        layer.x = index % 2 === 0 ? leftX : rightX;
        layer.y = 18 + index * 84;
        layer.rotate = index % 2 === 0 ? -4 : 4;
        layer.scale = layer.type === "photo" ? 0.95 : 1;
        layer.z = index + 1;
      });
      renderEditorCanvas();
      return;
    }

    if (mode === "story") {
      const notes = layers.filter(function (layer) { return layer.type === "note"; });
      const photos = layers.filter(function (layer) { return layer.type === "photo" || layer.type === "map"; });
      const stickers = layers.filter(function (layer) { return layer.type === "sticker"; });
      const extras = layers.filter(function (layer) { return layer.type === "tape" || layer.type === "stamp"; });
      const rows = Math.max(notes.length, photos.length, 1);
      const photoX = Math.max(170, width * 0.44);
      let z = 1;
      for (let i = 0; i < rows; i += 1) {
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
      renderEditorCanvas();
      return;
    }

    renderEditorCanvas();
  }

  function serializePagesWithUploadedPhotos(photoMap) {
    return state.pages.map(function (page) {
      return {
        id: page.id,
        title: page.title,
        finalized: !!page.finalized,
        layers: pageLayers(page).map(function (layer) {
          const copy = Object.assign({}, layer);
          if (copy.type === "photo" && copy.photoId && photoMap[copy.photoId]) {
            copy.src = photoMap[copy.photoId];
          }
          return copy;
        })
      };
    });
  }
  async function uploadEditorPhotos(memoryId) {
    const uploaded = [];
    for (const photo of state.photos) {
      if (!photo.file) {
        uploaded.push({ id: photo.id, key: photo.key || "", url: photo.url });
        continue;
      }

      let file = photo.file;
      try {
        if (typeof compressImage === "function") file = await compressImage(photo.file);
        if (typeof getUploadUrl !== "function" || typeof uploadPhotoToS3 !== "function") throw new Error("Upload helper missing");
        const urlData = await getUploadUrl(file.name, file.type, memoryId);
        if (!urlData || !urlData.uploadUrl || !urlData.viewUrl) throw new Error("Upload URL failed");
        const ok = await uploadPhotoToS3(urlData.uploadUrl, file);
        if (!ok) throw new Error("Upload failed");
        uploaded.push({ id: photo.id, key: urlData.key || "", url: urlData.viewUrl });
      } catch (error) {
        console.warn("Fieldbook photo upload fallback:", error);
        uploaded.push({ id: photo.id, key: "", url: photo.url });
      }
    }
    return uploaded;
  }

  function collectLocation() {
    const name = byId("fieldbookLocation").value.trim();
    const lat = byId("fieldbookLat").value;
    const lng = byId("fieldbookLng").value;
    const placeId = byId("fieldbookPlaceId").value;
    if (!name && !lat && !lng) return null;
    return {
      name: name || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      placeId: placeId || null
    };
  }

  async function saveEditor() {
    const title = byId("fieldbookTitle").value.trim();
    const occurredAt = byId("fieldbookDate").value;
    const text = byId("fieldbookText").value || "";
    const memoryId = byId("fieldbookMemoryId").value || "";

    if (!title || !occurredAt) {
      showErrorSafe("Please add title and date");
      return;
    }

    const saveBtn = byId("fieldbookSaveBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    try {
      const uploadMemoryId = memoryId || ("mem_" + Date.now());
      const uploadedPhotos = await uploadEditorPhotos(uploadMemoryId);
      const photoMap = {};
      uploadedPhotos.forEach(function (item) { photoMap[item.id] = item.url; });

      const appUser = getCurrentUser();
      const occYear = new Date(occurredAt).getFullYear();
      const birthYear = appUser && appUser.birthdate ? new Date(appUser.birthdate).getFullYear() : occYear;
      const yearOffset = String(occYear - birthYear);

      const existing = memoryId ? (getMemories().find(function (memory) { return memory.id === memoryId; }) || null) : null;
      const tags = Array.from(new Set(safeArray(existing && existing.tags).concat(["fieldbook"])));

      const payload = {
        title: title,
        occurredAt: occurredAt,
        text: text,
        tags: tags,
        year: yearOffset,
        planId: existing ? (existing.planId || null) : null,
        subActivity: existing ? (existing.subActivity || null) : null,
        people: state.selectedPeopleIds.slice(),
        photos: uploadedPhotos.map(function (item) { return { key: item.key || "", url: item.url }; }),
        location: collectLocation()
      };

      const tokens = typeof getValidTokens === "function" ? await getValidTokens() : null;
      let savedMemory = null;

      if (memoryId) {
        if (tokens && tokens.idToken) {
          const response = await fetch(CONFIG.API_URL + "/memories/" + memoryId, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + tokens.idToken
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error("Update failed");
          savedMemory = await response.json();
        } else {
          savedMemory = Object.assign({}, existing || {}, payload, { id: memoryId, updatedAt: new Date().toISOString() });
        }
      } else {
        if (tokens && tokens.idToken) {
          const response = await fetch(CONFIG.API_URL + "/memories", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + tokens.idToken
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error("Create failed");
          savedMemory = await response.json();
        } else {
          savedMemory = Object.assign({
            id: uploadMemoryId,
            userId: appUser && appUser.id,
            createdAt: new Date().toISOString()
          }, payload);
        }
      }

      if (!savedMemory || !savedMemory.id) throw new Error("Invalid save response");

      const coverUrl = state.cover.photoId && photoMap[state.cover.photoId]
        ? photoMap[state.cover.photoId]
        : (currentCoverPhoto() ? currentCoverPhoto().url : "");

      saveMeta(savedMemory.id, {
        pages: serializePagesWithUploadedPhotos(photoMap),
        activePageId: state.activePageId,
        template: byId("fieldbookTemplate").value || "free",
        cover: {
          photoId: state.cover.photoId || "",
          url: coverUrl || "",
          x: state.cover.x,
          y: state.cover.y,
          zoom: state.cover.zoom
        },
        updatedAt: new Date().toISOString()
      });

      const allMemories = getMemories();
      const index = allMemories.findIndex(function (memory) { return memory.id === savedMemory.id; });
      if (index >= 0) allMemories[index] = savedMemory;
      else allMemories.push(savedMemory);
      setMemories(allMemories);
      localStorage.setItem("lifestack_memories", JSON.stringify(allMemories));

      if (typeof renderDashboard === "function") renderDashboard();
      if (typeof renderYearMemories === "function") renderYearMemories(getCurrentYearView());
      if (typeof renderMonthGrid === "function") renderMonthGrid();
      renderFieldbookShelf();

      closeEditor();
      openViewer(savedMemory.id);
      showToastSafe("Fieldbook memory saved");
    } catch (error) {
      console.error("Fieldbook save error:", error);
      showErrorSafe("Could not save fieldbook memory");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save and Finalize";
      }
    }
  }

  function resetEditorForm() {
    resetCoreState();
    ensurePages();
    byId("fieldbookMemoryId").value = "";
    byId("fieldbookEditorTitle").textContent = "Create Fieldbook Memory";
    byId("fieldbookTitle").value = "";
    byId("fieldbookDate").value = todayISO();
    byId("fieldbookText").value = "";
    byId("fieldbookTemplate").value = "free";
    clearFieldbookLocationInternal();
    renderPeopleChips();
    renderPhotoThumbs();
    renderCoverPreview();
    renderEditorCanvas();
  }

  function hydrateEditorFromMemory(memory) {
    resetCoreState();
    if (!memory) {
      resetEditorForm();
      return;
    }

    const meta = getMeta(memory.id) || {};
    byId("fieldbookMemoryId").value = memory.id;
    byId("fieldbookEditorTitle").textContent = "Edit Fieldbook Memory";
    byId("fieldbookTitle").value = memory.title || "";
    byId("fieldbookDate").value = (memory.occurredAt || "").split("T")[0] || todayISO();
    byId("fieldbookText").value = memory.text || "";
    byId("fieldbookTemplate").value = meta.template || "free";

    state.editingMemoryId = memory.id;
    state.photos = safeArray(memory.photos).map(normalizePhoto).filter(Boolean);
    state.selectedPeopleIds = safeArray(memory.people).slice();

    if (memory.location) {
      byId("fieldbookLocation").value = memory.location.name || "";
      byId("fieldbookLat").value = memory.location.lat || "";
      byId("fieldbookLng").value = memory.location.lng || "";
      byId("fieldbookPlaceId").value = memory.location.placeId || "";
      byId("fieldbookLocationClearBtn").style.display = memory.location.name ? "flex" : "none";
    } else {
      clearFieldbookLocationInternal();
    }

    const cover = meta.cover || {};
    state.cover.photoId = cover.photoId || (state.photos[0] && state.photos[0].id) || "";
    state.cover.x = Number.isFinite(Number(cover.x)) ? Number(cover.x) : 50;
    state.cover.y = Number.isFinite(Number(cover.y)) ? Number(cover.y) : 50;
    state.cover.zoom = Number.isFinite(Number(cover.zoom)) ? Number(cover.zoom) : 100;

    if (meta.pages && Array.isArray(meta.pages) && meta.pages.length) {
      state.pages = meta.pages.map(function (page, index) {
        return {
          id: page.id || nextId("page"),
          title: page.title || ("Page " + (index + 1)),
          finalized: !!page.finalized,
          layers: safeArray(page.layers).map(function (layer) {
            const copy = Object.assign({}, layer);
            if (!copy.id) copy.id = nextId("layer");
            return copy;
          })
        };
      });
      state.activePageId = meta.activePageId && state.pages.some(function (page) { return page.id === meta.activePageId; })
        ? meta.activePageId
        : state.pages[0].id;
    } else {
      const page = createPage(1);
      state.pages = [page];
      state.activePageId = page.id;
      state.photos.slice(0, 6).forEach(function (photo) {
        page.layers.push(photoLayer(page, photo));
      });
    }

    renderPeopleChips();
    renderPhotoThumbs();
    renderCoverPreview();
    renderEditorCanvas();
  }

  function openEditor(memoryId) {
    const modal = byId("fieldbookEditorModal");
    if (!modal) return;
    if (memoryId) {
      const memory = getMemories().find(function (entry) { return entry.id === memoryId; });
      hydrateEditorFromMemory(memory || null);
    } else {
      resetEditorForm();
    }
    modal.classList.add("active");
  }

  function closeEditor() {
    const modal = byId("fieldbookEditorModal");
    if (modal) modal.classList.remove("active");
  }

  function formatDateLabel(raw) {
    const parsed = parseDateSafe(raw);
    if (!parsed) return "";
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function isFieldbookMemory(memory) {
    if (!memory || !memory.id) return false;
    const tags = safeArray(memory.tags).map(function (tag) { return String(tag || "").toLowerCase(); });
    return tags.indexOf("fieldbook") >= 0 || !!getMeta(memory.id);
  }

  function memoryCoverUrl(memory) {
    const meta = memory && memory.id ? (getMeta(memory.id) || {}) : {};
    if (meta.cover && meta.cover.url) return meta.cover.url;
    if (memory && Array.isArray(memory.photos) && memory.photos[0] && memory.photos[0].url) return memory.photos[0].url;
    return "";
  }

  function fallbackPageFromMemory(memory) {
    const page = createPage(1);
    page.title = "Page 1";
    page.finalized = true;
    if (memory && memory.text) page.layers.push(noteLayer(page, memory.text));
    safeArray(memory && memory.photos).slice(0, 6).forEach(function (photo, idx) {
      const normalized = normalizePhoto(photo, idx);
      if (normalized) page.layers.push(photoLayer(page, normalized));
    });
    return page;
  }

  function sanitizeViewerPages(pages, memory) {
    if (!Array.isArray(pages) || !pages.length) return [fallbackPageFromMemory(memory)];
    return pages.map(function (page, index) {
      return {
        id: page.id || nextId("page"),
        title: page.title || ("Page " + (index + 1)),
        finalized: !!page.finalized,
        layers: safeArray(page.layers).map(function (layer) {
          const copy = Object.assign({}, layer);
          if (!copy.id) copy.id = nextId("layer");
          return copy;
        })
      };
    });
  }

  function openViewer(memoryId) {
    const memory = getMemories().find(function (entry) { return entry.id === memoryId; });
    if (!memory) {
      showErrorSafe("Memory not found");
      return;
    }

    const modal = byId("fieldbookViewerModal");
    const title = byId("fieldbookViewerTitle");
    const date = byId("fieldbookViewerDate");
    const content = byId("fieldbookViewerContent");
    if (!modal || !content) return;

    const meta = getMeta(memory.id) || {};
    const pages = sanitizeViewerPages(meta.pages, memory);
    const finalized = pages.filter(function (page) { return page.finalized; });
    const pagesToShow = finalized.length ? finalized : pages.slice(0, 1);

    if (title) title.textContent = memory.title || "Fieldbook";
    if (date) date.textContent = formatDateLabel(memory.occurredAt || memory.createdAt);

    content.innerHTML = "";

    pagesToShow.forEach(function (page, index) {
      const block = document.createElement("div");
      block.className = "fieldbook-view-page";
      if (index > 0) block.style.marginTop = "10px";

      const head = document.createElement("div");
      head.style.display = "flex";
      head.style.justifyContent = "space-between";
      head.style.alignItems = "center";
      head.style.marginBottom = "6px";
      head.innerHTML = "<strong>" + esc(page.title) + "</strong>" + (page.finalized ? "<span class=\"tag\">Finalized</span>" : "");
      block.appendChild(head);

      const canvas = document.createElement("div");
      canvas.className = "fieldbook-canvas fieldbook-preview-canvas";
      block.appendChild(canvas);
      renderCanvas(canvas, page, false);

      content.appendChild(block);
    });

    const footer = document.createElement("div");
    footer.className = "fieldbook-view-page";
    footer.style.marginTop = "10px";

    const cover = memoryCoverUrl(memory);
    if (cover) {
      const coverNode = document.createElement("div");
      coverNode.className = "fieldbook-view-cover";
      const img = document.createElement("img");
      img.src = cover;
      img.alt = "cover";
      coverNode.appendChild(img);
      footer.appendChild(coverNode);
    }

    if (memory.text) {
      const text = document.createElement("div");
      text.className = "fieldbook-view-text";
      text.textContent = memory.text;
      footer.appendChild(text);
    }

    const metaRow = document.createElement("div");
    metaRow.className = "fieldbook-view-meta";
    if (memory.location && memory.location.name) {
      metaRow.innerHTML += "<span class=\"tag\">Location: " + esc(memory.location.name) + "</span>";
    }
    safeArray(memory.people).forEach(function (personId) {
      metaRow.innerHTML += "<span class=\"tag\">Shared: " + esc(personId) + "</span>";
    });
    if (metaRow.innerHTML) footer.appendChild(metaRow);
    content.appendChild(footer);

    modal.classList.add("active");
  }

  function closeViewer() {
    const modal = byId("fieldbookViewerModal");
    if (modal) modal.classList.remove("active");
  }

  function removeMeta(memoryId) {
    if (!memoryId) return;
    const store = readMetaStore();
    if (!Object.prototype.hasOwnProperty.call(store, memoryId)) return;
    delete store[memoryId];
    writeMetaStore(store);
  }

  async function deleteFieldbookMemory(memoryId) {
    const memory = getMemories().find(function (entry) { return entry.id === memoryId; });
    if (!memory) return;
    if (!window.confirm("Delete this fieldbook memory?")) return;

    try {
      const tokens = typeof getValidTokens === "function" ? await getValidTokens() : null;
      if (tokens && tokens.idToken) {
        const response = await fetch(CONFIG.API_URL + "/memories/" + memoryId, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + tokens.idToken }
        });
        if (!response.ok) throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Fieldbook delete remote error:", error);
    }

    const next = getMemories().filter(function (entry) { return entry.id !== memoryId; });
    setMemories(next);
    localStorage.setItem("lifestack_memories", JSON.stringify(next));
    removeMeta(memoryId);

    if (typeof renderDashboard === "function") renderDashboard();
    if (typeof renderYearMemories === "function") renderYearMemories(getCurrentYearView());
    if (typeof renderMonthGrid === "function") renderMonthGrid();
    renderFieldbookShelf();
    closeViewer();
    showToastSafe("Fieldbook memory deleted");
  }

  function renderFieldbookShelf() {
    const shelf = byId("fieldbookShelf");
    if (!shelf) return;

    const list = getMemories().filter(isFieldbookMemory).sort(function (a, b) {
      return memoryTimestamp(b) - memoryTimestamp(a);
    });

    if (!list.length) {
      shelf.innerHTML = "<div class=\"fieldbook-empty\">No fieldbook pages yet. Create one to start your shared scrapbook.</div>";
      return;
    }

    shelf.innerHTML = list.map(function (memory) {
      const cover = memoryCoverUrl(memory);
      const title = memory.title || "Untitled";
      const date = formatDateLabel(memory.occurredAt || memory.createdAt) || "No date";
      const safeId = esc(memory.id);
      return "" +
        "<article class=\"fieldbook-card\" onclick=\"openFieldbookViewer('" + safeId + "')\">" +
          "<div class=\"fieldbook-card-cover\">" +
            (cover ? ("<img src=\"" + esc(cover) + "\" alt=\"cover\">") : "<div class=\"fieldbook-card-cover-empty\">No cover</div>") +
          "</div>" +
          "<div class=\"fieldbook-card-meta\">" +
            "<div class=\"fieldbook-card-title\">" + esc(title) + "</div>" +
            "<div class=\"fieldbook-card-date\">" + esc(date) + "</div>" +
            "<div class=\"fieldbook-card-actions\">" +
              "<button type=\"button\" onclick=\"event.stopPropagation();openFieldbookEditor('" + safeId + "')\">Edit</button>" +
              "<button type=\"button\" onclick=\"event.stopPropagation();openFieldbookViewer('" + safeId + "')\">View</button>" +
              "<button type=\"button\" onclick=\"event.stopPropagation();deleteFieldbookMemory('" + safeId + "')\">Delete</button>" +
            "</div>" +
          "</div>" +
        "</article>";
    }).join("");
  }

  function clearFieldbookLocation() {
    clearFieldbookLocationInternal();
  }

  function updateAutocompleteSelection(items) {
    items.forEach(function (item, index) {
      item.classList.toggle("selected", index === state.locationSelectionIndex);
    });
    if (state.locationSelectionIndex >= 0 && items[state.locationSelectionIndex]) {
      items[state.locationSelectionIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function applyLocation(name, lat, lng, placeId) {
    byId("fieldbookLocation").value = name || "";
    byId("fieldbookLat").value = lat || "";
    byId("fieldbookLng").value = lng || "";
    byId("fieldbookPlaceId").value = placeId || "";
    byId("fieldbookLocationClearBtn").style.display = "flex";
    statusText("Location selected", "success");
    hideLocationDropdown();
  }

  function selectFieldbookLocation(node) {
    if (!node) return;
    applyLocation(node.dataset.name || "", node.dataset.lat || "", node.dataset.lng || "", node.dataset.placeId || "");
  }

  async function searchLocation(query) {
    const dropdown = byId("fieldbookLocationAutocomplete");
    if (!dropdown) return;

    dropdown.innerHTML = "<div class=\"location-autocomplete-loading\">Searching...</div>";
    dropdown.classList.add("active");
    state.locationSelectionIndex = -1;

    try {
      const response = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(query) + "&limit=5", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      const items = safeArray(data && data.features);
      if (!items.length) {
        dropdown.innerHTML = "<div class=\"location-autocomplete-empty\">No locations found</div>";
        return;
      }

      dropdown.innerHTML = items.map(function (feature) {
        const props = feature.properties || {};
        const coords = safeArray(feature.geometry && feature.geometry.coordinates);
        const name = props.name || [props.city, props.state, props.country].filter(Boolean).join(", ");
        const address = [props.street, props.city, props.state, props.country].filter(Boolean).join(", ");
        return "" +
          "<div class=\"location-autocomplete-item\"" +
            " data-name=\"" + esc(name || address) + "\"" +
            " data-lat=\"" + esc(coords[1]) + "\"" +
            " data-lng=\"" + esc(coords[0]) + "\"" +
            " data-place-id=\"" + esc(props.osm_id || "") + "\"" +
            " onclick=\"selectFieldbookLocation(this)\">" +
            "<span class=\"location-autocomplete-icon\">*</span>" +
            "<div class=\"location-autocomplete-text\">" +
              "<div class=\"location-autocomplete-name\">" + esc(name || "Location") + "</div>" +
              (address ? "<div class=\"location-autocomplete-address\">" + esc(address) + "</div>" : "") +
            "</div>" +
          "</div>";
      }).join("");
    } catch (error) {
      console.error("Fieldbook location search error:", error);
      dropdown.innerHTML = "<div class=\"location-autocomplete-empty\">Search failed</div>";
    }
  }

  function handleLocationInput() {
    const query = byId("fieldbookLocation").value.trim();
    clearTimeout(state.locationSearchTimeout);
    if (query.length < 2) {
      hideLocationDropdown();
      if (!query) {
        byId("fieldbookLocationClearBtn").style.display = "none";
        statusText("");
      }
      return;
    }
    byId("fieldbookLocationClearBtn").style.display = "flex";
    state.locationSearchTimeout = setTimeout(function () {
      searchLocation(query);
    }, 280);
  }

  function handleLocationKeydown(event) {
    const dropdown = byId("fieldbookLocationAutocomplete");
    if (!dropdown) return;
    const items = Array.from(dropdown.querySelectorAll(".location-autocomplete-item"));

    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.locationSelectionIndex = Math.min(state.locationSelectionIndex + 1, items.length - 1);
      updateAutocompleteSelection(items);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.locationSelectionIndex = Math.max(state.locationSelectionIndex - 1, -1);
      updateAutocompleteSelection(items);
      return;
    }

    if (event.key === "Enter") {
      if (state.locationSelectionIndex >= 0 && items[state.locationSelectionIndex]) {
        event.preventDefault();
        items[state.locationSelectionIndex].click();
      }
      return;
    }

    if (event.key === "Escape") {
      hideLocationDropdown();
    }
  }

  function startCoverDrag(event) {
    if (!currentCoverPhoto()) return;
    event.preventDefault();
    const coords = getEventCoords(event);
    state.coverDrag = {
      x: coords.x,
      y: coords.y,
      ox: state.cover.x,
      oy: state.cover.y,
      initialDistance: null,
      initialZoom: state.cover.zoom
    };
    window.addEventListener("pointermove", onCoverDragMove, { passive: false });
    window.addEventListener("pointerup", endCoverDrag);
    window.addEventListener("touchmove", onCoverDragMove, { passive: false });
    window.addEventListener("touchend", endCoverDrag);
  }

  function onCoverDragMove(event) {
    if (!state.coverDrag) return;
    event.preventDefault();

    if (event.touches && event.touches.length === 2) {
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (state.coverDrag.initialDistance === null) {
        state.coverDrag.initialDistance = distance;
      } else {
        const scale = distance / state.coverDrag.initialDistance;
        state.cover.zoom = clamp(state.coverDrag.initialZoom * scale, 40, 260);
      }
    } else {
      const coords = getEventCoords(event);
      const dx = coords.x - state.coverDrag.x;
      const dy = coords.y - state.coverDrag.y;
      state.cover.x = clamp(state.coverDrag.ox - dx * 0.24, 0, 100);
      state.cover.y = clamp(state.coverDrag.oy - dy * 0.24, 0, 100);
    }

    renderCoverPreview();
  }

  function endCoverDrag() {
    state.coverDrag = null;
    window.removeEventListener("pointermove", onCoverDragMove);
    window.removeEventListener("pointerup", endCoverDrag);
    window.removeEventListener("touchmove", onCoverDragMove);
    window.removeEventListener("touchend", endCoverDrag);
  }

  function bindEvents() {
    if (state.bound) return;
    state.bound = true;

    const photoInput = byId("fieldbookPhotoInput");
    if (photoInput) {
      photoInput.addEventListener("change", function (event) {
        addFilesToEditor(Array.from(event.target.files || []));
        event.target.value = "";
      });
    }

    const pagePicker = byId("fieldbookPagePicker");
    if (pagePicker) {
      pagePicker.addEventListener("change", function () {
        selectPage(pagePicker.value);
      });
    }

    const canvas = byId("fieldbookCanvas");
    if (canvas) {
      canvas.addEventListener("pointerdown", function (event) {
        if (event.target === canvas) {
          state.selectedLayerId = "";
          renderEditorCanvas();
        }
      });
      canvas.addEventListener("touchstart", function (event) {
        if (event.target === canvas) {
          state.selectedLayerId = "";
          renderEditorCanvas();
        }
      }, { passive: true });
    }

    const scale = byId("fieldbookInspectorScale");
    if (scale) {
      scale.addEventListener("input", function () {
        const layer = selectedLayer();
        if (!layer || !canEditCurrentPage()) return;
        layer.scale = clamp((parseInt(scale.value, 10) || 100) / 100, 0.55, 1.9);
        renderEditorCanvas();
      });
    }

    const color = byId("fieldbookInspectorColor");
    if (color) {
      color.addEventListener("change", function () {
        const layer = selectedLayer();
        if (!layer || !canEditCurrentPage()) return;
        if (layer.type === "note") layer.paper = color.value;
        else layer.color = color.value;
        renderEditorCanvas();
      });
    }

    const variant = byId("fieldbookInspectorVariant");
    if (variant) {
      variant.addEventListener("change", function () {
        const layer = selectedLayer();
        if (!layer || !canEditCurrentPage()) return;
        layer.variant = variant.value;
        renderEditorCanvas();
      });
    }

    const text = byId("fieldbookInspectorText");
    if (text) {
      text.addEventListener("input", function () {
        const layer = selectedLayer();
        if (!layer || !canEditCurrentPage()) return;
        if (layer.type === "note" || layer.type === "sticker" || layer.type === "stamp") {
          layer.text = text.value;
          renderEditorCanvas();
        }
      });
    }

    const xSlider = byId("fieldbookCoverX");
    if (xSlider) {
      xSlider.addEventListener("input", function () {
        state.cover.x = clamp(parseInt(xSlider.value, 10) || 50, 0, 100);
        renderCoverPreview();
      });
    }
    const ySlider = byId("fieldbookCoverY");
    if (ySlider) {
      ySlider.addEventListener("input", function () {
        state.cover.y = clamp(parseInt(ySlider.value, 10) || 50, 0, 100);
        renderCoverPreview();
      });
    }
    const zSlider = byId("fieldbookCoverZoom");
    if (zSlider) {
      zSlider.addEventListener("input", function () {
        state.cover.zoom = clamp(parseInt(zSlider.value, 10) || 100, 40, 260);
        renderCoverPreview();
      });
    }

    const cover = byId("fieldbookCoverPreview");
    if (cover) {
      cover.addEventListener("pointerdown", startCoverDrag);
      cover.addEventListener("touchstart", startCoverDrag, { passive: false });
    }

    const locInput = byId("fieldbookLocation");
    if (locInput) {
      locInput.addEventListener("input", handleLocationInput);
      locInput.addEventListener("keydown", handleLocationKeydown);
    }

    document.addEventListener("click", function (event) {
      if (!event.target.closest("#fieldbookLocation") &&
          !event.target.closest("#fieldbookLocationAutocomplete") &&
          !event.target.closest("#fieldbookLocationClearBtn")) {
        hideLocationDropdown();
      }
    });
  }

  function openFieldbookEditor(memoryId) {
    openEditor(memoryId || "");
  }

  function closeFieldbookEditor() {
    closeEditor();
  }

  function openFieldbookPeoplePicker() {
    openPeoplePicker();
  }

  function closeFieldbookPeoplePicker() {
    closePeoplePicker();
  }

  function confirmFieldbookPeople() {
    confirmPeoplePicker();
  }

  function saveFieldbookMemory() {
    saveEditor();
  }

  function openFieldbookViewer(memoryId) {
    openViewer(memoryId);
  }

  function closeFieldbookViewer() {
    closeViewer();
  }

  function init() {
    bindEvents();
    renderFieldbookShelf();
  }

  window.openFieldbookEditor = openFieldbookEditor;
  window.closeFieldbookEditor = closeFieldbookEditor;
  window.openFieldbookPeoplePicker = openFieldbookPeoplePicker;
  window.closeFieldbookPeoplePicker = closeFieldbookPeoplePicker;
  window.confirmFieldbookPeople = confirmFieldbookPeople;
  window.saveFieldbookMemory = saveFieldbookMemory;
  window.openFieldbookViewer = openFieldbookViewer;
  window.closeFieldbookViewer = closeFieldbookViewer;
  window.closeFieldbookPreview = closePreview;
  window.fieldbookPreviewPage = previewPage;
  window.fieldbookToggleFinalize = toggleFinalize;
  window.fieldbookAddPage = addPage;
  window.fieldbookDeletePage = deletePage;
  window.fieldbookAddNote = addNote;
  window.fieldbookAddFromDescription = addFromDescription;
  window.fieldbookImportPhotos = importPhotosToLayer;
  window.fieldbookAddRibbon = addRibbon;
  window.fieldbookAddSticker = addSticker;
  window.fieldbookAddStamp = addStamp;
  window.fieldbookApplyTemplate = applyTemplate;
  window.fieldbookShuffle = shuffleLayers;
  window.fieldbookClearLayers = clearLayers;
  window.fieldbookRotateSelected = rotateSelected;
  window.clearFieldbookLocation = clearFieldbookLocation;
  window.selectFieldbookLocation = selectFieldbookLocation;
  window.setFieldbookCoverPhoto = setCoverPhoto;
  window.removeFieldbookPhoto = removeEditorPhoto;
  window.deleteFieldbookMemory = deleteFieldbookMemory;
  window.renderFieldbookShelf = renderFieldbookShelf;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
