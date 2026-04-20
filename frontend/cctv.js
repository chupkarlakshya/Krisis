// ── Auth ──────────────────────────────────────────────────────────────────────
if (!localStorage.getItem("ecg_auth_token")) {
  window.location.href = "./login.html";
}

// ── Config ────────────────────────────────────────────────────────────────────
const API = (localStorage.getItem("ecg-api-base") || "/api").replace(/\/$/, "");
const VISION = "/visionapi";

// Interval between frame analysis posts per camera (ms)
// 6 cameras staggered over this window → one request every (ANALYSIS_INTERVAL/6) ms
const ANALYSIS_INTERVAL = 2500;

// Canvas used for frame capture (hidden element in HTML)
const canvas = document.getElementById("analyzeCanvas");
const ctx = canvas.getContext("2d");

// Default camera list — overridden by camera registry in localStorage
const DEFAULT_CAMERAS = [
  { camera_id: "cam-01", location: "Lobby", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
  { camera_id: "cam-02", location: "Reception", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
  { camera_id: "cam-03", location: "Kitchen", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
  { camera_id: "cam-04", location: "Corridor A", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
  { camera_id: "cam-05", location: "Banquet Hall", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
  { camera_id: "cam-06", location: "Stairwell", source: "0", confidence: 0.45, model_path: "vision/models/best.pt" },
];

// ── Module state ──────────────────────────────────────────────────────────────
let webcamStream = null;   // shared getUserMedia stream
let webcamRequested = false;  // prevent duplicate getUserMedia calls
let statusBusy = false;  // debounce status refresh

// Per-camera timers for the analysis loop
const analysisTimers = {};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $grid = document.getElementById("grid");
const $banner = document.getElementById("banner");
const $bannerT = document.getElementById("bannerText");
const $status = document.getElementById("chipStatus");

document.getElementById("btnRefresh").addEventListener("click", () => refreshStatus());

document.getElementById("btnWebcam").addEventListener("click", () => {
  const reg = {};
  DEFAULT_CAMERAS.forEach(c => {
    reg[c.camera_id] = { ...c, source: "0" };
  });
  localStorage.setItem("ecg-camera-registry", JSON.stringify(reg));
  window.location.reload();
});

document.getElementById("btnVideos").addEventListener("click", () => {
  localStorage.removeItem("ecg-camera-registry");
  window.location.reload();
});

// ── Drawer & Library ────────────────────────────────────────────────────────
const $drawer      = document.getElementById("drawer");
const $mediaList    = document.getElementById("mediaList");
const $libraryPath  = document.getElementById("libraryPath");

let selectedMediaPath = null;

document.getElementById("btnLibrary").addEventListener("click", () => {
  $drawer.classList.add("open");
  if ($mediaList.children.length <= 1) scanMedia(); // auto-scan on first open
});

document.getElementById("btnCloseDrawer").addEventListener("click", () => {
  $drawer.classList.remove("open");
});

document.getElementById("btnScan").addEventListener("click", () => scanMedia());

async function scanMedia() {
  const path = $libraryPath.value.trim() || "frontend/demo";
  $mediaList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--muted); font-size:11px;">Scanning...</div>`;
  
  try {
    const data = await fetchJSON(`${VISION}/media/list?path=${encodeURIComponent(path)}`);
    if (!data?.ok) throw new Error(data?.error || "Scan failed");
    
    if (data.files.length === 0) {
      $mediaList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--muted); font-size:11px;">No videos found in this folder.</div>`;
      return;
    }
    
    $mediaList.innerHTML = data.files.map(f => `
      <div class="media-item" onclick="selectMedia('${esc(f.path)}', this)">
        <span class="name">${esc(f.name)}</span>
        <span class="path">${esc(f.path)}</span>
      </div>
    `).join("");
  } catch (err) {
    $mediaList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--red); font-size:11px;">Error: ${esc(err.message)}</div>`;
  }
}

window.selectMedia = (path, el) => {
  // Clear previous selection
  document.querySelectorAll(".media-item").forEach(item => item.style.borderColor = "");
  
  selectedMediaPath = path;
  el.style.borderColor = "var(--accent)";
  el.style.background = "rgba(232, 93, 38, 0.1)";
  
  // Flash the grid to show it's ready for assignment
  $grid.style.transition = "outline 0.3s";
  $grid.style.outline = "2px dashed var(--accent)";
  setTimeout(() => $grid.style.outline = "", 1000);
};

// Global click listener to handle camera assignment
document.addEventListener("click", (e) => {
  if (!selectedMediaPath) return;
  
  const camCard = e.target.closest(".cam");
  if (camCard) {
    const camId = camCard.dataset.cameraId;
    assignCameraSource(camId, selectedMediaPath);
    
    // Clear selection
    selectedMediaPath = null;
    document.querySelectorAll(".media-item").forEach(item => {
      item.style.borderColor = "";
      item.style.background = "";
    });
  }
});

function assignCameraSource(camId, source) {
  const reg = JSON.parse(localStorage.getItem("ecg-camera-registry") || "{}");
  // Ensure we have the base config from DEFAULT_CAMERAS if not in registry
  if (!reg[camId]) {
    const def = DEFAULT_CAMERAS.find(c => c.camera_id === camId);
    reg[camId] = { ...def };
  }
  
  reg[camId].source = source;
  localStorage.setItem("ecg-camera-registry", JSON.stringify(reg));
  
  // Instant feedback: reload the feed for this camera
  window.location.reload(); // Simplest way to re-wire everything safely
}

async function triggerPanic(camId, location) {
  if (!confirm(`Trigger EMERGENCY protocol for ${location}?`)) return;
  
  const payload = {
    trigger_id: `manual-${Date.now()}`,
    location: location,
    trigger_type: "panic_button",
    notes: `Manual panic trigger from CCTV Wall (Camera ${camId})`
  };
  
  try {
    const res = await fetch(`${API}/ingest/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.accepted) {
      alert("EMERGENCY SIGNAL SENT. Command dashboard notified.");
      refreshStatus(); // refresh UI to show the alert immediately
    } else {
      throw new Error(data.error || "Request rejected");
    }
  } catch (err) {
    console.error("Panic trigger failed:", err);
    alert("FAILED to send emergency signal. Check network connection.");
  }
}
window.triggerPanic = triggerPanic;

async function resolveIncident(location) {
  try {
    const res = await fetch(`${API}/incidents/${encodeURIComponent(location)}/resolve`, {
      method: "POST"
    });
    const data = await res.json();
    if (data.ok) {
      refreshStatus(); // refresh UI immediately
    }
  } catch (err) {
    console.error("Resolution failed:", err);
  }
}
window.resolveIncident = resolveIncident;

// ── Boot ──────────────────────────────────────────────────────────────────────
buildGrid();          // build card DOM immediately (sync)
wireFeeds();          // attach video sources (sync where possible, async for webcam)
refreshStatus();      // first badge + banner update
setInterval(refreshStatus, 12_000);  // periodic status poll

// =============================================================================
// 1. BUILD CARD SKELETONS
// Runs once. Creates the 6 (or N) card elements with placeholder content.
// =============================================================================
function buildGrid() {
  const cameras = loadRegistry();
  $grid.innerHTML = cameras.map(cam => `
    <div class="cam" id="cam-${esc(cam.camera_id)}"
         data-location="${esc(cam.location)}"
         data-camera-id="${esc(cam.camera_id)}"
         data-ai="0" data-sending="0">

      <div class="cam-head">
        <div>
          <div class="cam-id">${esc(cam.camera_id)}</div>
          <div class="cam-loc">${esc(cam.location)}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn-clear" onclick="resolveIncident('${esc(cam.location)}')">✅ Clear</button>
          <button class="btn-panic" onclick="triggerPanic('${esc(cam.camera_id)}', '${esc(cam.location)}')">🚨 PANIC</button>
          <span class="cam-badge clear" id="badge-${esc(cam.camera_id)}">CLEAR</span>
        </div>
      </div>

      <div class="cam-feed" id="feed-${esc(cam.camera_id)}">
        <div class="cam-placeholder" id="ph-${esc(cam.camera_id)}">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Connecting…</span>
        </div>
        <div class="cam-overlay"></div>
        <div class="cam-alert-chip">⚠ Alert</div>
        <div class="cam-alert-msg" id="msg-${esc(cam.camera_id)}"><span>FIRE DETECTED</span></div>
        <div class="ai-pip">AI ON</div>
        <div class="send-pip">Sending…</div>
      </div>

      <div class="cam-meta">
        <span class="cam-meta-l">${esc(cam.source === "0" ? "Webcam" : cam.source)}</span>
        <span class="cam-meta-r" id="signal-${esc(cam.camera_id)}">—</span>
      </div>
    </div>
  `).join("");
}

// =============================================================================
// 2. WIRE FEEDS
// Attaches video elements to each card. MP4s are attached immediately.
// Webcam is acquired once and shared across all webcam-source cameras.
// After a feed is ready, starts the frame analysis loop for that camera.
// =============================================================================
async function wireFeeds() {
  const cameras = loadRegistry();

  // Determine if any camera needs the webcam
  const needsWebcam = cameras.some(c => isWebcam(c.source));

  if (needsWebcam && !webcamRequested) {
    webcamRequested = true;
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        console.warn("[cctv] getUserMedia failed:", err.message);
        webcamStream = null;
      }
    }
  }

  cameras.forEach((cam, index) => {
    const feedEl = document.getElementById(`feed-${cam.camera_id}`);
    const phEl = document.getElementById(`ph-${cam.camera_id}`);
    if (!feedEl) return;

    let videoEl;

    if (isWebcam(cam.source)) {
      // ── Webcam path ──────────────────────────────────────────────────────
      if (!webcamStream) {
        // getUserMedia failed — leave placeholder
        if (phEl) phEl.querySelector("span").textContent = "Camera unavailable";
        return;
      }
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.srcObject = webcamStream;
      videoEl.onloadeddata = () => phEl?.remove();

    } else {
      // ── MP4 / file path ──────────────────────────────────────────────────
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      const src = resolveVideoSrc(cam.source);
      videoEl.src = src ?? "";
      if (!src) {
        if (phEl) phEl.querySelector("span").textContent = "Invalid source";
        return;
      }
      videoEl.onloadeddata = () => phEl?.remove();
      videoEl.onerror = () => {
        if (phEl) phEl.querySelector("span").textContent = "Video not found";
      };
    }

    // Insert BEFORE the overlay divs so it sits behind them in the feed
    feedEl.insertBefore(videoEl, feedEl.firstChild);

    // Start AI analysis loop for this camera, staggered so all 6 don't fire at once
    const stagger = index * Math.floor(ANALYSIS_INTERVAL / DEFAULT_CAMERAS.length);
    setTimeout(() => startAnalysisLoop(cam, videoEl), stagger);
  });
}

// =============================================================================
// 3. FRAME ANALYSIS LOOP  (Option A core)
// Every ANALYSIS_INTERVAL ms:
//   a. Draw a 320×240 frame from the <video> onto the shared canvas
//   b. Export as JPEG blob
//   c. POST to /visionapi/analyze-frame
//   d. For each detection, POST to /api/ingest/detection
// =============================================================================
function startAnalysisLoop(cam, videoEl) {
  async function tick() {
    // Only analyze if video has actual content
    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      const cardEl = document.getElementById(`cam-${cam.camera_id}`);

      // Show "Sending…" pip
      if (cardEl) cardEl.dataset.sending = "1";

      try {
        // Capture frame
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const blob = await canvasToJpeg(canvas, 0.75);

        // POST frame to vision service
        const url = `${VISION}/analyze-frame`
          + `?camera_id=${encodeURIComponent(cam.camera_id)}`
          + `&location=${encodeURIComponent(cam.location)}`
          + `&confidence=${cam.confidence ?? 0.45}`
          + `&model_path=${encodeURIComponent(cam.model_path ?? "vision/models/best.pt")}`;

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        if (resp.ok) {
          const data = await resp.json();

          // Show AI pip when the service responds
          if (cardEl) cardEl.dataset.ai = "1";

          // For each detection, report to the backend
          for (const det of (data.detections || [])) {
            console.log(`[cctv] Reporting ${det.label} (${det.confidence}) at ${cam.location}`);
            fetch(`${API}/ingest/detection`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                camera_id: cam.camera_id,
                location: cam.location,
                label: det.label,
                confidence: det.confidence,
              }),
            }).then(r => {
              if (!r.ok) console.warn("[cctv] Backend rejected detection:", r.status);
            }).catch(e => console.error("[cctv] Ingestion failed:", e));
          }
        }
      } catch (_) {
        // Vision service may be offline — silently ignore
        if (cardEl) cardEl.dataset.ai = "0";
      } finally {
        if (cardEl) cardEl.dataset.sending = "0";
      }
    }

    // Schedule next tick
    analysisTimers[cam.camera_id] = setTimeout(tick, ANALYSIS_INTERVAL);
  }

  tick();
}

// =============================================================================
// 4. STATUS REFRESH (runs every 12s)
// Only updates badges, banner text, and signal lines.
// Does NOT touch video elements.
// =============================================================================
async function refreshStatus() {
  if (statusBusy) return;
  statusBusy = true;
  $status.textContent = "Refreshing…";

  try {
    const incidents = await fetchJSON(`${API}/incidents/active`) ?? [];

    const alertZones = new Set(
      incidents
        .filter(i => ["fire", "warning", "medical", "security"].includes(i.type))
        .map(i => i.location)
    );

    // Banner
    if (!alertZones.size) {
      $banner.className = "";
      $bannerT.textContent = "All zones clear — no active incidents.";
    } else {
      const top = incidents.find(i => alertZones.has(i.location));
      $banner.className = "alert";
      $bannerT.textContent = `⚠ ALERT — ${[...alertZones].join(", ")}${top ? `: ${top.summary}` : ""}`;
    }

    // Per-card badges
    loadRegistry().forEach(cam => {
      const card = document.getElementById(`cam-${cam.camera_id}`);
      const badge = document.getElementById(`badge-${cam.camera_id}`);
      const signal = document.getElementById(`signal-${cam.camera_id}`);
      if (!card) return;

      const isAlert = alertZones.has(cam.location);
      const incident = incidents.find(i => i.location === cam.location);
      const msg = document.getElementById(`msg-${cam.camera_id}`);

      card.classList.toggle("alert", isAlert);
      badge.className = `cam-badge ${isAlert ? "caution" : "clear"}`;
      
      if (isAlert && incident) {
        if (incident.source === "manual") {
          badge.textContent = "EMERGENCY";
          if (msg) msg.querySelector("span").textContent = "PANIC BUTTON PRESSED";
        } else {
          badge.textContent = incident.type.toUpperCase();
          if (msg) msg.querySelector("span").textContent = `${incident.type.toUpperCase()} DETECTED`;
        }
      } else {
        badge.textContent = "CLEAR";
        if (msg) msg.querySelector("span").textContent = "";
      }

      if (signal) {
        if (incident) {
          signal.innerHTML = `<strong style="color:#f87171">${esc(incident.type)} · ${esc(incident.severity)}</strong>`;
        } else {
          signal.textContent = "No signal";
        }
      }
    });

    $status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch {
    $status.textContent = "Fetch error";
  } finally {
    statusBusy = false;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function loadRegistry() {
  try {
    const raw = localStorage.getItem("ecg-camera-registry");
    if (!raw) return [...DEFAULT_CAMERAS];
    const saved = Object.values(JSON.parse(raw));
    const map = {};
    DEFAULT_CAMERAS.forEach(c => { map[c.camera_id] = { ...c }; });
    saved.forEach(c => { map[c.camera_id] = { ...(map[c.camera_id] ?? {}), ...c }; });
    return Object.values(map).sort((a, b) => a.camera_id.localeCompare(b.camera_id));
  } catch {
    return [...DEFAULT_CAMERAS];
  }
}

function isWebcam(source) {
  return String(source).trim() === "0";
}

/**
 * Convert a camera source string to a URL the browser can load.
 *  - "0"                  → null (use getUserMedia instead)
 *  - "C:\\path\\to.mp4"   → "/visionapi/media?path=C%3A%5C..."
 *  - "/abs/unix/path.mp4" → "/visionapi/media?path=%2Fabs..."
 *  - "demo/lobby.mp4"    → "demo/lobby.mp4"  (nginx serves frontend/)
 */
function resolveVideoSrc(source) {
  if (!source || String(source).trim() === "0") return null;
  const s = String(source).trim();
  // Absolute Windows path: starts with drive letter + colon (C:\, D:/, …)
  // Absolute Unix path: starts with /
  if (/^[a-zA-Z]:[/\\]/.test(s) || s.startsWith("/")) {
    return `/visionapi/media?path=${encodeURIComponent(s)}`;
  }
  return s; // relative → nginx serves it from frontend/
}

/** Convert canvas to JPEG Blob. Returns a Promise. */
function canvasToJpeg(canvasEl, quality = 0.75) {
  return new Promise((resolve, reject) => {
    canvasEl.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("toBlob returned null")),
      "image/jpeg",
      quality
    );
  });
}

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
