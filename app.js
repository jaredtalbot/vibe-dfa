// DFA Builder & Tester - Main Application

class DFA {
  constructor() {
    this.states = [];
    this.alphabet = new Set(["0", "1"]);
    this.startState = null;
    this.currentState = null;
    this.stateIdCounter = 0;
  }

  addState(x, y, name = null) {
    const id = this.stateIdCounter++;
    const state = {
      id: id,
      name: name || `q${id}`,
      x: x,
      y: y,
      radius: 30,
      isStart: false,
      isAccept: false,
      transitions: {},
    };
    this.states.push(state);
    return state;
  }

  removeState(stateId) {
    const index = this.states.findIndex((s) => s.id === stateId);
    if (index !== -1) {
      const state = this.states[index];
      if (this.startState === state) {
        this.startState = null;
      }
      // Remove transitions pointing to this state
      this.states.forEach((s) => {
        Object.keys(s.transitions).forEach((symbol) => {
          if (s.transitions[symbol] === state) {
            delete s.transitions[symbol];
          }
        });
      });
      this.states.splice(index, 1);
    }
  }

  getStateAt(x, y) {
    for (let i = this.states.length - 1; i >= 0; i--) {
      const state = this.states[i];
      const dx = x - state.x;
      const dy = y - state.y;
      if (dx * dx + dy * dy <= state.radius * state.radius) {
        return state;
      }
    }
    return null;
  }

  addTransition(fromState, toState, symbol) {
    if (this.alphabet.has(symbol)) {
      fromState.transitions[symbol] = toState;
      return true;
    }
    return false;
  }

  removeTransition(fromState, symbol) {
    delete fromState.transitions[symbol];
  }

  setAlphabet(symbols) {
    this.alphabet = new Set(symbols);
    // Remove transitions that are no longer valid
    this.states.forEach((state) => {
      Object.keys(state.transitions).forEach((symbol) => {
        if (!this.alphabet.has(symbol)) {
          delete state.transitions[symbol];
        }
      });
    });
  }

  simulate(inputString) {
    if (!this.startState) {
      return {
        accepted: false,
        error: "No start state defined",
        trace: [],
      };
    }

    const trace = [];
    let current = this.startState;
    trace.push({
      state: current.name,
      symbol: "START",
      remaining: inputString,
    });

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];

      if (!this.alphabet.has(symbol)) {
        return {
          accepted: false,
          error: `Symbol '${symbol}' not in alphabet`,
          trace: trace,
        };
      }

      if (!current.transitions[symbol]) {
        trace.push({
          state: current.name,
          symbol: symbol,
          remaining: inputString.substring(i + 1),
          error: "No transition defined",
        });
        return {
          accepted: false,
          error: `No transition from ${current.name} on symbol '${symbol}'`,
          trace: trace,
        };
      }

      current = current.transitions[symbol];
      trace.push({
        state: current.name,
        symbol: symbol,
        remaining: inputString.substring(i + 1),
      });
    }

    return {
      accepted: current.isAccept,
      finalState: current.name,
      trace: trace,
    };
  }

  generateAllStrings(maxLength) {
    const results = [];
    const alphabetArray = Array.from(this.alphabet);

    const generate = (current, length) => {
      if (length > maxLength) return;

      // Test current string
      const result = this.simulate(current);
      results.push({
        string: current || "ε",
        accepted: result.accepted && !result.error,
      });

      if (length < maxLength) {
        alphabetArray.forEach((symbol) => {
          generate(current + symbol, length + 1);
        });
      }
    };

    generate("", 0);
    return results;
  }
}

class DFACanvas {
  constructor(canvas, dfa) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dfa = dfa;
    this.selectedState = null;
    this.draggedState = null;
    this.mode = "addState"; // 'addState', 'addTransition', 'select', 'delete'
    this.transitionStart = null;
    this.mousePos = { x: 0, y: 0 };
    this.isDragging = false;

