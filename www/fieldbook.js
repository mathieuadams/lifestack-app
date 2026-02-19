(function () {
  const META_KEY = "lifestack_fieldbook_meta";
  const MAX_ITEMS_PER_PAGE = 9;
  const ROTATE_STEP = 5;

  const TEMPLATES = [
    { value: "freeform", label: "Freeform (drag anywhere)" },
    { value: "grid", label: "3×3 Grid (9 slots)" },
    { value: "zigzag", label: "Zigzag pattern" }
  ];

  const state = {
    seq: 1,
    editingMemoryId: "",
    editingMemoryOwnerId: "",
    editingMemoryIsShared: false,
    photos: [],
    photoDragId: "",
    photoTouchDrag: null,
    selectedPeopleIds: [],
    peopleDragId: "",
    cover: { photoId: "", x: 50, y: 50, zoom: 100 },
    pages: [],
    activePageId: "",
    selectedLayerId: "",
    drag: null,
    coverDrag: false,
    viewerMaps: [],
    activeImageLightbox: null,
    locationSelectionIndex: -1,
    locationTouch: null,
    locationSearchTimeout: null,
    currentTemplate: "freeform"
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

  function currentUserId() {
    const user = getCurrentUser();
    return user && user.id ? String(user.id) : "";
  }

  function currentUserName() {
    const user = getCurrentUser();
    return (user && (user.name || user.firstName || user.email)) ? (user.name || user.firstName || user.email) : "You";
  }

  function isMemoryOwner(memory) {
    if (!memory) return true;
    const me = normalizePersonId(currentUserId());
    if (!me) return false;
    const ownerId = normalizePersonId(memory.userId || memory.ownerId || memory.createdBy || "");
    if (ownerId) return ownerId === me;
    if (memory.isShared) return false;
    return true;
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
    releaseLocalPhotoUrls(state.photos);
    state.editingMemoryId = "";
    state.editingMemoryOwnerId = "";
    state.editingMemoryIsShared = false;
    state.photos = [];
    state.photoDragId = "";
    state.photoTouchDrag = null;
    state.selectedPeopleIds = [];
    state.peopleDragId = "";
    state.cover = { photoId: "", x: 50, y: 50, zoom: 100 };
    state.pages = [];
    state.activePageId = "";
    state.selectedLayerId = "";
    state.drag = null;
    state.viewerMaps = [];
    state.activeImageLightbox = null;
    state.currentTemplate = "freeform";
    state.locationTouch = null;
  }

  function normalizePhoto(photo, index) {
    if (!photo) return null;
    const ownerId = normalizePersonId(state.editingMemoryOwnerId || "");
    const fallbackContributorId = ownerId || normalizePersonId(state.editingMemoryIsShared ? "" : currentUserId());
    const ownerName = currentUserName();
    if (typeof photo === "string") {
      return {
        id: "remote_" + index + "_" + Date.now(),
        url: photo,
        key: "",
        file: null,
        source: "remote",
        contributorId: fallbackContributorId,
        contributorName: ownerName
      };
    }
    const url = photo.url || photo.viewUrl || "";
    if (!url) return null;
    return {
      id: "remote_" + index + "_" + Date.now(),
      url: url,
      key: photo.key || "",
      file: null,
      source: "remote",
      contributorId: normalizePersonId(photo.contributorId || photo.authorId || fallbackContributorId),
      contributorName: photo.contributorName || photo.authorName || ownerName
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
    const peopleMap = peopleByIdMap();
    node.innerHTML = state.photos.map(function (photo, index) {
      const contributorId = normalizePersonId(photo.contributorId || state.editingMemoryOwnerId || (state.editingMemoryIsShared ? "" : currentUserId()));
      const contributor = resolvePerson(contributorId, peopleMap);
      const contributorName = photo.contributorName || contributor.name || "Contributor";
      const canRemove = canRemovePhoto(photo);
      return "" +
        "<div class=\"fieldbook-photo-thumb " + (photo.id === state.cover.photoId ? "selected" : "") + "\" draggable=\"true\" data-photo-id=\"" + esc(photo.id) + "\">" +
          "<img src=\"" + esc(photo.url) + "\" alt=\"thumb\" onclick=\"setFieldbookCoverPhoto('" + esc(photo.id) + "')\">" +
          (canRemove ? "<button type=\"button\" class=\"fieldbook-photo-remove\" onclick=\"event.stopPropagation();removeFieldbookPhoto('" + esc(photo.id) + "')\">x</button>" : "") +
          "<span class=\"fieldbook-photo-order\">#" + (index + 1) + "</span>" +
          "<span class=\"fieldbook-photo-contributor\" title=\"" + esc(contributorName) + "\">" + esc(initialsFromName(contributorName)) + "</span>" +
        "</div>";
    }).join("");
    bindPhotoThumbInteractions(node);
  }

  function canRemovePhoto(photo) {
    const ownerId = normalizePersonId(state.editingMemoryOwnerId || currentUserId());
    const me = normalizePersonId(currentUserId());
    const contributorId = normalizePersonId(photo && photo.contributorId);
    if (me && ownerId && ownerId === me) return true;
    if (me && contributorId && contributorId === me) return true;
    return false;
  }

  function reorderPhotos(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const from = state.photos.findIndex(function (photo) { return photo.id === fromId; });
    const to = state.photos.findIndex(function (photo) { return photo.id === toId; });
    if (from < 0 || to < 0 || from === to) return;
    const next = state.photos.slice();
    const picked = next.splice(from, 1)[0];
    next.splice(to, 0, picked);
    state.photos = next;
    renderPhotoThumbs();
    renderCoverPreview();
  }

  function bindPhotoThumbInteractions(node) {
    if (!node) return;
    const cards = Array.from(node.querySelectorAll(".fieldbook-photo-thumb[data-photo-id]"));
    const clearDropTargets = function () {
      cards.forEach(function (entry) { entry.classList.remove("drop-target"); });
    };
    cards.forEach(function (card) {
      const id = card.dataset.photoId || "";
      if (!id) return;
      card.addEventListener("dragstart", function (event) {
        state.photoDragId = id;
        card.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", id);
        }
      });
      card.addEventListener("dragend", function () {
        state.photoDragId = "";
        card.classList.remove("dragging");
        clearDropTargets();
      });
      card.addEventListener("dragover", function (event) {
        event.preventDefault();
        card.classList.add("drop-target");
      });
      card.addEventListener("dragleave", function () {
        card.classList.remove("drop-target");
      });
      card.addEventListener("drop", function (event) {
        event.preventDefault();
        const fromId = state.photoDragId || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
        card.classList.remove("drop-target");
        reorderPhotos(fromId, id);
      });

      card.addEventListener("pointerdown", function (event) {
        if (event.pointerType !== "touch") return;
        if (event.target && event.target.closest("button")) return;
        state.photoTouchDrag = {
          id: id,
          pointerId: event.pointerId,
          targetId: id,
          startX: event.clientX,
          startY: event.clientY,
          moved: false
        };
        if (card.setPointerCapture) {
          try { card.setPointerCapture(event.pointerId); } catch (error) { /* no-op */ }
        }
      });

      card.addEventListener("pointermove", function (event) {
        const drag = state.photoTouchDrag;
        if (!drag || drag.pointerId !== event.pointerId || drag.id !== id) return;
        const dx = Math.abs(event.clientX - drag.startX);
        const dy = Math.abs(event.clientY - drag.startY);
        if (!drag.moved && dx + dy < 10) return;
        drag.moved = true;
        event.preventDefault();
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const targetCard = hit && hit.closest ? hit.closest(".fieldbook-photo-thumb[data-photo-id]") : null;
        clearDropTargets();
        if (targetCard && targetCard.dataset.photoId) {
          drag.targetId = targetCard.dataset.photoId;
          targetCard.classList.add("drop-target");
        } else {
          drag.targetId = id;
        }
      });

      const finishTouchDrag = function (event) {
        const drag = state.photoTouchDrag;
        if (!drag || drag.pointerId !== event.pointerId || drag.id !== id) return;
        clearDropTargets();
        if (drag.moved && drag.targetId && drag.targetId !== drag.id) {
          reorderPhotos(drag.id, drag.targetId);
          event.preventDefault();
        }
        state.photoTouchDrag = null;
      };
      card.addEventListener("pointerup", finishTouchDrag);
      card.addEventListener("pointercancel", finishTouchDrag);
    });
  }

  function setCoverPhoto(photoId) {
    state.cover.photoId = photoId;
    renderPhotoThumbs();
    renderCoverPreview();
    renderEditorCanvas();
  }

  function removeEditorPhoto(photoId) {
    const target = state.photos.find(function (photo) { return photo.id === photoId; }) || null;
    if (target && !canRemovePhoto(target)) {
      showErrorSafe("Only the contributor or memory owner can remove this photo");
      return;
    }
    state.photos = state.photos.filter(function (photo) { return photo.id !== photoId; });
    revokeLocalPhotoUrl(target);
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

  function createPreviewUrl(file) {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      return { url: URL.createObjectURL(file), localObjectUrl: true };
    }
    return null;
  }

  function revokeLocalPhotoUrl(photo) {
    if (!photo || !photo.localObjectUrl || !photo.url) return;
    if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
    try { URL.revokeObjectURL(photo.url); } catch (error) { /* no-op */ }
  }

  function releaseLocalPhotoUrls(photos) {
    safeArray(photos).forEach(revokeLocalPhotoUrl);
  }

  async function addFilesToEditor(files) {
    const valid = safeArray(files).filter(function (file) {
      return file && file.type && file.type.indexOf("image/") === 0;
    });

    for (const file of valid) {
      try {
        let preview = "";
        let localObjectUrl = false;
        const objectPreview = createPreviewUrl(file);
        if (objectPreview && objectPreview.url) {
          preview = objectPreview.url;
          localObjectUrl = true;
        } else {
          preview = await fileToDataUrl(file);
        }
        state.photos.push({
          id: "file_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          url: preview,
          key: "",
          file: file,
          source: "file",
          localObjectUrl: localObjectUrl,
          contributorId: currentUserId() || state.editingMemoryOwnerId,
          contributorName: currentUserName()
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
    updateAddMapButton();
  }

  function initialsFromName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "P";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }

  function normalizePersonId(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      return String(value.id || value.userId || value.friendUserId || value.odId || "").trim();
    }
    return "";
  }

  function isImageSource(value) {
    if (!value) return false;
    const text = String(value).trim();
    return /^https?:\/\//i.test(text) || /^data:image\//i.test(text) || /^blob:/i.test(text);
  }

  function avatarImageUrl(person) {
    if (!person) return "";
    if (person.avatarUrl && isImageSource(person.avatarUrl)) return String(person.avatarUrl);
    if (person.avatar && isImageSource(person.avatar)) return String(person.avatar);
    return "";
  }

  function avatarText(person) {
    if (!person) return "P";
    if (person.avatar && !isImageSource(person.avatar)) return String(person.avatar);
    return initialsFromName(person.name || "Person");
  }

  function avatarMarkup(person, className) {
    const image = avatarImageUrl(person);
    if (image) {
      return "<img src=\"" + esc(image) + "\" alt=\"" + esc(person.name || "person") + "\" class=\"" + esc(className + " " + className + "-image") + "\">";
    }
    return "<span class=\"" + esc(className) + "\">" + esc(avatarText(person)) + "</span>";
  }

  function getSelectablePeople() {
    const fromPeople = getPeopleList().map(function (person) {
      return {
        id: person.id,
        name: person.name || "Person",
        avatar: person.avatar || "",
        avatarUrl: person.avatarUrl || ""
      };
    });

    const fromFriends = getFriendList().map(function (friend) {
      const id = friend.odId || friend.friendUserId || friend.id;
      return {
        id: id,
        name: friend.name || friend.email || "Friend",
        avatar: friend.avatar || "",
        avatarUrl: friend.avatarUrl || ""
      };
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

  function peopleByIdMap() {
    const map = {};
    getSelectablePeople().forEach(function (person) {
      map[person.id] = person;
    });
    const current = getCurrentUser();
    if (current && current.id && !map[current.id]) {
      map[current.id] = {
        id: current.id,
        name: current.name || current.firstName || "You",
        avatar: current.avatar || "",
        avatarUrl: current.avatarUrl || ""
      };
    }
    return map;
  }

  function resolvePerson(personId, map) {
    const hit = map[personId];
    if (hit) return hit;
    return {
      id: personId,
      name: personId || "Person",
      avatar: "",
      avatarUrl: ""
    };
  }

  function moveSelectedPerson(personId, delta) {
    const from = state.selectedPeopleIds.indexOf(personId);
    if (from < 0) return;
    const to = clamp(from + delta, 0, state.selectedPeopleIds.length - 1);
    if (to === from) return;
    const next = state.selectedPeopleIds.slice();
    const picked = next.splice(from, 1)[0];
    next.splice(to, 0, picked);
    state.selectedPeopleIds = next;
    renderPeopleChips();
  }

  function reorderSelectedPeople(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const from = state.selectedPeopleIds.indexOf(fromId);
    const to = state.selectedPeopleIds.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = state.selectedPeopleIds.slice();
    const picked = next.splice(from, 1)[0];
    next.splice(to, 0, picked);
    state.selectedPeopleIds = next;
    renderPeopleChips();
  }

  function bindPeopleGridInteractions(node) {
    if (!node) return;
    const cards = Array.from(node.querySelectorAll(".fieldbook-person-card"));
    cards.forEach(function (card) {
      const personId = card.dataset.personId || "";
      if (!personId) return;

      const leftBtn = card.querySelector("[data-move='left']");
      const rightBtn = card.querySelector("[data-move='right']");
      if (leftBtn) {
        leftBtn.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          moveSelectedPerson(personId, -1);
        });
      }
      if (rightBtn) {
        rightBtn.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          moveSelectedPerson(personId, 1);
        });
      }

      card.addEventListener("dragstart", function (event) {
        state.peopleDragId = personId;
        card.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", personId);
        }
      });
      card.addEventListener("dragend", function () {
        state.peopleDragId = "";
        card.classList.remove("dragging");
        cards.forEach(function (entry) { entry.classList.remove("drop-target"); });
      });
      card.addEventListener("dragover", function (event) {
        event.preventDefault();
        card.classList.add("drop-target");
      });
      card.addEventListener("dragleave", function () {
        card.classList.remove("drop-target");
      });
      card.addEventListener("drop", function (event) {
        event.preventDefault();
        const fromId = state.peopleDragId || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
        card.classList.remove("drop-target");
        reorderSelectedPeople(fromId, personId);
      });
    });
  }

  function renderPeopleChips() {
    const node = byId("fieldbookPeopleGrid");
    if (!node) return;
    if (!state.selectedPeopleIds.length) {
      node.innerHTML = "<span class=\"fieldbook-person-chip\">No people selected</span>";
      return;
    }
    const map = peopleByIdMap();
    const ids = state.selectedPeopleIds.map(normalizePersonId).filter(Boolean);
    state.selectedPeopleIds = ids;
    node.innerHTML = ids.map(function (personId) {
      const person = resolvePerson(personId, map);
      return "" +
        "<article class=\"fieldbook-person-card\" data-person-id=\"" + esc(personId) + "\">" +
          "<div class=\"fieldbook-person-card-photo\">" + avatarMarkup(person, "fieldbook-person-card-avatar") + "</div>" +
          "<div class=\"fieldbook-person-card-meta\">" +
            "<div class=\"fieldbook-person-card-name\">" + esc(person.name || "Person") + "</div>" +
          "</div>" +
        "</article>";
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
            avatarMarkup(person, "fieldbook-person-avatar") +
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
    const checked = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map(function (node) {
      return normalizePersonId(node.value);
    }).filter(Boolean);
    const ordered = state.selectedPeopleIds.filter(function (id) { return checked.indexOf(id) >= 0; });
    checked.forEach(function (id) {
      if (ordered.indexOf(id) < 0) ordered.push(id);
    });
    state.selectedPeopleIds = ordered;
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

  function editorCanvasRect() {
    const canvas = byId("fieldbookCanvas");
    if (!canvas) return { width: 360, height: 420 };
    const rect = canvas.getBoundingClientRect();
    return {
      width: rect.width > 120 ? rect.width : 360,
      height: rect.height > 120 ? rect.height : 420
    };
  }

  function layerSize(type, canvasWidth) {
    const compact = canvasWidth <= 420;
    if (type === "photo") return { width: compact ? 100 : 122, height: compact ? 100 : 122 };
    if (type === "map") return { width: compact ? 180 : 210, height: compact ? 110 : 130 };
    if (type === "note") return { width: compact ? 140 : 160, height: compact ? 80 : 92 };
    return { width: 160, height: 160 };
  }

  function baseLayer(page, type) {
    const rect = editorCanvasRect();
    const size = layerSize(type, rect.width);
    const maxX = Math.max(16, Math.floor(rect.width - size.width - 16));
    const maxY = Math.max(14, Math.floor(rect.height - size.height - 16));
    return {
      id: nextId("layer"),
      type: type,
      author: userTag(),
      x: rand(16, maxX),
      y: rand(14, maxY),
      rotate: rand(-8, 8),
      scale: 1,
      z: nextZ(page)
    };
  }

  function noteLayer(page, text) {
    const layer = baseLayer(page, "note");
    layer.text = (text || "").trim() || "Add your memory note...";
    return layer;
  }

  function photoLayer(page, photo) {
    const layer = baseLayer(page, "photo");
    layer.src = photo.url;
    layer.photoId = photo.id;
    return layer;
  }

  function mapLayer(page, source) {
    const layer = baseLayer(page, "map");
    const location = source && source.location ? source.location : source;
    const lat = Number(location && location.lat);
    const lng = Number(location && location.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      layer.lat = lat;
      layer.lng = lng;
      layer.label = location.name || "Map";
      layer.src = mapUrl(lat, lng);
    }
    return layer;
  }

  function mapUrl(lat, lon, variant) {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return "";
    const zoom = variant === 1 ? 12 : 13;
    const tiles = Math.pow(2, zoom);
    const latRad = latNum * Math.PI / 180;
    const x = Math.floor(((lonNum + 180) / 360) * tiles);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2 * tiles);
    return "https://tile.openstreetmap.org/" + zoom + "/" + x + "/" + y + ".png";
  }

  function addLayer(layer) {
    const page = activePage();
    const layers = pageLayers(page);

    if (layers.length >= MAX_ITEMS_PER_PAGE) {
      showErrorSafe("Maximum " + MAX_ITEMS_PER_PAGE + " items per page");
      return;
    }

    if (layer.type === "map") {
      const hasMap = layers.some(function (l) { return l.type === "map"; });
      if (hasMap) {
        showErrorSafe("Only 1 map allowed per page");
        return;
      }
    }

    const canvas = byId("fieldbookCanvas");
    if (canvas) constrainToBounds(layer, canvas);
    layers.push(layer);
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
    empty.textContent = "Add photos, notes, or a map to get started.";
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
      if (Number.isFinite(Number(layer.lat)) && Number.isFinite(Number(layer.lng))) {
        img.addEventListener("error", function () {
          if (img.dataset.mapFallbackTried === "1") return;
          img.dataset.mapFallbackTried = "1";
          img.src = mapUrl(layer.lat, layer.lng, 1);
        });
      }
      body.appendChild(img);
      const label = document.createElement("div");
      label.className = "fieldbook-map-label";
      label.textContent = layer.label || "Map";
      body.appendChild(label);
      wrapper.appendChild(body);
      return;
    }

    if (layer.type === "note") {
      const body = document.createElement("div");
      body.className = "fieldbook-layer-note";
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

  function showLightbox(layer, memory) {
    if (!layer) return;

    const lightbox = document.createElement("div");
    lightbox.className = "fieldbook-lightbox";
    lightbox.innerHTML = "<div class=\"fieldbook-lightbox-backdrop\"></div><div class=\"fieldbook-lightbox-content\"></div>";

    const content = lightbox.querySelector(".fieldbook-lightbox-content");
    const backdrop = lightbox.querySelector(".fieldbook-lightbox-backdrop");

    const closeBtn = document.createElement("button");
    closeBtn.className = "fieldbook-lightbox-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function () {
      document.body.removeChild(lightbox);
    });
    content.appendChild(closeBtn);

    if (layer.type === "photo") {
      const img = document.createElement("img");
      img.src = layer.src;
      img.alt = "photo";
      img.className = "fieldbook-lightbox-image";
      content.appendChild(img);
    } else if (layer.type === "note") {
      const noteDiv = document.createElement("div");
      noteDiv.className = "fieldbook-lightbox-note";
      noteDiv.textContent = layer.text || "";
      content.appendChild(noteDiv);
    } else if (layer.type === "map") {
      const mapDiv = document.createElement("div");
      mapDiv.className = "fieldbook-lightbox-map";
      const img = document.createElement("img");
      img.src = layer.src.replace("size=300x190", "size=600x400");
      img.alt = "map";
      mapDiv.appendChild(img);
      const label = document.createElement("div");
      label.className = "fieldbook-lightbox-map-label";
      label.textContent = layer.label || "Map";
      mapDiv.appendChild(label);
      if (layer.lat && layer.lng) {
        const link = document.createElement("a");
        link.href = "https://www.openstreetmap.org/?mlat=" + layer.lat + "&mlon=" + layer.lng + "#map=15/" + layer.lat + "/" + layer.lng;
        link.target = "_blank";
        link.className = "fieldbook-lightbox-map-link";
        link.textContent = "View on OpenStreetMap";
        mapDiv.appendChild(link);
      }
      content.appendChild(mapDiv);
    }

    backdrop.addEventListener("click", function () {
      document.body.removeChild(lightbox);
    });

    document.body.appendChild(lightbox);
  }

  function renderCanvas(target, page, interactive) {
    if (!target || !page) return;
    target.innerHTML = "";
    target.classList.toggle("finalized", !!page.finalized && interactive);

    const isViewer = !interactive;

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
      } else if (isViewer && page.finalized) {
        wrapper.style.cursor = "pointer";
        wrapper.addEventListener("click", function (event) {
          event.stopPropagation();
          showLightbox(layer);
        });
      }
      target.appendChild(wrapper);
    });
  }

  function renderEditorCanvas() {
    ensurePages();
    renderPageControls();
    renderCanvas(byId("fieldbookCanvas"), activePage(), true);
    syncInspector();
    updateAddMapButton();
  }

  function getEventCoords(event) {
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function inputMode(event) {
    if (event && event.type && event.type.indexOf("touch") === 0) return "touch";
    return "pointer";
  }

  function startDrag(event) {
    if (event.type === "touchstart" && window.PointerEvent) return;
    if (!canEditCurrentPage()) return;
    const layer = findLayer(event.currentTarget.dataset.id);
    if (!layer) return;

    const mode = inputMode(event);
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
      initialScale: layer.scale || 1,
      mode: mode,
      pointerId: (mode === "pointer" && Number.isFinite(event.pointerId)) ? event.pointerId : null
    };

    if (mode === "pointer") {
      window.addEventListener("pointermove", onDragMove, { passive: false });
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      if (event.currentTarget.setPointerCapture && Number.isFinite(event.pointerId)) {
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) { /* no-op */ }
      }
    } else {
      window.addEventListener("touchmove", onDragMove, { passive: false });
      window.addEventListener("touchend", endDrag);
      window.addEventListener("touchcancel", endDrag);
    }
    renderEditorCanvas();
  }

  function constrainToBounds(layer, canvas) {
    if (!layer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rotation = layer.rotate || 0;
    const scale = layer.scale || 1;
    const size = layerSize(layer.type, rect.width);
    const width = size.width;
    const height = size.height;

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const boundingWidth = scaledWidth * cos + scaledHeight * sin;
    const boundingHeight = scaledWidth * sin + scaledHeight * cos;

    const padding = 10;
    const minX = -boundingWidth / 2 + padding;
    const maxX = rect.width - boundingWidth / 2 - padding;
    const minY = -boundingHeight / 2 + padding;
    const maxY = rect.height - boundingHeight / 2 - padding;

    layer.x = clamp(layer.x, minX, maxX);
    layer.y = clamp(layer.y, minY, maxY);
  }

  function onDragMove(event) {
    if (!state.drag) return;
    const mode = inputMode(event);
    if (mode !== state.drag.mode) return;
    if (mode === "pointer" && Number.isFinite(state.drag.pointerId) && Number.isFinite(event.pointerId) && event.pointerId !== state.drag.pointerId) return;
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
      layer.x = coords.x - rect.left - state.drag.offsetX;
      layer.y = coords.y - rect.top - state.drag.offsetY;
      constrainToBounds(layer, canvas);
    }

    renderCanvas(canvas, activePage(), true);
    syncInspector();
  }

  function endDrag() {
    if (!state.drag) return;
    const mode = state.drag.mode;
    state.drag = null;
    if (mode === "pointer") {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    } else {
      window.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("touchend", endDrag);
      window.removeEventListener("touchcancel", endDrag);
    }
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
    const text = byId("fieldbookInspectorText");

    if (scale) scale.value = String(Math.round((layer.scale || 1) * 100));

    if (text) {
      text.value = layer.text || "";
      text.disabled = !(layer.type === "note");
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

  function addMapFromMemory() {
    if (!canEditCurrentPage()) return;
    const draftLocation = collectLocation();
    const draftLat = Number(draftLocation && draftLocation.lat);
    const draftLng = Number(draftLocation && draftLocation.lng);
    const memory = getMemories().find(function (m) { return m.id === state.editingMemoryId; }) || null;
    const memoryLocation = memory && memory.location ? memory.location : null;
    const memoryLat = Number(memoryLocation && memoryLocation.lat);
    const memoryLng = Number(memoryLocation && memoryLocation.lng);

    const location = Number.isFinite(draftLat) && Number.isFinite(draftLng)
      ? { name: draftLocation.name || "Map", lat: draftLat, lng: draftLng, placeId: draftLocation.placeId || "" }
      : (Number.isFinite(memoryLat) && Number.isFinite(memoryLng)
          ? { name: memoryLocation.name || "Map", lat: memoryLat, lng: memoryLng, placeId: memoryLocation.placeId || "" }
          : null);

    if (!location) {
      showErrorSafe("Select a location first, then add the map");
      return;
    }
    addLayer(mapLayer(activePage(), location));
  }

  function updateAddMapButton() {
    const btn = byId("fieldbookAddMapBtn");
    if (!btn) return;
    const page = activePage();
    const hasMap = pageLayers(page).some(function (l) { return l.type === "map"; });
    const location = collectLocation();
    const hasLocation = Number.isFinite(Number(location && location.lat)) && Number.isFinite(Number(location && location.lng));
    const memory = getMemories().find(function (m) { return m.id === state.editingMemoryId; }) || null;
    const memoryHasLocation = !!(memory && memory.location && Number.isFinite(Number(memory.location.lat)) && Number.isFinite(Number(memory.location.lng)));
    const canAddMap = !hasMap && (hasLocation || memoryHasLocation);

    btn.disabled = !canAddMap;
    if (hasMap) {
      btn.textContent = "Map added (1 max)";
    } else if (!canAddMap) {
      btn.textContent = "Select location first";
    } else {
      btn.textContent = "+ Map";
    }
  }

  function rotateSelected(delta) {
    const layer = selectedLayer();
    if (!layer || !canEditCurrentPage()) return;
    layer.rotate += delta;
    renderEditorCanvas();
  }

  function applyTemplate() {
    if (!canEditCurrentPage()) return;
    const mode = state.currentTemplate;
    const page = activePage();
    const layers = pageLayers(page).slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); });
    if (!layers.length) return;
    const canvas = byId("fieldbookCanvas");
    const rect = editorCanvasRect();
    const width = Math.max(260, canvas && canvas.clientWidth ? canvas.clientWidth : rect.width);
    const height = Math.max(240, canvas && canvas.clientHeight ? canvas.clientHeight : rect.height);

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
      const contributorId = normalizePersonId(photo.contributorId || state.editingMemoryOwnerId || (state.editingMemoryIsShared ? "" : currentUserId()));
      const contributorName = photo.contributorName || currentUserName();
      if (!photo.file) {
        uploaded.push({
          id: photo.id,
          key: photo.key || "",
          url: photo.url,
          contributorId: contributorId,
          contributorName: contributorName
        });
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
        uploaded.push({
          id: photo.id,
          key: urlData.key || "",
          url: urlData.viewUrl,
          contributorId: contributorId,
          contributorName: contributorName
        });
      } catch (error) {
        console.error("Fieldbook photo upload failed:", error);
        const name = (file && file.name) ? file.name : "photo";
        throw new Error("Photo upload failed for " + name + ". Please retry.");
      }
    }

    const invalid = uploaded.find(function (item) {
      const u = String(item && item.url ? item.url : "");
      return !u || u.indexOf("blob:") === 0;
    });
    if (invalid) {
      throw new Error("Photo upload did not return a shareable URL. Please retry.");
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

  function applyTitleLock(memory) {
    const input = byId("fieldbookTitle");
    const hint = byId("fieldbookTitleLockHint");
    if (!input) return;
    const locked = !!(memory && !isMemoryOwner(memory));
    input.disabled = locked;
    if (hint) hint.classList.toggle("hidden", !locked);
  }

  function linkedMemoryIds(memory) {
    if (!memory || typeof memory !== "object") return [];
    const rawIds = [
      memory.id,
      memory.memoryId,
      memory.ownerMemoryId,
      memory.ownerRecordId,
      memory.originalMemoryId,
      memory.originalId,
      memory.sourceMemoryId,
      memory.sourceId,
      memory.parentMemoryId,
      memory.rootMemoryId,
      memory.sharedFromId,
      memory.sharedMemoryId,
      memory.masterMemoryId,
      memory.canonicalMemoryId
    ];
    const unique = [];
    rawIds.forEach(function (id) {
      const normalized = normalizePersonId(id);
      if (!normalized || unique.indexOf(normalized) >= 0) return;
      unique.push(normalized);
    });
    return unique;
  }

  function resolveWriteTargetId(existing, fallbackId) {
    const fallback = normalizePersonId(fallbackId);
    if (!existing || typeof existing !== "object") return fallback;
    const ids = linkedMemoryIds(existing);
    const existingId = normalizePersonId(existing.id);
    const preferred = ids.find(function (id) { return id && id !== existingId; });
    return preferred || existingId || fallback;
  }

  function memoriesLinked(a, bSet) {
    if (!a || !bSet || !bSet.size) return false;
    const ids = linkedMemoryIds(a);
    return ids.some(function (id) { return bSet.has(id); });
  }

  function mirrorFieldbookMemoryAcrossCopies(allMemories, savedMemory, relationSet) {
    const next = safeArray(allMemories).slice();
    const savedPhotos = safeArray(savedMemory && savedMemory.photos).map(function (photo) { return Object.assign({}, photo); });
    const savedPeople = safeArray(savedMemory && savedMemory.people);
    const savedTags = Array.from(new Set(safeArray(savedMemory && savedMemory.tags).concat(["fieldbook"])));
    const savedLocation = savedMemory && savedMemory.location ? Object.assign({}, savedMemory.location) : null;
    const savedUpdatedAt = savedMemory && savedMemory.updatedAt ? savedMemory.updatedAt : new Date().toISOString();

    next.forEach(function (memory, index) {
      if (!memory || !memoriesLinked(memory, relationSet)) return;
      next[index] = Object.assign({}, memory, {
        text: savedMemory && savedMemory.text !== undefined ? savedMemory.text : memory.text,
        photos: savedPhotos,
        people: savedPeople,
        tags: savedTags,
        location: savedLocation,
        updatedAt: savedUpdatedAt
      });
    });

    return next;
  }

  async function saveEditor() {
    const title = byId("fieldbookTitle").value.trim();
    const occurredAt = byId("fieldbookDate").value;
    const text = byId("fieldbookText").value || "";
    const memoryId = byId("fieldbookMemoryId").value || "";

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
      const writeTargetId = memoryId ? resolveWriteTargetId(existing, memoryId) : "";
      const canEditTitle = !existing || isMemoryOwner(existing);
      const effectiveTitle = canEditTitle ? title : String(existing.title || "").trim();
      if (!effectiveTitle || !occurredAt) {
        showErrorSafe("Please add title and date");
        return;
      }
      const tags = Array.from(new Set(safeArray(existing && existing.tags).concat(["fieldbook"])));
      const canEditContributors = !existing || isMemoryOwner(existing);
      const existingPeople = safeArray(existing && existing.people).map(normalizePersonId).filter(Boolean);
      const selectedPeople = state.selectedPeopleIds.map(normalizePersonId).filter(Boolean);
      const ownerUserId = normalizePersonId((existing && (existing.userId || existing.ownerId || existing.createdBy)) || state.editingMemoryOwnerId || "");
      const meUserId = normalizePersonId(currentUserId());
      const photoContributorIds = uploadedPhotos.map(function (item) {
        return normalizePersonId(item && item.contributorId);
      }).filter(Boolean);
      const payloadPeople = Array.from(new Set(
        (canEditContributors ? selectedPeople : existingPeople)
          .concat(existingPeople)
          .concat(photoContributorIds)
          .concat([ownerUserId, meUserId])
          .filter(Boolean)
      ));

      const payload = {
        title: effectiveTitle,
        occurredAt: occurredAt,
        text: text,
        tags: tags,
        year: yearOffset,
        ownerUserId: ownerUserId || null,
        planId: existing ? (existing.planId || null) : null,
        subActivity: existing ? (existing.subActivity || null) : null,
        people: payloadPeople,
        photos: uploadedPhotos.map(function (item) {
          return {
            key: item.key || "",
            url: item.url,
            contributorId: normalizePersonId(item.contributorId),
            contributorName: item.contributorName || ""
          };
        }),
        location: collectLocation()
      };

      const tokens = typeof getValidTokens === "function" ? await getValidTokens() : null;
      let savedMemory = null;

      if (memoryId) {
        if (tokens && tokens.idToken) {
          let response = await fetch(CONFIG.API_URL + "/memories/" + (writeTargetId || memoryId), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + tokens.idToken
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok && writeTargetId && writeTargetId !== memoryId) {
            response = await fetch(CONFIG.API_URL + "/memories/" + memoryId, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tokens.idToken
              },
              body: JSON.stringify(payload)
            });
          }
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

      const metaPayload = {
        pages: serializePagesWithUploadedPhotos(photoMap),
        activePageId: state.activePageId,
        template: state.currentTemplate,
        cover: {
          photoId: state.cover.photoId || "",
          url: coverUrl || "",
          x: state.cover.x,
          y: state.cover.y,
          zoom: state.cover.zoom
        },
        updatedAt: new Date().toISOString()
      };
      saveMeta(savedMemory.id, metaPayload);

      const allMemories = getMemories();
      const relationSet = new Set();
      linkedMemoryIds(savedMemory).forEach(function (id) { relationSet.add(id); });
      linkedMemoryIds(existing).forEach(function (id) { relationSet.add(id); });
      if (memoryId) relationSet.add(normalizePersonId(memoryId));
      if (writeTargetId) relationSet.add(normalizePersonId(writeTargetId));

      const savedId = normalizePersonId(savedMemory.id);
      const savedIndex = allMemories.findIndex(function (memory) { return normalizePersonId(memory && memory.id) === savedId; });
      if (savedIndex >= 0) allMemories[savedIndex] = savedMemory;
      else allMemories.push(savedMemory);

      const mirroredMemories = mirrorFieldbookMemoryAcrossCopies(allMemories, savedMemory, relationSet);
      mirroredMemories.forEach(function (memory) {
        if (!memory || !memory.id || memory.id === savedMemory.id) return;
        if (!memoriesLinked(memory, relationSet)) return;
        saveMeta(memory.id, metaPayload);
      });
      setMemories(mirroredMemories);
      localStorage.setItem("lifestack_memories", JSON.stringify(mirroredMemories));

      if (typeof renderDashboard === "function") renderDashboard();
      if (typeof renderYearMemories === "function") renderYearMemories(getCurrentYearView());
      if (typeof renderMonthGrid === "function") renderMonthGrid();
      renderFieldbookShelf();

      closeEditor();
      const viewerId = mirroredMemories.some(function (memory) { return memory && memory.id === savedMemory.id; })
        ? savedMemory.id
        : (memoryId || savedMemory.id);
      openViewer(viewerId, { fullscreen: true });
      showToastSafe("Fieldbook memory saved");
    } catch (error) {
      console.error("Fieldbook save error:", error);
      const msg = error && error.message ? error.message : "Could not save fieldbook memory";
      showErrorSafe(msg);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Finish Fieldbook";
      }
    }
  }

  function resetEditorForm() {
    resetCoreState();
    state.editingMemoryOwnerId = currentUserId();
    state.editingMemoryIsShared = false;
    ensurePages();
    byId("fieldbookMemoryId").value = "";
    byId("fieldbookEditorTitle").textContent = "Create Fieldbook Memory";
    byId("fieldbookTitle").value = "";
    byId("fieldbookDate").value = todayISO();
    byId("fieldbookText").value = "";
    byId("fieldbookTemplate").value = "freeform";
    state.currentTemplate = "freeform";
    clearFieldbookLocationInternal();
    applyTitleLock(null);
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
    byId("fieldbookTemplate").value = meta.template || "freeform";
    state.currentTemplate = meta.template || "freeform";

    state.editingMemoryId = memory.id;
    state.editingMemoryOwnerId = normalizePersonId(memory.userId || memory.ownerId || memory.createdBy || "");
    state.editingMemoryIsShared = !!memory.isShared;
    state.photos = safeArray(memory.photos).map(normalizePhoto).filter(Boolean);
    state.selectedPeopleIds = safeArray(memory.people).map(normalizePersonId).filter(Boolean);
    applyTitleLock(memory);

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
    clearTimeout(state.locationSearchTimeout);
    hideLocationDropdown();
    if (memoryId) {
      const memory = getMemories().find(function (entry) { return entry.id === memoryId; });
      hydrateEditorFromMemory(memory || null);
    } else {
      resetEditorForm();
    }
    modal.classList.add("active");
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        renderEditorCanvas();
      });
    }
  }

  function closeEditor() {
    const modal = byId("fieldbookEditorModal");
    clearTimeout(state.locationSearchTimeout);
    hideLocationDropdown();
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

  function setViewerFullscreen(enabled) {
    const modal = byId("fieldbookViewerModal");
    if (!modal) return;
    modal.classList.toggle("viewer-fullscreen", !!enabled);
  }

  function clearViewerMaps() {
    safeArray(state.viewerMaps).forEach(function (map) {
      if (!map || typeof map.remove !== "function") return;
      try { map.remove(); } catch (error) { /* no-op */ }
    });
    state.viewerMaps = [];
  }

  function closeActiveImageLightbox() {
    if (!state.activeImageLightbox || !state.activeImageLightbox.node) return;
    try {
      if (typeof state.activeImageLightbox.cleanup === "function") state.activeImageLightbox.cleanup();
    } catch (error) { /* no-op */ }
    if (state.activeImageLightbox.node.parentNode) {
      state.activeImageLightbox.node.parentNode.removeChild(state.activeImageLightbox.node);
    }
    state.activeImageLightbox = null;
  }

  function showPhotoGalleryLightbox(galleryItems, startIndex) {
    const gallery = safeArray(galleryItems).filter(function (item) {
      return item && (item.src || item.url);
    }).map(function (item) {
      return {
        src: item.src || item.url,
        label: item.label || ""
      };
    });
    if (!gallery.length) return;

    closeActiveImageLightbox();

    let index = clamp(parseInt(startIndex, 10) || 0, 0, gallery.length - 1);
    const lightbox = document.createElement("div");
    lightbox.className = "fieldbook-lightbox";
    lightbox.innerHTML = "<div class=\"fieldbook-lightbox-backdrop\"></div><div class=\"fieldbook-lightbox-content\"></div>";

    const backdrop = lightbox.querySelector(".fieldbook-lightbox-backdrop");
    const content = lightbox.querySelector(".fieldbook-lightbox-content");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "fieldbook-lightbox-close";
    closeBtn.textContent = "x";
    closeBtn.setAttribute("aria-label", "Close photo viewer");
    content.appendChild(closeBtn);

    const img = document.createElement("img");
    img.className = "fieldbook-lightbox-image";
    img.alt = "photo";
    content.appendChild(img);

    const caption = document.createElement("div");
    caption.className = "fieldbook-lightbox-caption";
    content.appendChild(caption);

    const counter = document.createElement("div");
    counter.className = "fieldbook-lightbox-counter";
    content.appendChild(counter);

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "fieldbook-lightbox-nav prev";
    prevBtn.setAttribute("aria-label", "Previous photo");
    prevBtn.textContent = "<";
    content.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "fieldbook-lightbox-nav next";
    nextBtn.setAttribute("aria-label", "Next photo");
    nextBtn.textContent = ">";
    content.appendChild(nextBtn);

    const render = function () {
      const entry = gallery[index];
      if (!entry) return;
      img.src = entry.src;
      caption.textContent = entry.label ? ("By " + entry.label) : "";
      counter.textContent = gallery.length > 1 ? ((index + 1) + " / " + gallery.length) : "";
      const showNav = gallery.length > 1;
      prevBtn.style.display = showNav ? "flex" : "none";
      nextBtn.style.display = showNav ? "flex" : "none";
    };

    const move = function (delta) {
      if (gallery.length <= 1) return;
      index = (index + delta + gallery.length) % gallery.length;
      render();
    };

    prevBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      move(-1);
    });
    nextBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      move(1);
    });

    let swipeStart = null;
    img.addEventListener("touchstart", function (event) {
      if (!event.touches || event.touches.length !== 1) return;
      swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    img.addEventListener("touchend", function (event) {
      if (!swipeStart || !event.changedTouches || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - swipeStart.x;
      const dy = event.changedTouches[0].clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) < 38 || Math.abs(dx) < Math.abs(dy)) return;
      move(dx < 0 ? 1 : -1);
    }, { passive: true });

    const onKeydown = function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeActiveImageLightbox();
      }
    };
    document.addEventListener("keydown", onKeydown);

    const close = function () {
      closeActiveImageLightbox();
    };
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    state.activeImageLightbox = {
      node: lightbox,
      cleanup: function () {
        document.removeEventListener("keydown", onKeydown);
      }
    };

    document.body.appendChild(lightbox);
    render();
  }

  function renderViewerLocationMap(target, lat, lng, label) {
    if (!target) return false;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
    if (typeof L === "undefined" || typeof L.map !== "function") return false;
    try {
      const map = L.map(target, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        tap: false
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: ["a", "b", "c"]
      }).addTo(map);
      map.setView([latNum, lngNum], 13);
      L.marker([latNum, lngNum], { title: label || "Location", keyboard: false }).addTo(map);
      state.viewerMaps.push(map);
      setTimeout(function () {
        try { map.invalidateSize(); } catch (error) { /* no-op */ }
      }, 40);
      return true;
    } catch (error) {
      console.warn("Fieldbook viewer map render failed:", error);
      return false;
    }
  }

  function openViewer(memoryId, options) {
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
    clearViewerMaps();
    closeActiveImageLightbox();

    if (title) title.textContent = memory.title || "Fieldbook";
    if (date) date.textContent = formatDateLabel(memory.occurredAt || memory.createdAt);

    content.innerHTML = "";
    const layout = document.createElement("div");
    layout.className = "fieldbook-simple-view";

    const top = document.createElement("section");
    top.className = "fieldbook-simple-top";

    const peopleMap = peopleByIdMap();
    const ownerId = normalizePersonId(memory.userId || memory.ownerId || memory.createdBy);
    const ownerPerson = resolvePerson(ownerId, peopleMap);

    const desc = document.createElement("p");
    desc.className = "fieldbook-simple-description";
    desc.textContent = (memory.text || "").trim() || "No description yet.";
    top.appendChild(desc);

    const byline = document.createElement("div");
    byline.className = "fieldbook-simple-byline";
    byline.textContent = "Text by " + (ownerPerson.name || "Owner");
    top.appendChild(byline);

    const location = memory.location || {};
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (hasCoords || location.name) {
      const mapCard = document.createElement("div");
      mapCard.className = "fieldbook-simple-map-card";
      if (hasCoords) {
        const mapNode = document.createElement("div");
        mapNode.className = "fieldbook-simple-map-canvas";
        mapCard.appendChild(mapNode);
        if (!renderViewerLocationMap(mapNode, lat, lng, location.name || "Location")) {
          const mapImg = document.createElement("img");
          mapImg.className = "fieldbook-simple-map-image";
          mapImg.src = mapUrl(lat, lng);
          mapImg.alt = location.name || "map";
          mapImg.addEventListener("error", function () {
            mapImg.remove();
            const mapEmpty = document.createElement("div");
            mapEmpty.className = "fieldbook-simple-map-empty";
            mapEmpty.textContent = "Map preview unavailable";
            mapCard.insertBefore(mapEmpty, mapCard.firstChild);
          });
          mapCard.insertBefore(mapImg, mapCard.firstChild);
        }
      } else {
        const mapEmpty = document.createElement("div");
        mapEmpty.className = "fieldbook-simple-map-empty";
        mapEmpty.textContent = "No map coordinates available";
        mapCard.appendChild(mapEmpty);
      }

      const mapLabel = document.createElement("div");
      mapLabel.className = "fieldbook-simple-map-label";
      mapLabel.textContent = location.name || "Location";
      mapCard.appendChild(mapLabel);
      top.appendChild(mapCard);
    }
    layout.appendChild(top);

    const photosSection = document.createElement("section");
    photosSection.className = "fieldbook-simple-photos";
    const photosHeading = document.createElement("h3");
    photosHeading.textContent = "Photos";
    photosSection.appendChild(photosHeading);

    const photos = safeArray(memory.photos);
    if (!photos.length) {
      const emptyPhotos = document.createElement("p");
      emptyPhotos.className = "fieldbook-simple-empty";
      emptyPhotos.textContent = "No photos yet.";
      photosSection.appendChild(emptyPhotos);
    } else {
      const galleryItems = [];
      photos.forEach(function (photo) {
        const photoUrl = photo && (photo.url || photo.viewUrl) ? (photo.url || photo.viewUrl) : "";
        if (!photoUrl) return;
        const pid = normalizePersonId(photo.contributorId || photo.authorId || ownerId);
        const person = resolvePerson(pid, peopleMap);
        const label = photo.contributorName || person.name || "Contributor";
        galleryItems.push({ src: photoUrl, label: label });
      });

      const gallery = document.createElement("div");
      gallery.className = "fieldbook-view-photo-grid";
      galleryItems.forEach(function (entry, index) {
        const photoUrl = entry.src;
        const label = entry.label;

        const card = document.createElement("article");
        card.className = "fieldbook-view-photo-card";

        const img = document.createElement("img");
        img.className = "fieldbook-view-photo-image";
        img.src = photoUrl;
        img.alt = "photo " + (index + 1);
        card.appendChild(img);

        const meta = document.createElement("div");
        meta.className = "fieldbook-view-photo-meta";
        meta.textContent = "By " + label;
        card.appendChild(meta);
        card.addEventListener("click", function () {
          showPhotoGalleryLightbox(galleryItems, index);
        });

        gallery.appendChild(card);
      });
      if (gallery.childNodes.length) photosSection.appendChild(gallery);
    }
    layout.appendChild(photosSection);

    const peopleSection = document.createElement("section");
    peopleSection.className = "fieldbook-simple-people";
    const heading = document.createElement("h3");
    heading.textContent = "Contributors";
    peopleSection.appendChild(heading);

    const peopleIds = safeArray(memory.people).map(normalizePersonId).filter(Boolean);
    if (!peopleIds.length) {
      const empty = document.createElement("p");
      empty.className = "fieldbook-simple-empty";
      empty.textContent = "No contributors added yet.";
      peopleSection.appendChild(empty);
    } else {
      const grid = document.createElement("div");
      grid.className = "fieldbook-contributor-grid";
      peopleIds.forEach(function (personId) {
        const person = resolvePerson(personId, peopleMap);
        const card = document.createElement("article");
        card.className = "fieldbook-contributor-card";

        const photo = document.createElement("div");
        photo.className = "fieldbook-contributor-photo";
        photo.innerHTML = avatarMarkup(person, "fieldbook-contributor-avatar");
        card.appendChild(photo);

        const name = document.createElement("div");
        name.className = "fieldbook-contributor-name";
        name.textContent = person.name || "Person";
        card.appendChild(name);

        grid.appendChild(card);
      });
      peopleSection.appendChild(grid);
    }

    layout.appendChild(peopleSection);
    content.appendChild(layout);

    const fullscreen = !options || options.fullscreen !== false;
    setViewerFullscreen(fullscreen);

    modal.classList.add("active");
  }

  function closeViewer() {
    const modal = byId("fieldbookViewerModal");
    closeActiveImageLightbox();
    clearViewerMaps();
    setViewerFullscreen(false);
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
    if (!isMemoryOwner(memory)) {
      showErrorSafe("Only the memory owner can delete this fieldbook");
      return;
    }
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
      const canDelete = isMemoryOwner(memory);
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
              (canDelete ? ("<button type=\"button\" onclick=\"event.stopPropagation();deleteFieldbookMemory('" + safeId + "')\">Delete</button>") : "<button type=\"button\" disabled title=\"Only owner can delete\">Delete</button>") +
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
    updateAddMapButton();
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
      const response = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(query) + "&limit=6", {
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
            " role=\"button\" tabindex=\"0\"" +
            " data-name=\"" + esc(name || address) + "\"" +
            " data-lat=\"" + esc(coords[1]) + "\"" +
            " data-lng=\"" + esc(coords[0]) + "\"" +
            " data-place-id=\"" + esc(props.osm_id || "") + "\">" +
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
    byId("fieldbookLat").value = "";
    byId("fieldbookLng").value = "";
    byId("fieldbookPlaceId").value = "";
    updateAddMapButton();
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
        selectFieldbookLocation(items[state.locationSelectionIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      hideLocationDropdown();
    }
  }

  function startCoverDrag(event) {
    if (event.type === "touchstart" && window.PointerEvent) return;
    if (!currentCoverPhoto()) return;
    const mode = inputMode(event);
    event.preventDefault();
    const coords = getEventCoords(event);
    state.coverDrag = {
      x: coords.x,
      y: coords.y,
      ox: state.cover.x,
      oy: state.cover.y,
      initialDistance: null,
      initialZoom: state.cover.zoom,
      mode: mode,
      pointerId: (mode === "pointer" && Number.isFinite(event.pointerId)) ? event.pointerId : null
    };
    if (mode === "pointer") {
      window.addEventListener("pointermove", onCoverDragMove, { passive: false });
      window.addEventListener("pointerup", endCoverDrag);
      window.addEventListener("pointercancel", endCoverDrag);
    } else {
      window.addEventListener("touchmove", onCoverDragMove, { passive: false });
      window.addEventListener("touchend", endCoverDrag);
      window.addEventListener("touchcancel", endCoverDrag);
    }
  }

  function onCoverDragMove(event) {
    if (!state.coverDrag) return;
    const mode = inputMode(event);
    if (mode !== state.coverDrag.mode) return;
    if (mode === "pointer" && Number.isFinite(state.coverDrag.pointerId) && Number.isFinite(event.pointerId) && event.pointerId !== state.coverDrag.pointerId) return;
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
    if (!state.coverDrag) return;
    const mode = state.coverDrag.mode;
    state.coverDrag = null;
    if (mode === "pointer") {
      window.removeEventListener("pointermove", onCoverDragMove);
      window.removeEventListener("pointerup", endCoverDrag);
      window.removeEventListener("pointercancel", endCoverDrag);
    } else {
      window.removeEventListener("touchmove", onCoverDragMove);
      window.removeEventListener("touchend", endCoverDrag);
      window.removeEventListener("touchcancel", endCoverDrag);
    }
  }

  function handleTemplateChange() {
    const select = byId("fieldbookTemplate");
    if (!select) return;
    state.currentTemplate = select.value;
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

    const text = byId("fieldbookInspectorText");
    if (text) {
      text.addEventListener("input", function () {
        const layer = selectedLayer();
        if (!layer || !canEditCurrentPage()) return;
        if (layer.type === "note") {
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

    const locDropdown = byId("fieldbookLocationAutocomplete");
    if (locDropdown) {
      const pickLocation = function (event) {
        const item = event.target.closest(".location-autocomplete-item");
        if (!item) return;
        event.preventDefault();
        event.stopPropagation();
        selectFieldbookLocation(item);
      };
      const onDropdownTouchStart = function (event) {
        const item = event.target.closest(".location-autocomplete-item");
        if (!item || !event.touches || !event.touches.length) return;
        state.locationTouch = {
          id: item.dataset.placeId || item.dataset.name || "",
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      };
      const onDropdownTouchEnd = function (event) {
        if (!state.locationTouch || !event.changedTouches || !event.changedTouches.length) return;
        const touch = event.changedTouches[0];
        const dx = Math.abs(touch.clientX - state.locationTouch.x);
        const dy = Math.abs(touch.clientY - state.locationTouch.y);
        const hit = document.elementFromPoint(touch.clientX, touch.clientY);
        const item = hit && hit.closest ? hit.closest(".location-autocomplete-item") : null;
        const touchId = item ? (item.dataset.placeId || item.dataset.name || "") : "";
        const shouldSelect = !!item && dx < 14 && dy < 14 && touchId === state.locationTouch.id;
        state.locationTouch = null;
        if (!shouldSelect) return;
        event.preventDefault();
        event.stopPropagation();
        selectFieldbookLocation(item);
      };
      locDropdown.addEventListener("click", pickLocation);
      locDropdown.addEventListener("touchstart", onDropdownTouchStart, { passive: true });
      locDropdown.addEventListener("touchend", onDropdownTouchEnd, { passive: false });
    }

    const templateSelect = byId("fieldbookTemplate");
    if (templateSelect) {
      templateSelect.addEventListener("change", handleTemplateChange);
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

  if (typeof window.switchFieldbookMemView !== "function") {
    let fallbackMemMap = null;

    const fallbackBuildMemYearGrid = function (targetId) {
      const grid = byId(targetId || "fieldbookMemYearGrid");
      if (!grid) return;
      const list = (typeof memories !== "undefined" && Array.isArray(memories)) ? memories : [];
      const year = (typeof currentViewYear !== "undefined" && Number.isFinite(Number(currentViewYear)))
        ? Number(currentViewYear)
        : new Date().getFullYear();
      const months = ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];

      grid.innerHTML = "";
      months.forEach(function (monthName, monthIndex) {
        const monthMemories = list.filter(function (entry) {
          const parsed = entry && entry.occurredAt ? new Date(entry.occurredAt) : null;
          return parsed &&
            !Number.isNaN(parsed.getTime()) &&
            parsed.getFullYear() === year &&
            parsed.getMonth() === monthIndex &&
            fallbackIsFieldbookMemory(entry);
        });
        const photos = monthMemories.reduce(function (acc, entry) {
          return acc.concat(safeArray(entry && entry.photos));
        }, []);
        const card = document.createElement("div");
        card.className = "mem-month-card";
        card.innerHTML =
          "<div class=\"mem-month-name\">" + esc(monthName.slice(0, 3)) + "</div>" +
          "<div class=\"mem-month-count\">" + monthMemories.length + " memor" + (monthMemories.length === 1 ? "y" : "ies") + "</div>" +
          (photos.length
            ? ("<div class=\"mem-month-photos\">" +
              photos.slice(0, 3).map(function (photo) {
                const url = photo && photo.url ? photo.url : "";
                return url ? ("<img src=\"" + esc(url) + "\" alt=\"\" class=\"mem-month-thumb\">") : "";
              }).join("") +
              "</div>")
            : "");
        if (monthMemories.length) {
          card.style.cursor = "pointer";
          card.addEventListener("click", function () {
            const first = monthMemories[0];
            if (!first) return;
            if (typeof window.openFieldbookViewer === "function") {
              window.openFieldbookViewer(first.id);
              return;
            }
            openViewer(first.id, { fullscreen: true });
          });
        }
        grid.appendChild(card);
      });
    };

    const fallbackIsFieldbookMemory = function (entry) {
      if (!entry || !entry.id) return false;
      const tags = safeArray(entry.tags).map(function (tag) { return String(tag || "").toLowerCase(); });
      if (tags.indexOf("fieldbook") >= 0) return true;
      try {
        const raw = localStorage.getItem(META_KEY);
        if (!raw) return false;
        const store = JSON.parse(raw);
        return !!(store && typeof store === "object" && store[entry.id]);
      } catch (error) {
        return false;
      }
    };

    const fallbackBuildMemMap = function (containerId, listId) {
      const container = byId(containerId || "fieldbookMemMapContainer");
      const listNode = byId(listId || "fieldbookMemMapList");
      if (!container) return;
      const mems = ((typeof memories !== "undefined" && Array.isArray(memories)) ? memories : []).filter(function (entry) {
        const lat = Number(entry && entry.location && entry.location.lat);
        const lng = Number(entry && entry.location && entry.location.lng);
        return Number.isFinite(lat) && Number.isFinite(lng) && fallbackIsFieldbookMemory(entry);
      });

      if (fallbackMemMap && typeof fallbackMemMap.remove === "function") {
        try { fallbackMemMap.remove(); } catch (error) { /* no-op */ }
        fallbackMemMap = null;
      }

      container.style.height = "300px";
      if (!mems.length) {
        container.innerHTML = "<p style=\"color:var(--text-tertiary);text-align:center;padding:40px 0\">No geotagged memories yet</p>";
        if (listNode) listNode.innerHTML = "";
        return;
      }
      if (typeof L === "undefined" || typeof L.map !== "function") {
        container.innerHTML = "<p style=\"color:var(--text-tertiary);text-align:center;padding:40px 0\">Map unavailable</p>";
        return;
      }

      const first = mems[0];
      fallbackMemMap = L.map(container).setView([Number(first.location.lat), Number(first.location.lng)], 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" }).addTo(fallbackMemMap);

      const bounds = [];
      mems.forEach(function (entry) {
        const lat = Number(entry.location.lat);
        const lng = Number(entry.location.lng);
        bounds.push([lat, lng]);
        L.marker([lat, lng]).addTo(fallbackMemMap)
          .bindPopup("<b>" + esc(entry.title || "Memory") + "</b><br>" + esc(entry.location.name || ""));
      });
      if (bounds.length > 1) fallbackMemMap.fitBounds(bounds, { padding: [30, 30] });

      if (!listNode) return;
      listNode.innerHTML = mems.map(function (entry) {
        return "<div class=\"mem-map-item\" style=\"cursor:pointer\"><span class=\"mem-map-pin\">📍</span><div class=\"mem-map-info\"><div class=\"mem-map-title\">" +
          esc(entry.title || "Memory") +
          "</div><div class=\"mem-map-date\">" + esc((entry.location && entry.location.name) || "") +
          "</div></div></div>";
      }).join("");
      Array.from(listNode.querySelectorAll(".mem-map-item")).forEach(function (node, index) {
        node.addEventListener("click", function () {
          const entry = mems[index];
          if (!entry) return;
          if (typeof window.openFieldbookViewer === "function") {
            window.openFieldbookViewer(entry.id);
            return;
          }
          openViewer(entry.id, { fullscreen: true });
        });
      });
    };

    window.switchFieldbookMemView = function (view, btn) {
      document.querySelectorAll(".fieldbook-mem-tab").forEach(function (tab) { tab.classList.remove("active"); });
      if (btn && btn.classList) btn.classList.add("active");

      const shelf = byId("fieldbookShelfView");
      const yearly = byId("fieldbookYearlyView");
      const map = byId("fieldbookMapView");
      if (shelf) shelf.style.display = view === "fieldbook" ? "block" : "none";
      if (yearly) yearly.style.display = view === "yearly" ? "block" : "none";
      if (map) map.style.display = view === "map" ? "block" : "none";

      if (view === "fieldbook") {
        if (typeof renderFieldbookShelf === "function") renderFieldbookShelf();
        return;
      }
      if (view === "yearly") {
        if (typeof buildMemYearGrid === "function") {
          try { buildMemYearGrid("fieldbookMemYearGrid"); return; } catch (error) { /* fallback */ }
        }
        fallbackBuildMemYearGrid("fieldbookMemYearGrid");
        return;
      }
      if (view === "map") {
        if (typeof buildMemMap === "function") {
          try { buildMemMap("fieldbookMemMapContainer", "fieldbookMemMapList"); return; } catch (error) { /* fallback */ }
        }
        fallbackBuildMemMap("fieldbookMemMapContainer", "fieldbookMemMapList");
      }
    };
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
  window.fieldbookAddMap = addMapFromMemory;
  window.fieldbookApplyTemplate = applyTemplate;
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
