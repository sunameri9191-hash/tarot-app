// タロット占いアプリ 本体ロジック
// 画面遷移は .screen の hidden 属性で切り替える単純なSPA。

const DECKS = {
  full: { label: "フルデッキ", filter: () => true },
  major: { label: "大アルカナのみ", filter: c => c.arcana === "major" },
  minor: { label: "小アルカナのみ", filter: c => c.arcana === "minor" },
  court: { label: "コートカードのみ", filter: c => c.isCourt },
};

const REVERSED_PROBABILITY = 0.5;
const HISTORY_KEY = "tarotApp.history";
const HISTORY_LIMIT = 200;

const state = {
  deckKey: null,
  spread: null,
  reading: null, // { spread, deckKey, drawn: [{position, card, orientation}] }
};

// ---------- 画面切り替え ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(el => {
    el.hidden = el.id !== id;
  });
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

// ---------- デッキ選択 ----------
function filterDeck(deckKey) {
  return CARDS.filter(DECKS[deckKey].filter);
}

document.querySelectorAll(".deck-option").forEach(btn => {
  btn.addEventListener("click", () => {
    state.deckKey = btn.dataset.deck;
    renderSpreadList();
    showScreen("screen-spread");
  });
});

// ---------- スプレッド選択 ----------
const CUSTOM_SPREADS_KEY = "tarotApp.customSpreads";

function loadCustomSpreads() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SPREADS_KEY)) || []; }
  catch { return []; }
}
function saveCustomSpreads(list) {
  localStorage.setItem(CUSTOM_SPREADS_KEY, JSON.stringify(list));
}

function renderSpreadList() {
  const list = document.getElementById("spread-list");
  list.innerHTML = "";
  const deckSize = filterDeck(state.deckKey).length;
  const allSpreads = [...SPREADS, ...loadCustomSpreads()];

  allSpreads.forEach(spread => {
    const el = document.createElement("div");
    el.className = "spread-card";
    const disabled = spread.positions.length > deckSize;
    if (disabled) el.classList.add("disabled");

    const left = document.createElement("div");
    left.className = "spread-card-left";
    left.innerHTML = `<span>${escapeHtml(spread.name)}</span>` +
      (spread.custom ? `<span class="custom-badge">オリジナル</span>` : "");

    const right = document.createElement("div");
    right.className = "spread-card-right";
    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = `${spread.positions.length}枚${disabled ? "・デッキ不足" : ""}`;
    right.appendChild(countSpan);

    if (spread.custom) {
      const delBtn = document.createElement("button");
      delBtn.className = "spread-delete-btn";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", e => {
        e.stopPropagation();
        saveCustomSpreads(loadCustomSpreads().filter(s => s.id !== spread.id));
        renderSpreadList();
      });
      right.appendChild(delBtn);
    }

    el.appendChild(left);
    el.appendChild(right);

    if (!disabled) {
      el.addEventListener("click", () => {
        state.spread = spread;
        openShuffleScreen();
      });
    }
    list.appendChild(el);
  });
}

// ---------- スプレッドビルダー ----------
const BUILDER_ASPECT = "3 / 2";
const BUILDER_GRID_STEP = 5; // %
let builder = null; // { positions: [{id,label,x,y,rotate}], selectedId }

document.getElementById("btn-new-spread").addEventListener("click", () => {
  builder = { positions: [], selectedId: null };
  document.getElementById("builder-name").value = "";
  document.getElementById("builder-edit-panel").hidden = true;
  renderBuilderCanvas();
  showScreen("screen-builder");
});

function snapToGrid(v) {
  return Math.max(3, Math.min(97, Math.round(v / BUILDER_GRID_STEP) * BUILDER_GRID_STEP));
}

function renderBuilderCanvas() {
  const canvas = document.getElementById("builder-canvas");
  canvas.innerHTML = "";
  builder.positions.forEach((pos, i) => {
    const marker = document.createElement("div");
    marker.className = "builder-marker";
    if (pos.id === builder.selectedId) marker.classList.add("selected");
    if (pos.rotate) marker.classList.add("rotated");
    marker.style.left = pos.x + "%";
    marker.style.top = pos.y + "%";

    const card = document.createElement("div");
    card.className = "builder-marker-card";
    card.textContent = String(i + 1);

    const label = document.createElement("div");
    label.className = "builder-marker-label";
    label.textContent = pos.label || "";

    marker.appendChild(card);
    marker.appendChild(label);
    canvas.appendChild(marker);
    attachMarkerDrag(marker, pos);
  });
}

