// Configuración
const INGREDIENTS = {
  salsa:     { letter: "Salsa" },
  queso:     { letter: "Queso" },
  pepperoni: { letter: "Pepperoni" },
  salchicha: { letter: "Salchicha" },
  champi:    { letter: "Champiñón" },
  pepino:    { letter: "Pepino" }
};

const POSSIBLE_TOPPINGS = ["salsa", "queso", "pepperoni", "salchicha", "champi", "pepino"];

let level = 1;
let pizzasCorrectas = 0;
let lives = 3;
let highLevel = localStorage.getItem("pizzatronHighLevel") || 1;

let baseSpeed = 65;
let currentSpeed = baseSpeed;

let currentPizza = null;
let currentOrder = [];
let isPaused = false;
let animationFrameId = null;

// Estadísticas acumuladas
let gameStats = JSON.parse(localStorage.getItem('pizzatronStats')) || {
  totalPizzasCorrectas: 0,
  maxLevel: 1,
  partidasJugadas: 0,
  historial: []
};

// Datos del jugador (nombre y edad)
let playerInfo = JSON.parse(localStorage.getItem('pizzatronPlayerInfo')) || {
  name: "",
  age: ""
};

document.getElementById("high-level").textContent = highLevel;

// Elementos DOM
const pizzaEl      = document.getElementById("pizza");
const orderSpan    = document.getElementById("current-order");
const scoreEl      = document.getElementById("score");
const levelEl      = document.getElementById("level");
const heartsEl     = document.getElementById("hearts");
const gameOver     = document.getElementById("game-over");
const finalLevel   = document.getElementById("final-level");
const finalPizzas  = document.getElementById("final-pizzas");
const pauseOverlay = document.getElementById("pause-overlay");
const pauseBtn     = document.getElementById("pause-btn");
const resumeBtn    = document.getElementById("resume-btn");
const playerNameInput   = document.getElementById("player-name");
const playerAgeInput    = document.getElementById("player-age");

// Generar orden
function generateOrder() {
  const count = Math.min(1 + Math.floor((level - 1) / 2), 5);
  const toppings = [];
  for (let i = 0; i < count; i++) {
    toppings.push(POSSIBLE_TOPPINGS[Math.floor(Math.random() * POSSIBLE_TOPPINGS.length)]);
  }
  return toppings;
}

function showNewOrder() {
  currentOrder = generateOrder();
  orderSpan.textContent = currentOrder.map(t => INGREDIENTS[t].letter).join(" + ");
}

function resetPizza() {
  currentPizza = { x: -140, toppings: [] };
  pizzaEl.style.left = "-140px";
  pizzaEl.innerHTML = "";
  pizzaEl.style.boxShadow = "inset 0 0 30px rgba(0,0,0,0.6), 0 0 20px #f4a261";
}

function updateHighScore() {
  if (level > highLevel) {
    highLevel = level;
    localStorage.setItem("pizzatronHighLevel", highLevel);
    document.getElementById("high-level").textContent = highLevel;
  }
}

function checkPizza() {
  const player = currentPizza.toppings.slice().sort();
  const needed = currentOrder.slice().sort();

  if (JSON.stringify(player) === JSON.stringify(needed)) {
    pizzasCorrectas++;
    scoreEl.textContent = pizzasCorrectas;
    if (pizzasCorrectas % 5 === 0) {
      level++;
      levelEl.textContent = level;
      currentSpeed = baseSpeed * Math.pow(1.15, level - 1);
      updateHighScore();
    }
    resetPizza();
    showNewOrder();
  } else {
    lives--;
    heartsEl.textContent = "♥".repeat(lives);
    if (lives <= 0) {
      gameOver.style.display = "flex";
      finalLevel.textContent = level;
      finalPizzas.textContent = pizzasCorrectas;

      // Precargar nombre y edad si ya existen
      playerNameInput.value = playerInfo.name;
      playerAgeInput.value = playerInfo.age;

      // Guardar estadísticas de partida
      gameStats.partidasJugadas += 1;
      gameStats.historial.push({
        fecha: new Date().toLocaleString('es-EC'),
        pizzas: pizzasCorrectas,
        nivel: level
      });
      gameStats.totalPizzasCorrectas += pizzasCorrectas;
      if (level > gameStats.maxLevel) gameStats.maxLevel = level;
      localStorage.setItem('pizzatronStats', JSON.stringify(gameStats));
    } else {
      resetPizza();
    }
  }
}

