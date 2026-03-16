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

// ─── Nuevas variables para análisis ────────────────────────────────────────
let pizzasIntentadas    = 0;
let errores             = 0;
let ingredientesUsados  = 0;
let startTime           = Date.now();
let reactionStart       = Date.now();
let reactionTimes       = [];
let isReady = false;
// ─── Info del dispositivo (se captura una vez) ─────────────────────────────
const ua = navigator.userAgent || navigator.vendor || window.opera;
const dispositivo = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  ? (/iPad|tablet/i.test(ua) ? "tablet" : "móvil")
  : "escritorio";

const navegador = (() => {
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/edg/i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  return "Otro";
})();

const resolucion = `${window.screen.width} × ${window.screen.height}`;
const ventana    = `${window.innerWidth} × ${window.innerHeight}`;
// ────────────────────────────────────────────────────────────────────────────

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

// Datos del jugador
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
const playerNameInput = document.getElementById("player-name");
const playerAgeInput  = document.getElementById("player-age");

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
  reactionStart = Date.now();           // ← importante: inicia temporizador de reacción
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
  pizzasIntentadas++;                     // ← cada pizza que llega al final cuenta como intentada

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
    errores++;                            // ← error = pizza incorrecta
    lives--;
    heartsEl.textContent = "♥".repeat(lives);
    if (lives <= 0) {
      gameOver.style.display = "flex";
      finalLevel.textContent = level;
      finalPizzas.textContent = pizzasCorrectas;

      playerNameInput.value = playerInfo.name;
      playerAgeInput.value = playerInfo.age;

      // Guardar estadísticas acumuladas
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
    ingredientesUsados++;                   // ← cada clic cuenta

    // Medir tiempo de reacción solo en el PRIMER ingrediente
    if (currentPizza.toppings.length === 1) {
      const reaction = Date.now() - reactionStart;
      reactionTimes.push(reaction);
    }

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
  if (!isReady) {
    console.log("El juego aún no ha comenzado. Presiona ¡LISTO! o Espacio primero.");
    // Opcional: mostrar un mensaje temporal en pantalla
    // alert("¡Presiona 'LISTO!' o Espacio para comenzar!");
    return;
  }
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

// Exportar a Google Sheets
document.getElementById('export-stats-btn').addEventListener('click', () => {
  const name = playerNameInput.value.trim() || "Anónimo";
  const age  = playerAgeInput.value.trim() || "-";

  playerInfo.name = name;
  playerInfo.age  = age;
  localStorage.setItem('pizzatronPlayerInfo', JSON.stringify(playerInfo));

  // Cálculos finales
  const duracionPartida = Math.round((Date.now() - startTime) / 1000);

  const precision = pizzasIntentadas > 0
    ? (pizzasCorrectas / pizzasIntentadas).toFixed(3)
    : "0.000";

  const reactionAvg = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  // Datos completos
  const datos = {
    nombre:               name,
    edad:                 age,
    fecha:                new Date().toLocaleString('es-EC'),
    dispositivo:          dispositivo,
    navegador:            navegador,
    resolucion_pantalla:  resolucion,
    ventana_visible:      ventana,

    pizzas_correctas:     pizzasCorrectas,
    pizzas_intentadas:    pizzasIntentadas,
    errores:              errores,
    precision:            precision,

    nivel_alcanzado:      level,
    velocidad_final:      Math.round(currentSpeed),

    ingredientes_usados:  ingredientesUsados,
    reaccion_promedio_ms: reactionAvg,
    duracion_segundos:    duracionPartida,

    total_pizzas_historico: gameStats.totalPizzasCorrectas,
    partidas_jugadas:     gameStats.partidasJugadas,
    nivel_maximo_historico: gameStats.maxLevel
  };

  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(datos)) {
    formData.append(key, value);
  }

  fetch('https://script.google.com/macros/s/AKfycbw_b1HxUdNFt-2KGJDbPg1oZRZqdFIyVIs0R3RsSRtqVj8Pf2kfBUBuRmD9Vr2zLDfbjw/exec', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  })
  .then(() => {
    alert("¡Datos enviados! Gracias por jugar, " + name + " 🍕");
  })
  .catch(err => {
    console.error("Error al enviar:", err);
    alert("No se pudo enviar. Revisa conexión o URL del script.");
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
  // Reiniciar métricas de análisis
  pizzasIntentadas   = 0;
  errores            = 0;
  ingredientesUsados = 0;
  startTime          = Date.now();
  reactionTimes      = [];
  reactionStart      = Date.now();

  lives = 3;
  level = 1;
  pizzasCorrectas = 0;
  currentSpeed = baseSpeed;
  isPaused = true;           // ¡Pausado desde el inicio!
  isReady = false;

  heartsEl.textContent = "♥♥♥";
  levelEl.textContent = "1";
  scoreEl.textContent = "0";

  resetPizza();
  showNewOrder();

  gameOver.style.display = "none";
  pauseOverlay.style.display = "none";
  pauseBtn.textContent = "Pausa";

  // Mostrar botón "¡LISTO!"
  document.getElementById("ready-btn").style.display = "block";

  // NO llamamos gameLoop() aquí
}
const readyBtn = document.getElementById("ready-btn");

// Al presionar "¡Listo!" o Espacio
function startGameplay() {
  if (!isReady) {
    isReady = true;
    isPaused = false;
    //readyBtn.style.display = "none";
    document.getElementById("ready-btn").style.display = "none";
    gameLoop();  // ahora sí empieza el movimiento
  }
}

readyBtn.addEventListener("click", startGameplay);

document.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Spacebar' || event.keyCode === 32) {
    event.preventDefault();
    startGameplay();
  }
});
// Iniciar
//startGame();