    this.setupEventListeners();
    this.draw();
  }

  setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener(
      "contextmenu",
      this.handleRightClick.bind(this),
    );
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const clickedState = this.dfa.getStateAt(x, y);

    if (this.mode === "addState") {
      if (!clickedState) {
        const newState = this.dfa.addState(x, y);
        if (this.dfa.states.length === 1) {
          newState.isStart = true;
          this.dfa.startState = newState;
        }
        this.draw();
      }
    } else if (this.mode === "select") {
      if (clickedState) {
        this.selectedState = clickedState;
        this.draggedState = clickedState;
        this.isDragging = true;
        this.updateStateConfig();
      } else {
        this.selectedState = null;
        this.updateStateConfig();
      }
      this.draw();
    } else if (this.mode === "addTransition") {
      if (clickedState) {
        if (!this.transitionStart) {
          this.transitionStart = clickedState;
        } else {
          this.promptTransitionSymbol(this.transitionStart, clickedState);
          this.transitionStart = null;
        }
        this.draw();
      }
    } else if (this.mode === "delete") {
      if (clickedState) {
        this.dfa.removeState(clickedState.id);
        if (this.selectedState === clickedState) {
          this.selectedState = null;
          this.updateStateConfig();
        }
        this.draw();
      }
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mousePos.x = (e.clientX - rect.left) * scaleX;
    this.mousePos.y = (e.clientY - rect.top) * scaleY;

    if (this.isDragging && this.draggedState) {
      this.draggedState.x = this.mousePos.x;
      this.draggedState.y = this.mousePos.y;
      this.draw();
    } else if (this.mode === "addTransition" && this.transitionStart) {
      this.draw();
    }
  }

  handleMouseUp(e) {
    this.isDragging = false;
    this.draggedState = null;
  }

  handleRightClick(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const clickedState = this.dfa.getStateAt(x, y);

    if (clickedState) {
      this.selectedState = clickedState;
      this.updateStateConfig();
      this.draw();
    }
  }

  promptTransitionSymbol(fromState, toState) {
    const symbols = Array.from(this.dfa.alphabet);
    const existingTransitions = Object.keys(fromState.transitions);
    const availableSymbols = symbols.filter(
      (s) =>
        !existingTransitions.includes(s) ||
        fromState.transitions[s] === toState,
    );

    if (availableSymbols.length === 0) {
      alert("All transitions from this state are already defined!");
      return;
    }

    let message = "Enter transition symbol:\n";
    message += `Available: ${availableSymbols.join(", ")}`;

    const symbol = prompt(message);

    if (symbol && this.dfa.alphabet.has(symbol)) {
      this.dfa.addTransition(fromState, toState, symbol);
      this.draw();
    } else if (symbol) {
      alert(`Symbol '${symbol}' is not in the alphabet!`);
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.transitionStart = null;
    this.draw();
  }

  updateStateConfig() {
    const stateOptions = document.getElementById("stateOptions");
    const stateConfig = document.getElementById("stateConfig");

    if (this.selectedState) {
      stateOptions.style.display = "block";
      document.getElementById("setStartState").checked =
        this.selectedState.isStart;
      document.getElementById("setAcceptState").checked =
        this.selectedState.isAccept;
      document.getElementById("stateNameInput").value = this.selectedState.name;
    } else {
      stateOptions.style.display = "none";
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Group transitions by state pairs
    const transitionGroups = new Map();
    this.dfa.states.forEach((state) => {
      Object.keys(state.transitions).forEach((symbol) => {
        const targetState = state.transitions[symbol];
        const key = `${state.id}-${targetState.id}`;
        if (!transitionGroups.has(key)) {
          transitionGroups.set(key, {
            fromState: state,
            toState: targetState,
            symbols: [],
          });
        }
        transitionGroups.get(key).symbols.push(symbol);
      });
    });

    // Draw transitions
    transitionGroups.forEach((group) => {
      this.drawTransition(group.fromState, group.toState, group.symbols);
    });

    // Draw temporary transition line
    if (this.mode === "addTransition" && this.transitionStart) {
      ctx.strokeStyle = "#667eea";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.transitionStart.x, this.transitionStart.y);
      ctx.lineTo(this.mousePos.x, this.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw states
    this.dfa.states.forEach((state) => {
      this.drawState(state);
    });
  }

  drawState(state) {
    const ctx = this.ctx;
    const isSelected = this.selectedState === state;

    // Draw outer circle for accept states
    if (state.isAccept) {
      ctx.strokeStyle = isSelected ? "#667eea" : "#2c3e50";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw main circle
    ctx.fillStyle = isSelected ? "#e3e8ff" : "white";
    ctx.strokeStyle = isSelected ? "#667eea" : "#2c3e50";
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw start arrow
    if (state.isStart) {
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.x - state.radius - 30, state.y);
      ctx.lineTo(state.x - state.radius - 5, state.y);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(state.x - state.radius - 5, state.y);
      ctx.lineTo(state.x - state.radius - 12, state.y - 5);
      ctx.lineTo(state.x - state.radius - 12, state.y + 5);
      ctx.closePath();
      ctx.fillStyle = "#2c3e50";
      ctx.fill();
    }

    // Draw state name
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.name, state.x, state.y);
  }

  drawTransition(fromState, toState, symbols) {
    const ctx = this.ctx;
    const symbolLabel = symbols.join(",");

    if (fromState === toState) {
      // Self-loop
      this.drawSelfLoop(fromState, symbolLabel);
    } else {
      // Regular transition
      const angle = Math.atan2(
        toState.y - fromState.y,
        toState.x - fromState.x,
      );
      const startX = fromState.x + fromState.radius * Math.cos(angle);
      const startY = fromState.y + fromState.radius * Math.sin(angle);
      const endX = toState.x - toState.radius * Math.cos(angle);
      const endY = toState.y - toState.radius * Math.sin(angle);

      // Check if there's a reverse transition
      const hasReverse = Object.keys(toState.transitions).some(
        (sym) => toState.transitions[sym] === fromState,
      );
      const curve = hasReverse ? 20 : 0;

      // Draw curved line
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      if (curve !== 0) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const perpAngle = angle + Math.PI / 2;
        const controlX = midX + curve * Math.cos(perpAngle);
        const controlY = midY + curve * Math.sin(perpAngle);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      } else {
        ctx.lineTo(endX, endY);
      }

      ctx.stroke();

      // Draw arrowhead
      const arrowSize = 10;
      let finalAngle = angle;

      if (curve !== 0) {
        finalAngle = Math.atan2(
          endY - (endY + curve * Math.cos(angle + Math.PI / 2)),
          endX - (endX - curve * Math.sin(angle + Math.PI / 2)),
        );
      }

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(finalAngle - Math.PI / 6),
        endY - arrowSize * Math.sin(finalAngle - Math.PI / 6),
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(finalAngle + Math.PI / 6),
        endY - arrowSize * Math.sin(finalAngle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = "#2c3e50";
      ctx.fill();

      // Draw symbol label
      let labelX, labelY;
      if (curve !== 0) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const perpAngle = angle + Math.PI / 2;
        labelX = midX + (curve / 2) * Math.cos(perpAngle);
        labelY = midY + (curve / 2) * Math.sin(perpAngle);
      } else {
        labelX = (startX + endX) / 2;
        labelY = (startY + endY) / 2;
      }

      // Measure text width for background
      ctx.font = "bold 14px Arial";
      const textWidth = ctx.measureText(symbolLabel).width;
      const padding = 4;
      const borderRadius = 999;

      // Draw rounded rectangle background (circle for short text)
      const bgHeight = 20;
      const bgWidth = Math.max(bgHeight, textWidth + padding * 2);
      const bgX = labelX - bgWidth / 2;
      const bgY = labelY - bgHeight / 2;

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
      ctx.fill();
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#2c3e50";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbolLabel, labelX, labelY);
    }
  }

  drawSelfLoop(state, symbol) {
    const ctx = this.ctx;
    const loopRadius = 18;
    const loopY = state.y - state.radius - 12;

    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Draw arc - shifted counter-clockwise for better arrowhead positioning
    ctx.arc(state.x, loopY, loopRadius, 0.7 * Math.PI, 2.15 * Math.PI);
    ctx.stroke();

    // Draw arrowhead at end of arc
    const endAngle = 2.15 * Math.PI;
    const arrowX = state.x + loopRadius * Math.cos(endAngle);
    const arrowY = loopY + loopRadius * Math.sin(endAngle);

    // Tangent angle at the end point (perpendicular to radius, pointing counter-clockwise)
    const tangentAngle = endAngle + Math.PI / 2;
    const arrowSize = 10;
    const baseWidth = arrowSize / 2;

    // Calculate arrowhead with base at arc end and tip extending away
    const tipX = arrowX + arrowSize * Math.cos(tangentAngle);
    const tipY = arrowY + arrowSize * Math.sin(tangentAngle);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY); // Tip of arrow
    ctx.lineTo(
      arrowX + baseWidth * Math.cos(tangentAngle + Math.PI / 2),
      arrowY + baseWidth * Math.sin(tangentAngle + Math.PI / 2),
    );
    ctx.lineTo(
      arrowX + baseWidth * Math.cos(tangentAngle - Math.PI / 2),
      arrowY + baseWidth * Math.sin(tangentAngle - Math.PI / 2),
    );
    ctx.closePath();
    ctx.fillStyle = "#2c3e50";
    ctx.fill();

    // Draw symbol label with dynamic width
    ctx.font = "bold 14px Arial";
    const textWidth = ctx.measureText(symbol).width;
    const padding = 4;
    const labelY = loopY - loopRadius - 5;
    const borderRadius = 999;

    // Draw rounded rectangle background (circle for short text)
    const bgHeight = 20;
    const bgWidth = Math.max(bgHeight, textWidth + padding * 2);
    const bgX = state.x - bgWidth / 2;
    const bgY = labelY - bgHeight / 2;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
    ctx.fill();
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#2c3e50";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, state.x, labelY);
  }
}