function attachMarkerDrag(marker, pos) {
  let dragging = false;
  let moved = false;

  marker.addEventListener("pointerdown", e => {
    dragging = true;
    moved = false;
    marker.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  marker.addEventListener("pointermove", e => {
    if (!dragging) return;
    moved = true;
    const canvas = document.getElementById("builder-canvas");
    const rect = canvas.getBoundingClientRect();
    const x = snapToGrid((e.clientX - rect.left) / rect.width * 100);
    const y = snapToGrid((e.clientY - rect.top) / rect.height * 100);
    pos.x = x;
    pos.y = y;
    marker.style.left = x + "%";
    marker.style.top = y + "%";
  });

  marker.addEventListener("pointerup", () => {
    dragging = false;
    if (!moved) selectBuilderPosition(pos.id);
  });
}

function selectBuilderPosition(id) {
  builder.selectedId = id;
  renderBuilderCanvas();
  const panel = document.getElementById("builder-edit-panel");
  const pos = builder.positions.find(p => p.id === id);
  if (!pos) { panel.hidden = true; return; }
  panel.hidden = false;
  document.getElementById("builder-position-label").value = pos.label || "";
  document.getElementById("builder-position-rotate").checked = !!pos.rotate;
}

document.getElementById("btn-add-position").addEventListener("click", () => {
  const count = builder.positions.length;
  const id = "p" + Date.now() + Math.floor(Math.random() * 1000);
  const pos = {
    id,
    label: `位置${count + 1}`,
    x: snapToGrid(25 + (count % 4) * 17),
    y: snapToGrid(20 + Math.floor(count / 4) * 20),
  };
  builder.positions.push(pos);
  selectBuilderPosition(id);
});

document.getElementById("builder-position-label").addEventListener("input", e => {
  const pos = builder.positions.find(p => p.id === builder.selectedId);
  if (!pos) return;
  pos.label = e.target.value;
  const markers = document.querySelectorAll("#builder-canvas .builder-marker");
  const index = builder.positions.findIndex(p => p.id === pos.id);
  if (markers[index]) markers[index].querySelector(".builder-marker-label").textContent = pos.label;
});

document.getElementById("builder-position-rotate").addEventListener("change", e => {
  const pos = builder.positions.find(p => p.id === builder.selectedId);
  if (!pos) return;
  pos.rotate = e.target.checked ? 90 : undefined;
  renderBuilderCanvas();
});

document.getElementById("btn-delete-position").addEventListener("click", () => {
  builder.positions = builder.positions.filter(p => p.id !== builder.selectedId);
  builder.selectedId = null;
  document.getElementById("builder-edit-panel").hidden = true;
  renderBuilderCanvas();
});

document.getElementById("btn-save-spread").addEventListener("click", () => {
  const name = document.getElementById("builder-name").value.trim();
  if (!name) { alert("スプレッドの名前を入れてね"); return; }
  if (builder.positions.length === 0) { alert("位置を1つ以上追加してね"); return; }

  const spread = {
    id: "custom-" + Date.now(),
    name,
    aspect: BUILDER_ASPECT,
    custom: true,
    positions: builder.positions.map(p => ({
      id: p.id,
      label: p.label || "position",
      x: p.x,
      y: p.y,
      ...(p.rotate ? { rotate: p.rotate } : {}),
    })),
  };
  const list = loadCustomSpreads();
  list.push(spread);
  saveCustomSpreads(list);
  renderSpreadList();
  showScreen("screen-spread");
});

// ---------- シャッフル画面（かき混ぜ→3つに分ける→重ね順選択） ----------
const MIX_THRESHOLD = 30;
const MIX_CARD_W = 62;
const MIX_CARD_H = MIX_CARD_W * 1.75;
const MIX_INFLUENCE_RADIUS = 120; // ポインター周辺、これより近いカードだけ押し動かす
const MIX_INITIAL_SPREAD = 0.22; // 最初は中央近くにまとめておき、かき混ぜた分だけ広がるようにする
let mixState = null; // { deck, progress, isPointerDown, cards, areaRect, lastPointer }
let cutState = null; // { piles: [[],[],[]], tapOrder: [], zoneEls: [] }

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function openShuffleScreen() {
  const titleInput = document.getElementById("shuffle-title-input");
  titleInput.value = state.spread.name;
  titleInput.readOnly = false;
  titleInput.classList.remove("locked");

  document.getElementById("shuffle-hint").textContent =
    `${state.spread.positions.length}枚引きます。名前は編集できるよ(シャッフルを始めると確定)`;
  document.getElementById("shuffle-instruction").textContent = "画面を指やマウスでなぞってシャッフルしよう";
  document.getElementById("shuffle-progress").hidden = false;
  document.getElementById("shuffle-progress-fill").style.width = "0%";
  const doneBtn = document.getElementById("btn-mix-done");
  doneBtn.hidden = false;
  doneBtn.disabled = true;
  doneBtn.textContent = "3つに分ける →";

  mixState = { deck: filterDeck(state.deckKey), progress: 0, isPointerDown: false, cards: [], lastPointer: null };
  // 幅を測るのでscreen-shuffleを先に表示してからmix-areaを描く(隠れたままだと幅が0になる)
  showScreen("screen-shuffle");
  renderMixArea();
}

function lockShuffleTitle() {
  const titleInput = document.getElementById("shuffle-title-input");
  if (titleInput.readOnly) return;
  titleInput.readOnly = true;
  titleInput.classList.add("locked");
  titleInput.blur();
}

function mixBounds(areaW, areaH) {
  return {
    maxX: Math.max(16, (areaW - MIX_CARD_W) / 2 - 4),
    maxY: Math.max(16, (areaH - MIX_CARD_H) / 2 - 4),
  };
}

function initialMixPos(areaW, areaH) {
  const { maxX, maxY } = mixBounds(areaW, areaH);
  return {
    x: (Math.random() * 2 - 1) * maxX * MIX_INITIAL_SPREAD,
    y: (Math.random() * 2 - 1) * maxY * MIX_INITIAL_SPREAD,
    r: (Math.random() - 0.5) * 30,
  };
}

function renderMixArea() {
  const area = document.getElementById("mix-area");
  area.innerHTML = "";
  area.style.transition = "";
  area.style.opacity = "";
  const rect = area.getBoundingClientRect();
  mixState.areaRect = rect;
  mixState.cards = [];

  // 実際に選んでいるデッキの枚数分だけカードを置く(全部かき混ぜている実感が欲しいので)
  const cardCount = mixState.deck.length;
  for (let i = 0; i < cardCount; i++) {
    const el = document.createElement("div");
    el.className = "mix-card";
    const pos = initialMixPos(rect.width, rect.height);
    el.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg)`;
    el.style.zIndex = i;
    area.appendChild(el);
    mixState.cards.push({ el, x: pos.x, y: pos.y, r: pos.r });
  }

  area.onpointerdown = e => {
    mixState.isPointerDown = true;
    lockShuffleTitle();
    const r = mixState.areaRect;
    mixState.lastPointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  window.onpointerup = () => { mixState.isPointerDown = false; mixState.lastPointer = null; };

  area.onpointermove = e => {
    if (!mixState.isPointerDown) return;
    const r = mixState.areaRect;
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    if (!mixState.lastPointer) { mixState.lastPointer = { x: px, y: py }; return; }
    const dx = px - mixState.lastPointer.x;
    const dy = py - mixState.lastPointer.y;
    mixState.lastPointer = { x: px, y: py };
    if (dx === 0 && dy === 0) return;

    const { maxX, maxY } = mixBounds(r.width, r.height);
    let moved = false;
    mixState.cards.forEach(card => {
      const cx = r.width / 2 + card.x;
      const cy = r.height / 2 + card.y;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist >= MIX_INFLUENCE_RADIUS) return;
      // 慣性っぽさ：指の動きにカードが「押される」形で、近いほど強く反応する
      const factor = 1 - dist / MIX_INFLUENCE_RADIUS;
      card.x = clamp(card.x + dx * factor * 1.3 + (Math.random() - 0.5) * 4, -maxX, maxX);
      card.y = clamp(card.y + dy * factor * 1.3 + (Math.random() - 0.5) * 4, -maxY, maxY);
      card.r = clamp(card.r + dx * factor * 0.5 + (Math.random() - 0.5) * 3, -85, 85);
      card.el.style.transform = `translate(${card.x}px, ${card.y}px) rotate(${card.r}deg)`;
      card.el.style.zIndex = String(Date.now() % 1000);
      moved = true;
    });

    if (moved) {
      mixState.progress++;
      const pct = Math.min(100, (mixState.progress / MIX_THRESHOLD) * 100);
      document.getElementById("shuffle-progress-fill").style.width = pct + "%";
      document.getElementById("btn-mix-done").disabled = mixState.progress < MIX_THRESHOLD;
    }
  };
}

const SPLIT_STAGGER_MS = 14; // 1枚ずつ山に振り分けていく間隔

function pileGroupTransform(groupIndex, areaW, indexInGroup) {
  const centers = [0.16, 0.5, 0.84];
  const targetX = areaW * centers[groupIndex] - areaW / 2;
  const stackOffset = (indexInGroup % 10) * 1.6;
  const wobble = (Math.random() - 0.5) * 4;
  return `translate(${targetX + stackOffset}px, ${stackOffset}px) rotate(${wobble}deg)`;
}

document.getElementById("btn-mix-done").addEventListener("click", () => {
  lockShuffleTitle();
  const shuffledDeck = shuffleArray(mixState.deck);
  const rect = mixState.areaRect;
  const area = document.getElementById("mix-area");
  area.onpointerdown = null;
  area.onpointermove = null;

  document.getElementById("shuffle-progress").hidden = true;
  const doneBtn = document.getElementById("btn-mix-done");
  doneBtn.hidden = true;
  document.getElementById("shuffle-instruction").textContent = "3つの山に分けているよ…";

  // 1枚ずつランダムな順番で、ランダムな山へ振り分けていく(全部同時に動かさない)
  const dealOrder = shuffleArray(mixState.cards.map((_, i) => i));
  const groupCounts = [0, 0, 0];
  dealOrder.forEach((cardIdx, seq) => {
    const group = seq % 3;
    const indexInGroup = groupCounts[group]++;
    const card = mixState.cards[cardIdx];
    card.group = group;
    setTimeout(() => {
      card.el.style.transition = "transform 0.4s cubic-bezier(.3,.1,.3,1)";
      card.el.style.transform = pileGroupTransform(group, rect.width, indexInGroup);
      card.el.style.zIndex = String(100 + indexInGroup);
    }, seq * SPLIT_STAGGER_MS);
  });

  const splitTotalMs = dealOrder.length * SPLIT_STAGGER_MS + 500;
  setTimeout(() => {
    document.getElementById("shuffle-instruction").textContent =
      "重ねたい順にタップしてね(最初にタップした山が一番上になるよ)";
    setupPileTapZones(shuffledDeck, rect);
  }, splitTotalMs);
});

function splitIntoThree(deck) {
  const n = deck.length;
  const s1 = Math.ceil(n / 3);
  const s2 = Math.ceil((n - s1) / 2);
  return [deck.slice(0, s1), deck.slice(s1, s1 + s2), deck.slice(s1 + s2)];
}

function setupPileTapZones(shuffledDeck, rect) {
  cutState = { piles: splitIntoThree(shuffledDeck), tapOrder: [], zoneEls: [] };
  const area = document.getElementById("mix-area");
  const centers = [0.16, 0.5, 0.84];

  centers.forEach((centerFrac, i) => {
    const zone = document.createElement("div");
    zone.className = "pile-tap-zone";
    zone.style.left = centerFrac * 100 + "%";
    zone.innerHTML = `<div class="pile-order-badge" hidden></div>`;
    zone.addEventListener("click", () => onPileZoneTap(i, zone));
    area.appendChild(zone);
    cutState.zoneEls.push(zone);
  });
}

function onPileZoneTap(i, zone) {
  if (cutState.tapOrder.includes(i)) return;
  cutState.tapOrder.push(i);
  const badge = zone.querySelector(".pile-order-badge");
  badge.hidden = false;
  badge.textContent = String(cutState.tapOrder.length);
  zone.classList.add("tapped");

  mixState.cards.filter(c => c.group === i).forEach(c => c.el.classList.add("picked"));

  if (cutState.tapOrder.length === cutState.piles.length) {
    convergeCardsAndDraw();
  }
}

function convergeCardsAndDraw() {
  const area = document.getElementById("mix-area");
  cutState.zoneEls.forEach(z => z.remove());
  document.getElementById("shuffle-instruction").textContent = "まとめているよ…";

  // タップした順(最初が一番上)で、山ごとに中央へ集める
  let stack = 0;
  cutState.tapOrder.forEach((group, orderIdx) => {
    const cardsInGroup = mixState.cards.filter(c => c.group === group);
    cardsInGroup.forEach(card => {
      card.el.style.transition = "transform 0.45s cubic-bezier(.3,.1,.3,1)";
      card.el.style.transform = `translate(0px, ${stack * 0.4}px) rotate(${(Math.random() - 0.5) * 3}deg)`;
      card.el.style.zIndex = String((cutState.piles.length - orderIdx) * 1000 + stack);
      stack++;
    });
  });

  const finalDeck = cutState.tapOrder.flatMap(idx => cutState.piles[idx]);

  // 集まった場所を覚えておいて、次の画面でここから1枚ずつ配る
  setTimeout(() => {
    const mergedRect = area.getBoundingClientRect();
    const originPoint = {
      x: mergedRect.left + mergedRect.width / 2,
      y: mergedRect.top + mergedRect.height / 2,
    };
    area.style.transition = "opacity 0.2s ease-in";
    area.style.opacity = "0";
    setTimeout(() => finalizeDrawAndReveal(finalDeck, originPoint), 200);
  }, 500);
}

function finalizeDrawAndReveal(finalDeck, originPoint) {
  lockShuffleTitle();
  const titleInput = document.getElementById("shuffle-title-input");
  const drawn = state.spread.positions.map((position, i) => ({
    position,
    card: finalDeck[i],
    orientation: Math.random() < REVERSED_PROBABILITY ? "reversed" : "upright",
  }));
  const title = titleInput.value.trim() || state.spread.name;
  state.reading = { spread: state.spread, deckKey: state.deckKey, drawn, title };
  showScreen("screen-reveal");
  renderRevealScreen(originPoint);
}

// ---------- カード展開画面 ----------
// スプレッド内の位置同士が重ならないよう、カード幅をこのcanvas専用に縮めて収める。
// overlapAllowed に列挙されたペア(伝統的にカードを重ねて見せる箇所)は衝突判定から除外する。
const BASE_CARD_WIDTH = { narrow: 78, wide: 92 };
const CARD_RATIO = 1.75; // height / width

const SLOT_LABEL_HEADROOM_PX = 24; // ラベル+隙間の分、カード本体より上に余分に必要な高さ(はみ出し判定用)

function fitCardWidth(spread, canvasWidthPx, canvasHeightPx, baseWidth) {
  const allowedPairs = new Set(
    (spread.overlapAllowed || []).map(([a, b]) => [a, b].sort().join("|"))
  );
  const positions = spread.positions;

  function overflowsCanvas(w) {
    const h = w * CARD_RATIO;
    return positions.some(p => {
      const pw = p.rotate ? h : w, ph = p.rotate ? w : h;
      const cx = p.x / 100 * canvasWidthPx, cy = p.y / 100 * canvasHeightPx;
      return cx - pw / 2 < 0 || cx + pw / 2 > canvasWidthPx ||
        cy - ph / 2 - SLOT_LABEL_HEADROOM_PX < 0 || cy + ph / 2 > canvasHeightPx;
    });
  }

  function collides(w) {
    if (overflowsCanvas(w)) return true;
    const h = w * CARD_RATIO;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        if (allowedPairs.has([a.id, b.id].sort().join("|"))) continue;
        const aw = a.rotate ? h : w, ah = a.rotate ? w : h;
        const bw = b.rotate ? h : w, bh = b.rotate ? w : h;
        const dx = Math.abs((a.x - b.x) / 100 * canvasWidthPx);
        const dy = Math.abs((a.y - b.y) / 100 * canvasHeightPx);
        if (dx < (aw + bw) / 2 * 0.92 && dy < (ah + bh) / 2 * 0.92) return true;
      }
    }
    return false;
  }

  let w = baseWidth;
  while (w > 36 && collides(w)) w -= 2;
  return w;
}

const FLY_STAGGER_MS = 190; // 1枚配り出すごとの間隔
const FLY_DURATION_MS = 560; // 1枚が山からスロットへ飛ぶ時間
const FLIP_DURATION_MS = 650; // 着地後、裏から表にめくれる時間(CSSのautoFlipと合わせる)

function renderRevealScreen(originPoint) {
  const { spread, drawn, title } = state.reading;
  document.getElementById("reveal-title").textContent = title;

  const canvas = document.getElementById("spread-canvas");
  const canvasWrap = canvas.parentElement;
  canvas.style.aspectRatio = spread.aspect;
  const canvasWidthPx = canvasWrap.clientWidth || canvasWrap.getBoundingClientRect().width || 320;
  canvas.style.width = canvasWidthPx + "px";
  const canvasHeightPx = canvasWidthPx / evalAspect(spread.aspect);

  const baseWidth = window.matchMedia("(min-width: 480px)").matches
    ? BASE_CARD_WIDTH.wide : BASE_CARD_WIDTH.narrow;
  const fitWidth = fitCardWidth(spread, canvasWidthPx, canvasHeightPx, baseWidth);
  canvas.style.setProperty("--card-w", fitWidth + "px");

  canvas.innerHTML = "";

  const slots = [];

  drawn.forEach((item, index) => {
    const slot = document.createElement("div");
    slot.className = "card-slot";
    slot.style.left = item.position.x + "%";
    slot.style.top = item.position.y + "%";

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = item.position.label;

    const face = document.createElement("div");
    face.className = "card-face";
    if (item.position.rotate) face.classList.add("slot-rotated");

    const inner = document.createElement("div");
    inner.className = "card-face-inner";

    const back = document.createElement("div");
    back.className = "face-back";
    back.innerHTML = `<div class="back-pattern"></div>`;

    const front = document.createElement("div");
    front.className = "face-front";
    const img = document.createElement("img");
    img.src = item.card.image;
    img.alt = item.card.nameJa;
    if (item.orientation === "reversed") img.classList.add("reversed");
    front.appendChild(img);

    inner.appendChild(back);
    inner.appendChild(front);
    face.appendChild(inner);

    face.addEventListener("click", () => openCardModal(item.card, item.orientation));

    slot.appendChild(label);
    slot.appendChild(face);
    canvas.appendChild(slot);
    slots.push({ slot, inner });
  });

  // シャッフル画面で最後に山があった場所を起点に、1枚ずつスロットへ飛んで行って着地する
  const origin = originPoint || (() => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })();

  slots.forEach(({ slot }) => {
    const r = slot.getBoundingClientRect();
    const dx = origin.x - (r.left + r.width / 2);
    const dy = origin.y - (r.top + r.height / 2);
    slot.style.transition = "none";
    slot.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.5)`;
    slot.style.opacity = "0.85";
    slot.style.zIndex = "5";
  });

  slots.forEach(({ slot, inner }, index) => {
    const startDelay = 40 + index * FLY_STAGGER_MS;
    setTimeout(() => {
      slot.style.transition = `transform ${FLY_DURATION_MS}ms cubic-bezier(.22,.7,.2,1), opacity ${FLY_DURATION_MS}ms ease-out`;
      slot.style.transform = "translate(-50%, -50%)";
      slot.style.opacity = "1";
      slot.style.zIndex = "";
    }, startDelay);
    inner.style.animationDelay = `${startDelay + FLY_DURATION_MS - 100}ms`;
  });

  const revealMs = 40 + (drawn.length - 1) * FLY_STAGGER_MS + FLY_DURATION_MS + FLIP_DURATION_MS + 250;
  const btn = document.getElementById("btn-to-result");
  btn.hidden = true;
  setTimeout(() => { btn.hidden = false; }, revealMs);
}

