// ===============================
// URL params
// ===============================
const params = new URLSearchParams(window.location.search);
const selectedCategory = params.get("category") || "math"; // math | english
const level = parseInt(params.get("level")) || 1;

// ===============================
// STATE
// ===============================
let baseCategory = (selectedCategory === "english") ? "english" : "math";
let activeCategory = baseCategory; // math | english | chance

let history = [];
let forwardStack = [];

let deck = [];
let currentCard = null;

// ===============================
// DECKS
// ===============================
let fullDeckMath = [];
let fullDeckEnglish = [];
let fullDeckChance = { neutral: [], positive: [], negative: [] };

// ===============================
// CHANCE
// ===============================
const chanceWeights = { neutral: 0.6, positive: 0.3, negative: 0.1 };

// ===============================
// UI
// ===============================
let slideLeftNext = true;

const toggleBtn = document.querySelector(".toggle-deck");
const activeCard = document.getElementById("activeCard");
const questionRows = document.getElementById("questionRows");
const answerRows = document.getElementById("answerRows");
const nextBtn = document.querySelector(".next-card");

// ===============================
// SOUND
// ===============================
const nextCardSound = new Audio("sounds/next-card.mp3");
const flipCardSound = new Audio("sounds/flip-card.mp3");
const swooshSound = new Audio("sounds/swoosh.mp3");
const failSound = new Audio("sounds/fail.mp3");
const successSound = new Audio("sounds/success.mp3");

// ===============================
// LOAD DATA
// ===============================
fetch("questions.json")
  .then(res => res.json())
  .then(data => {

    fullDeckMath = (data.math || []).filter(c => c.level === level);
    fullDeckEnglish = (data.english || []).filter(c => c.level === level);

    if (data.chance) {
      fullDeckChance.neutral = data.chance.filter(c => c.type === "neutral");
      fullDeckChance.positive = data.chance.filter(c => c.type === "positive");
      fullDeckChance.negative = data.chance.filter(c => c.type === "negative");
    }

    buildDeck();

    if (toggleBtn) {
      toggleBtn.onclick = toggleDeckCategory;
      updateToggleText();
    }
  });

// ===============================
// BUILD DECK
// ===============================
function buildDeck() {
  history = [];
  forwardStack = [];

  if (activeCategory === "math") {
    deck = [...fullDeckMath];
    currentCard = getRandomCard();
    renderMathCard();
  }

  else if (activeCategory === "english") {
    deck = [...fullDeckEnglish];
    currentCard = getRandomCard();
    renderEnglishCard();
  }

  else {
    deck = [...fullDeckChance.neutral, ...fullDeckChance.positive, ...fullDeckChance.negative];
    currentCard = getRandomChanceCard();
    renderChanceCard(currentCard);
  }

  updateUI();
  updateToggleText();
  updateGameInfoLabel();
}

// ===============================
// UI RESET
// ===============================
function updateUI() {
  activeCard.style.display = "flex";
  const placeholder = document.getElementById("placeholderCard");
  if (placeholder) placeholder.style.display = "none";

  activeCard.classList.remove("flipped");

  if (activeCategory !== "chance") {
    activeCard.classList.remove("chance");
  }
}

// ===============================
// RANDOM
// ===============================
function getRandomCard() {
  if (deck.length === 0) return null;
  const i = Math.floor(Math.random() * deck.length);
  const card = deck[i];
  deck.splice(i, 1);
  return card;
}

function weightedPick() {
  const r = Math.random();
  if (r < chanceWeights.neutral) return "neutral";
  if (r < chanceWeights.neutral + chanceWeights.positive) return "positive";
  return "negative";
}

function getRandomChanceCard() {
  let type = weightedPick();
  let pool = fullDeckChance[type];

  if (!pool || pool.length === 0) {
    pool =
      fullDeckChance.neutral.length ? fullDeckChance.neutral :
      fullDeckChance.positive.length ? fullDeckChance.positive :
      fullDeckChance.negative;
  }

  const i = Math.floor(Math.random() * pool.length);
  const card = pool[i];
  pool.splice(i, 1);
  return card;
}

// ===============================
// RENDER NORMAL
// ===============================
function renderMathCard() {
  renderColoredCard(["blue","pink","yellow","purple","green","orange"]);
}

function renderEnglishCard() {
  renderColoredCard(["blue","pink","yellow","purple","green","orange"]);
}

function renderColoredCard(colors) {
  questionRows.innerHTML = "";
  answerRows.innerHTML = "";

  colors.forEach(color => {
    const q = currentCard?.[color];
    if (!q) return;

    questionRows.appendChild(createRow(color, q.q));
    answerRows.appendChild(createRow(color, q.a));
  });

  activeCard.classList.remove("chance");
}

function createRow(color, text) {
  const row = document.createElement("div");
  row.className = "row-card";

  const tri = document.createElement("div");
  tri.className = `triangle ${color}`;

  const span = document.createElement("span");
  span.textContent = text;

  row.appendChild(tri);
  row.appendChild(span);

  return row;
}