// Initialize application
const dfa = new DFA();
const canvas = document.getElementById("dfaCanvas");
const dfaCanvas = new DFACanvas(canvas, dfa);

// Toolbar event listeners
document.getElementById("addStateBtn").addEventListener("click", () => {
  dfaCanvas.setMode("addState");
  setActiveButton("addStateBtn");
});

document.getElementById("addTransitionBtn").addEventListener("click", () => {
  dfaCanvas.setMode("addTransition");
  setActiveButton("addTransitionBtn");
});

document.getElementById("selectBtn").addEventListener("click", () => {
  dfaCanvas.setMode("select");
  setActiveButton("selectBtn");
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  dfaCanvas.setMode("delete");
  setActiveButton("deleteBtn");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all states and transitions?")) {
    dfa.states = [];
    dfa.startState = null;
    dfa.stateIdCounter = 0;
    dfaCanvas.selectedState = null;
    dfaCanvas.updateStateConfig();
    dfaCanvas.draw();
  }
});

function setActiveButton(activeId) {
  const buttons = ["addStateBtn", "addTransitionBtn", "selectBtn", "deleteBtn"];
  buttons.forEach((id) => {
    document.getElementById(id).classList.remove("active");
  });
  document.getElementById(activeId).classList.add("active");
}

// Alphabet configuration
document.getElementById("setAlphabetBtn").addEventListener("click", () => {
  const input = document.getElementById("alphabetInput").value;
  const symbols = input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (symbols.length === 0) {
    alert("Please enter at least one symbol");
    return;
  }

  dfa.setAlphabet(symbols);
  document.getElementById("alphabetDisplay").textContent =
    `Current: {${symbols.join(", ")}}`;
  dfaCanvas.draw();
});