function evalAspect(aspectStr) {
  const [w, h] = aspectStr.split("/").map(s => parseFloat(s.trim()));
  return w / h;
}

document.getElementById("btn-to-result").addEventListener("click", () => {
  document.getElementById("result-text").value = buildResultText(state.reading);
  showScreen("screen-result");
});

// ---------- カード詳細モーダル ----------
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatMarkdownLite(md) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      if (inList) { html += "</ul>"; inList = false; }
      const level = Math.min(h[1].length + 2, 6);
      html += `<h${level}>${escapeHtml(h[2])}</h${level}>`;
      continue;
    }
    const li = line.match(/^-\s+(.*)$/);
    if (li) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMd(escapeHtml(li[1]))}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${inlineMd(escapeHtml(line))}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function openCardModal(card, orientation) {
  const modal = document.getElementById("card-modal");
  const img = document.getElementById("modal-img");
  img.src = card.image;
  img.alt = card.nameJa;
  img.classList.toggle("reversed", orientation === "reversed");

  document.getElementById("modal-name").textContent =
    card.nameEn ? `${card.nameJa}（${card.nameEn}）` : card.nameJa;

  const orientLabel = orientation === "reversed" ? "逆位置" : "正位置";
  document.getElementById("modal-orientation-label").textContent = orientLabel;

  document.getElementById("modal-short").textContent =
    orientation === "reversed" ? card.reversedShort : card.uprightShort;

  const body = document.getElementById("modal-body");
  body.innerHTML = formatMarkdownLite(card.bodyMarkdown);
  body.hidden = true;
  document.getElementById("modal-more-toggle").textContent = "もっと見る ▾";

  modal.hidden = false;
}