// ===============================
// CHANCE
// ===============================
function renderChanceCard(card) {
  activeCard.classList.add("chance");

  questionRows.innerHTML = `<div class="question-mark">?</div>`;
  answerRows.innerHTML = `
    <div class="chance-row ${card.type}">
      <span>${card.text}</span>
    </div>
  `;
}

// ===============================
// FLIP
// ===============================
function flipCard() {
  const wasFlipped = activeCard.classList.contains("flipped");

  activeCard.classList.toggle("flipped");
  flipCardSound.currentTime = 0;
  flipCardSound.play().catch(() => {});

  // ONLY trigger when flipping TO back side (not front)
  if (activeCategory === "chance" && !wasFlipped) {
    runChanceEffectsAfterFlip();
  }
}
// ===============================
// CHANCE EFFECTS (RESTORED EXACT BEHAVIOR)
// ===============================
function triggerChanceEffects() {
  if (activeCategory !== "chance" || !currentCard) return;

  if (currentCard.type === "positive") {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    successSound.currentTime = 0;
    successSound.play().catch(() => {});
  }

  if (currentCard.type === "negative") {
    activeCard.classList.add("negative-flash-bg");

    setTimeout(() => {
      activeCard.classList.remove("negative-flash-bg");
    }, 900);

    failSound.currentTime = 0;
    failSound.play().catch(() => {});
  }
}

// ===============================
// NEXT CARD (ANIMATION SAFE)
// ===============================
function nextCard() {
  if (!currentCard) return;

  nextCardSound.currentTime = 0;
  nextCardSound.play().catch(() => {});

  history.push(currentCard);
  forwardStack = [];

  activeCard.classList.add("exit");

  setTimeout(() => {
    activeCard.classList.remove("exit", "flipped");

    if (activeCategory === "math") {
      currentCard = getRandomCard();
      renderMathCard();
    }
    else if (activeCategory === "english") {
      currentCard = getRandomCard();
      renderEnglishCard();
    }
    else {
      currentCard = getRandomChanceCard();
      renderChanceCard(currentCard);
    }

  }, 600);
}

// ===============================
// PREV CARD (RESTORED)
// ===============================
function prevCard() {
  if (history.length === 0) return;

  nextCardSound.currentTime = 0;
  nextCardSound.play().catch(() => {});

  forwardStack.push(currentCard);
  currentCard = history.pop();

  activeCard.classList.add("exit");

  setTimeout(() => {
    activeCard.classList.remove("exit", "flipped");

    if (activeCategory === "math") renderMathCard();
    else if (activeCategory === "english") renderEnglishCard();
    else renderChanceCard(currentCard);
  }, 600);
}

// ===============================
// TOGGLE (FIXED RULE: NEVER math↔english)
// ===============================
function toggleDeckCategory() {

  const outClass = slideLeftNext ? "exit-left" : "exit-right";
  const inClass  = slideLeftNext ? "enter-right" : "enter-left";

  swooshSound.currentTime = 0;
  swooshSound.play().catch(() => {});

  activeCard.classList.add(outClass);

  const onExitEnd = (e) => {
    if (e.target !== activeCard) return;
    activeCard.removeEventListener("animationend", onExitEnd);

    activeCard.classList.remove(outClass, "flipped");

    // ONLY toggle between base category and chance
    if (activeCategory === "chance") {
      activeCategory = baseCategory; // back to math OR english
    } else {
      activeCategory = "chance";
    }

    buildDeck();

    void activeCard.offsetWidth;
    activeCard.classList.add(inClass);

    const onEnterEnd = (e) => {
      if (e.target !== activeCard) return;
      activeCard.classList.remove(inClass);
      activeCard.removeEventListener("animationend", onEnterEnd);
    };

    activeCard.addEventListener("animationend", onEnterEnd);

    slideLeftNext = !slideLeftNext;
  };

  activeCard.addEventListener("animationend", onExitEnd);
}

// ===============================
function updateToggleText() {
  if (!toggleBtn) return;

  toggleBtn.textContent =
    activeCategory === "chance"
      ? "Visa frågekort"
      : "Visa chanskort";
}

function runChanceEffectsAfterFlip() {
  if (activeCategory !== "chance" || !currentCard) return;

  // wait until flip animation has visually applied
  requestAnimationFrame(() => {
    setTimeout(() => {
      triggerChanceEffects();
    }, 250); // small delay = after flip settles
  });
}

function updateGameInfoLabel() {
  const label = document.getElementById("gameInfo");
  if (!label) return;

  const categoryMap = {
    math: "Matte",
    english: "Engelska"
  };

  const levelMap = {
    1: "Lätt",
    2: "Medel",
    3: "Svår"
  };

  const categoryText = categoryMap[baseCategory] ?? baseCategory;
  const levelText = levelMap[level] ?? `Nivå ${level}`;

  label.textContent = `${categoryText} · ${levelText}`;
}

// ===============================
function goBack() {
  window.location.href = "index.html";
}