// State configuration
document.getElementById("setStartState").addEventListener("change", (e) => {
  if (dfaCanvas.selectedState) {
    if (e.target.checked) {
      // Remove start state from others
      dfa.states.forEach((s) => (s.isStart = false));
      dfaCanvas.selectedState.isStart = true;
      dfa.startState = dfaCanvas.selectedState;
    } else {
      dfaCanvas.selectedState.isStart = false;
      if (dfa.startState === dfaCanvas.selectedState) {
        dfa.startState = null;
      }
    }
    dfaCanvas.draw();
  }
});

document.getElementById("setAcceptState").addEventListener("change", (e) => {
  if (dfaCanvas.selectedState) {
    dfaCanvas.selectedState.isAccept = e.target.checked;
    dfaCanvas.draw();
  }
});

document.getElementById("stateNameInput").addEventListener("input", (e) => {
  if (dfaCanvas.selectedState) {
    dfaCanvas.selectedState.name =
      e.target.value || `q${dfaCanvas.selectedState.id}`;
    dfaCanvas.draw();
  }
});

// String testing
document.getElementById("testStringBtn").addEventListener("click", () => {
  const input = document.getElementById("testStringInput").value;
  const result = dfa.simulate(input);
  const resultDiv = document.getElementById("testResult");
  const traceDiv = document.getElementById("executionTrace");

  if (result.error) {
    resultDiv.className = "result-display error";
    resultDiv.textContent = `Error: ${result.error}`;
  } else if (result.accepted) {
    resultDiv.className = "result-display accepted";
    resultDiv.textContent = `✓ ACCEPTED - String "${input || "ε"}" is accepted by the DFA`;
  } else {
    resultDiv.className = "result-display rejected";
    resultDiv.textContent = `✗ REJECTED - String "${input || "ε"}" is rejected by the DFA`;
  }

  // Display trace
  if (result.trace && result.trace.length > 0) {
    traceDiv.className = "trace-display show";
    traceDiv.innerHTML = "<strong>Execution Trace:</strong><br>";
    result.trace.forEach((step, index) => {
      const stepText =
        step.symbol === "START"
          ? `Start in state ${step.state}`
          : `Read '${step.symbol}' → ${step.state}`;
      traceDiv.innerHTML += `<div class="trace-step">${stepText}</div>`;
    });
  } else {
    traceDiv.className = "trace-display";
  }
});