document.getElementById("modal-more-toggle").addEventListener("click", () => {
  const body = document.getElementById("modal-body");
  body.hidden = !body.hidden;
  document.getElementById("modal-more-toggle").textContent =
    body.hidden ? "もっと見る ▾" : "閉じる ▴";
});

document.querySelectorAll("[data-close-modal]").forEach(el => {
  el.addEventListener("click", () => {
    document.getElementById("card-modal").hidden = true;
  });
});

// ---------- 結果テキスト ----------
function formatDateTime(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildResultText(reading) {
  const { deckKey, drawn, title } = reading;
  const lines = [];
  lines.push(`🔮 ${title}（${DECKS[deckKey].label}） - ${formatDateTime(new Date())}`);
  drawn.forEach((item, i) => {
    const orientLabel = item.orientation === "reversed" ? "逆位置" : "正位置";
    const meaning = item.orientation === "reversed" ? item.card.reversedShort : item.card.uprightShort;
    lines.push(`${i + 1}. ${item.position.label}：${item.card.nameJa}（${orientLabel}） — ${meaning}`);
  });
  return lines.join("\n");
}

document.getElementById("btn-copy").addEventListener("click", async () => {
  const text = document.getElementById("result-text").value;
  try {
    await navigator.clipboard.writeText(text);
    flashButton(document.getElementById("btn-copy"), "コピーした！");
  } catch {
    document.getElementById("result-text").select();
    flashButton(document.getElementById("btn-copy"), "選択したので Ctrl+C で");
  }
});

function flashButton(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1500);
}