// Agregar ingredientes con clic
document.querySelectorAll(".ing-button").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!currentPizza || isPaused) return;

    if (currentPizza.x < -50 || currentPizza.x > 880) return;

    const type = btn.dataset.ing;
    currentPizza.toppings.push(type);

    const ing = document.createElement("div");
    ing.className = "ingredient placed";

    const computed = getComputedStyle(btn);
    ing.style.backgroundImage    = computed.backgroundImage;
    ing.style.backgroundSize     = computed.backgroundSize;
    ing.style.backgroundPosition = computed.backgroundPosition;
    ing.style.backgroundRepeat   = computed.backgroundRepeat;

    const centerX = pizzaEl.offsetWidth / 2;
    const centerY = pizzaEl.offsetHeight / 2;
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 60;

    ing.style.left = (centerX + offsetX) + "px";
    ing.style.top  = (centerY + offsetY) + "px";

    pizzaEl.appendChild(ing);

    setTimeout(() => {
      ing.style.transform = "translate(-50%, -50%) scale(1)";
    }, 10);

    pizzaEl.style.boxShadow = "inset 0 0 30px rgba(0,0,0,0.6), 0 0 25px #ffd60a";
    setTimeout(() => {
      pizzaEl.style.boxShadow = "inset 0 0 30px rgba(0,0,0,0.6), 0 0 20px #f4a261";
    }, 400);
  });
});

// Pausa / Reanudar
function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseOverlay.style.display = "flex";
    pauseBtn.textContent = "Continuar";
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else {
    pauseOverlay.style.display = "none";
    pauseBtn.textContent = "Pausa";
    gameLoop();
  }
}

pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);

// Exportar a Google Sheets (solo cuando se presiona el botón en Game Over)
document.getElementById('export-stats-btn').addEventListener('click', () => {
  const name = playerNameInput.value.trim() || "Anónimo";
  const age  = playerAgeInput.value.trim() || "-";

  // Guardar en local para próximas partidas
  playerInfo.name = name;
  playerInfo.age  = age;
  localStorage.setItem('pizzatronPlayerInfo', JSON.stringify(playerInfo));

  // Datos a enviar
  const datos = {
    nombre: name,
    edad: age,
    fecha: new Date().toLocaleString('es-EC'),
    pizzas: pizzasCorrectas,
    nivel: level,
    totalPizzas: gameStats.totalPizzasCorrectas,
    partidas: gameStats.partidasJugadas,
    maxNivel: gameStats.maxLevel
  };

  // Convertir a form-urlencoded (más estable con Apps Script)
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(datos)) {
    formData.append(key, value);
  }

  fetch('https://script.google.com/macros/s/AKfycbyWDn11xeKTVblSPNp3kZPfEtOqcvmppHUIWhZlolByzkCAeo_uvK49VHh9HkE2WCIs6A/exec', {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  })
  .then(() => {
    alert("¡Resultados enviados correctamente! Gracias por jugar, " + name + " 🎉");
  })
  .catch(err => {
    console.error("Error al enviar:", err);
    alert("No se pudo enviar los datos. Revisa tu conexión o la URL del script.");
  });
});

// Bucle de juego
function gameLoop() {
  if (!currentPizza || isPaused) return;

  currentPizza.x += currentSpeed / 60;
  pizzaEl.style.left = currentPizza.x + "px";

  if (currentPizza.x > 920 + 140) {
    checkPizza();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Inicio del juego
function startGame() {
  lives = 3;
  level = 1;
  pizzasCorrectas = 0;
  currentSpeed = baseSpeed;
  isPaused = false;

  heartsEl.textContent = "♥♥♥";
  levelEl.textContent = "1";
  scoreEl.textContent = "0";

  resetPizza();
  showNewOrder();
  gameOver.style.display = "none";
  pauseOverlay.style.display = "none";
  pauseBtn.textContent = "Pausa";

  gameLoop();
}

// Pausa con tecla ESC
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.keyCode === 27) {
    event.preventDefault();
    togglePause();
  }
});

// (Tu función togglePause ya existente, con el opcional si quieres)
function togglePause() {
  isPaused = !isPaused;

  if (isPaused) {
    pauseOverlay.style.display = "flex";
    pauseBtn.textContent = "Continuar";
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  } else {
    pauseOverlay.style.display = "none";
    pauseBtn.textContent = "Pausa";
    gameLoop();
  }
}
document.addEventListener('touchstart', function(event) {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}, { passive: false });
// Iniciar
startGame();