// Generate all strings
document.getElementById("generateBtn").addEventListener("click", () => {
  const maxLength = parseInt(document.getElementById("maxLengthInput").value);
  const results = dfa.generateAllStrings(maxLength);
  const displayDiv = document.getElementById("generatedStrings");

  if (results.length === 0) {
    displayDiv.innerHTML =
      '<p style="color: #868e96;">No strings generated</p>';
    return;
  }

  displayDiv.innerHTML = "";
  const acceptedCount = results.filter((r) => r.accepted).length;

  const summary = document.createElement("div");
  summary.style.marginBottom = "10px";
  summary.style.fontWeight = "bold";
  summary.innerHTML = `Total: ${results.length} strings | Accepted: ${acceptedCount} | Rejected: ${results.length - acceptedCount}`;
  displayDiv.appendChild(summary);

  results.forEach((result) => {
    const div = document.createElement("div");
    div.className = `string-result ${result.accepted ? "accepted" : "rejected"}`;
    div.innerHTML = `
            <span class="string-value">${result.string}</span>
            <span class="string-status">${result.accepted ? "✓ Accept" : "✗ Reject"}</span>
        `;
    displayDiv.appendChild(div);
  });
});

// Allow Enter key for testing
document.getElementById("testStringInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("testStringBtn").click();
  }
});