document.getElementById("btn-new-reading").addEventListener("click", () => {
  showScreen("screen-deck");
});

// ---------- 履歴 ----------
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistoryList(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

document.getElementById("btn-save-history").addEventListener("click", () => {
  const list = loadHistory();
  list.unshift({
    id: Date.now(),
    createdAt: new Date().toISOString(),
    spreadName: state.reading.title,
    deckLabel: DECKS[state.reading.deckKey].label,
    text: document.getElementById("result-text").value,
  });
  saveHistoryList(list.slice(0, HISTORY_LIMIT));
  flashButton(document.getElementById("btn-save-history"), "保存した！");
});

document.getElementById("btn-history").addEventListener("click", () => {
  renderHistoryList();
  showScreen("screen-history");
});

function renderHistoryList() {
  const container = document.getElementById("history-list");
  const list = loadHistory();
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<p class="empty-note">まだ履歴はないよ</p>`;
    return;
  }

  list.forEach(entry => {
    const el = document.createElement("div");
    el.className = "history-item";
    const date = new Date(entry.createdAt);
    el.innerHTML = `
      <div class="history-head">
        <span>${entry.spreadName}（${entry.deckLabel}）</span>
        <span class="history-date">${formatDateTime(date)}</span>
      </div>
      <div class="history-detail" hidden>${escapeHtml(entry.text)}</div>
      <button class="history-delete">削除</button>
    `;
    const head = el.querySelector(".history-head");
    const detail = el.querySelector(".history-detail");
    head.addEventListener("click", () => { detail.hidden = !detail.hidden; });

    el.querySelector(".history-delete").addEventListener("click", () => {
      const remaining = loadHistory().filter(e => e.id !== entry.id);
      saveHistoryList(remaining);
      renderHistoryList();
    });

    container.appendChild(el);
  });
}