// Pantalla de bienvenida e instrucciones
// Pantalla de instrucciones (no reinicia el juego)
const welcomeOverlay = document.getElementById("welcome-overlay");
const startGameBtn = document.getElementById("start-game-btn");
const howToPlayBtn = document.getElementById("how-to-play-btn");
const closeInstructionsBtn = document.getElementById("close-instructions");

// Al inicio: mostrar instrucciones y esperar a "Jugar"
welcomeOverlay.style.display = "flex";
howToPlayBtn.style.display = "none"; // oculto hasta que empiece el juego

// Botón "¡JUGAR!" solo inicia la primera vez
startGameBtn.addEventListener("click", () => {
  welcomeOverlay.style.display = "none";
  howToPlayBtn.style.display = "block"; // ahora visible
  if (!currentPizza) {  // solo inicia si aún no empezó
    startGame();
  }
});

// Botón "Cómo jugar" y tecla H durante el juego
howToPlayBtn.addEventListener("click", showInstructions);
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') {
    event.preventDefault();
    showInstructions();
  }
  // ESC siempre pausa/reanuda (ya lo tienes)
  if (event.key === 'Escape' || event.keyCode === 27) {
    event.preventDefault();
    togglePause();
  }
});

// Botón de cerrar instrucciones
if (closeInstructionsBtn) {
  closeInstructionsBtn.addEventListener("click", hideInstructions);
}

// Función para mostrar instrucciones sin reiniciar
function showInstructions() {
  welcomeOverlay.style.display = "flex";
  startGameBtn.style.display = "none";      // oculta "Jugar" cuando ya empezó
  closeInstructionsBtn.style.display = "block"; // muestra × para cerrar
  if (!isPaused) togglePause();             // pausa si no está pausado
}

// Función para ocultar instrucciones
function hideInstructions() {
  welcomeOverlay.style.display = "none";
  startGameBtn.style.display = "block";     // vuelve a mostrar por si acaso
  closeInstructionsBtn.style.display = "none";
  if (isPaused) togglePause();              // reanuda si estaba pausado por instrucciones
}

//startGame();