const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const INITIAL_SETS = require("./playersData"); 

const app = express();
app.use(cors());

// This tells the robot: "Yes, I am alive!"
app.get('/', (req, res) => {
    res.send("Auction Server is Running!");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Helper: Shuffle
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Prepare Data
const ALL_PLAYERS = INITIAL_SETS.flatMap((set) => {
  const playersCopy = [...set.players];
  const shuffledPlayers = shuffleArray(playersCopy);
  return shuffledPlayers.map((player) => ({
    ...player,
    originalSetId: set.id,
    setName: set.name
  }));
});

let auctionState = {
  currentSet: [...ALL_PLAYERS],
  soldPlayers: [],
  unsoldPlayers: [],
  currentPlayer: null,
  currentBid: 0,
  currentBidder: null,
  isPaused: false,
  timerValue: null,        
  autoPilotTimer: null,    
  isAutoPilot: false,      
  logs: [{ type: "INFO", msg: "Server Started" }],
};

let autoPilotInterval = null;

// --- AUTO PILOT LOGIC ---
function startAutoPilotTimer() {
  if (autoPilotInterval) clearInterval(autoPilotInterval);
  
  auctionState.autoPilotTimer = 60; // Start at 60s
  io.emit("auction_update", auctionState);

  autoPilotInterval = setInterval(() => {
    if (auctionState.isPaused) return; 

    auctionState.autoPilotTimer--;
    io.emit("auction_update", { autoPilotTimer: auctionState.autoPilotTimer });

    if (auctionState.autoPilotTimer <= 0) {
      clearInterval(autoPilotInterval);
      resolveRound();
    }
  }, 1000);
}

function resolveRound() {
  if (auctionState.currentBidder) {
     const soldData = { ...auctionState.currentPlayer, soldPrice: auctionState.currentBid, soldTo: auctionState.currentBidder };
     auctionState.soldPlayers.push(soldData);
     auctionState.logs.unshift({ type: "SOLD", msg: `[AUTO] ${soldData.name} SOLD to ${soldData.soldTo}` });
  } else {
     const unsoldData = auctionState.currentPlayer;
     auctionState.unsoldPlayers.push(unsoldData);
     auctionState.logs.unshift({ type: "UNSOLD", msg: `[AUTO] ${unsoldData.name} went UNSOLD` });
  }
  
  auctionState.currentPlayer = null;
  auctionState.autoPilotTimer = null;
  io.emit("auction_update", auctionState);

  if (auctionState.isAutoPilot) {
      setTimeout(() => {
          triggerNextPlayer();
      }, 2000); 
  }
}

function triggerNextPlayer() {
  if (auctionState.currentSet.length > 0) {
    const nextPlayer = auctionState.currentSet.shift();
    auctionState.currentPlayer = nextPlayer;
    auctionState.currentBid = nextPlayer.basePrice;
    auctionState.currentBidder = null;
    auctionState.isPaused = false;
    auctionState.timerValue = null;
    
    io.emit("auction_update", auctionState);
    
    if (auctionState.isAutoPilot) {
      startAutoPilotTimer();
    }
  } else {
    auctionState.currentPlayer = null;
    auctionState.logs.unshift({ type: "INFO", msg: "Auction Completed!" });
    io.emit("auction_update", auctionState);
  }
}

io.on("connection", (socket) => {
  console.log(`Client Connected: ${socket.id}`);
  socket.emit("init_data", auctionState);

  socket.on("request_init", () => {
    socket.emit("init_data", auctionState);
  });

  socket.on("toggle_autopilot", () => {
    auctionState.isAutoPilot = !auctionState.isAutoPilot;
    const msg = auctionState.isAutoPilot ? "🤖 AUTO PILOT ENABLED" : "👤 MANUAL MODE ENABLED";
    auctionState.logs.unshift({ type: "INFO", msg: msg });
    
    if (auctionState.isAutoPilot) {
        if (auctionState.currentPlayer) {
            if (!auctionState.autoPilotTimer) startAutoPilotTimer();
        } else {
            triggerNextPlayer();
        }
    }
    
    if (!auctionState.isAutoPilot) {
        if (autoPilotInterval) clearInterval(autoPilotInterval);
        auctionState.autoPilotTimer = null;
    }

    io.emit("auction_update", auctionState);
  });

  socket.on("next_player", () => {
    triggerNextPlayer();
  });

  socket.on("start_timer", () => {
    if (auctionState.timerValue !== null || !auctionState.currentBidder) return;
    let count = 3;
    auctionState.timerValue = count;
    io.emit("auction_update", auctionState);

    const interval = setInterval(() => {
      count--;
      auctionState.timerValue = count;
      if (count <= 0) {
        clearInterval(interval);
        auctionState.timerValue = null;
        resolveRound(); 
      } else {
        io.emit("auction_update", auctionState);
      }
    }, 1000);
  });

  socket.on("toggle_pause", () => {
    auctionState.isPaused = !auctionState.isPaused;
    io.emit("auction_update", auctionState);
  });

  socket.on("auction_update", (data) => {
    Object.assign(auctionState, data);
    if (auctionState.isAutoPilot && auctionState.autoPilotTimer !== null) {
        startAutoPilotTimer(); 
    }
    io.emit("auction_update", auctionState);
  });

  // --- NEW FEATURES: EDIT PRICE & ADD PLAYER ---
  socket.on("update_base_price", (newPrice) => {
    if (auctionState.currentPlayer) {
        auctionState.currentPlayer.basePrice = parseFloat(newPrice);
        // If no one has bid yet, update the current bid requirement too
        if (!auctionState.currentBidder) {
            auctionState.currentBid = parseFloat(newPrice);
        }
        io.emit("auction_update", auctionState);
    }
  });

  socket.on("add_new_player", (playerData) => {
    const newPlayer = {
        id: "custom_" + Date.now(),
        ...playerData,
        originalSetId: "WILDCARD",
        setName: "Wildcard Entry"
    };
    // Add to the FRONT of the line
    auctionState.currentSet.unshift(newPlayer);
    auctionState.logs.unshift({ type: "INFO", msg: `New Player Added: ${newPlayer.name}` });
    io.emit("auction_update", auctionState);
  });

  socket.on("player_sold", (data) => {
    if (autoPilotInterval) clearInterval(autoPilotInterval);
    auctionState.autoPilotTimer = null;
    auctionState.soldPlayers.push(data);
    auctionState.logs.unshift({ type: "SOLD", msg: `${data.name} sold to ${data.soldTo} for ₹${data.soldPrice} Cr` });
    auctionState.currentPlayer = null;
    io.emit("auction_update", auctionState);
    if (auctionState.isAutoPilot) {
        setTimeout(() => triggerNextPlayer(), 2000);
    }
  });

  socket.on("player_unsold", (data) => {
    if (autoPilotInterval) clearInterval(autoPilotInterval);
    auctionState.autoPilotTimer = null;
    auctionState.unsoldPlayers.push(data);
    auctionState.logs.unshift({ type: "UNSOLD", msg: `${data.name} went UNSOLD` });
    auctionState.currentPlayer = null;
    io.emit("auction_update", auctionState);
    if (auctionState.isAutoPilot) {
        setTimeout(() => triggerNextPlayer(), 2000);
    }
  });

  socket.on("re_auction_player", (playerId) => {
    const playerIndex = auctionState.unsoldPlayers.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const player = auctionState.unsoldPlayers.splice(playerIndex, 1)[0];
      auctionState.currentSet.unshift(player);
      io.emit("auction_update", auctionState);
    }
  });

  socket.on("reorder_queue", (newQueue) => {
    auctionState.currentSet = newQueue;
    io.emit("auction_update", auctionState);
  });

  socket.on("reset_auction", () => {
    if (autoPilotInterval) clearInterval(autoPilotInterval);
    const FRESH_PLAYERS = INITIAL_SETS.flatMap((set) => {
      const copy = [...set.players];
      return shuffleArray(copy).map((player) => ({
        ...player,
        originalSetId: set.id,
        setName: set.name
      }));
    });

    auctionState = {
      currentSet: [...FRESH_PLAYERS], 
      soldPlayers: [],
      unsoldPlayers: [],
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      isPaused: false,
      timerValue: null,
      autoPilotTimer: null,
      isAutoPilot: false,
      logs: [{ type: "INFO", msg: "Auction Reset" }],
    };
    io.emit("init_data", auctionState);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});