import { useEffect, useState, useRef } from "react";
import "../App.css";

const TEAMS = {
  CSK: { name: "Chennai Super Kings", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/1200px-Chennai_Super_Kings_Logo.svg.png" },
  MI: { name: "Mumbai Indians", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/1200px-Mumbai_Indians_Logo.svg.png" },
  RCB: { name: "Royal Challengers Bengaluru", logo: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png" },
  KKR: { name: "Kolkata Knight Riders", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/1200px-Kolkata_Knight_Riders_Logo.svg.png" },
  SRH: { name: "Sunrisers Hyderabad", logo: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png" },
  PBKS: { name: "Punjab Kings", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/1200px-Punjab_Kings_Logo.svg.png" },
};

const AUCTION_FACTS = [
  "IPL 2026 Mega Auction Live from the Control Room.",
  "Did you know? Chris Morris was once the most expensive player at ₹16.25 Cr!",
  "Mitchell Starc broke all records in 2024 with a ₹24.75 Cr bid.",
  "Teams must spend at least 75% of their total purse.",
  "Unsold players may return in the accelerated auction phase.",
  "Right To Match (RTM) cards are not available in this mock auction.",
  "Mumbai Indians and CSK share 10 titles combined."
];

export default function AdminPanel({ socket, onLogout }) {
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState(null);
  const [upcomingPlayers, setUpcomingPlayers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timerValue, setTimerValue] = useState(null);
  
  // AUTO PILOT STATES
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [autoPilotTimer, setAutoPilotTimer] = useState(null);

  const [showSquads, setShowSquads] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false); // New Modal State
  const [expandedSets, setExpandedSets] = useState({});
  const dragItem = useRef();
  const dragOverItem = useRef();

  useEffect(() => {
    if (!socket) return;
    socket.emit("request_init");

    const handleUpdate = (data) => {
      if (data.currentPlayer !== undefined) setCurrentPlayer(data.currentPlayer);
      if (data.currentBid !== undefined) setCurrentBid(data.currentBid);
      if (data.currentBidder !== undefined) setCurrentBidder(data.currentBidder);
      if (data.currentSet) setUpcomingPlayers(data.currentSet);
      if (data.logs) setLogs(data.logs);
      if (data.soldPlayers) setSoldPlayers(data.soldPlayers);
      if (data.unsoldPlayers) setUnsoldPlayers(data.unsoldPlayers);
      if (data.isPaused !== undefined) setIsPaused(data.isPaused);
      if (data.timerValue !== undefined) setTimerValue(data.timerValue);
      
      if (data.isAutoPilot !== undefined) setIsAutoPilot(data.isAutoPilot);
      if (data.autoPilotTimer !== undefined) setAutoPilotTimer(data.autoPilotTimer);
    };

    socket.on("init_data", handleUpdate);
    socket.on("auction_update", handleUpdate);
    return () => { socket.off("init_data"); socket.off("auction_update"); };
  }, [socket]);

  // --- HELPERS ---
  const getTickerContent = () => AUCTION_FACTS.join(" • ");
  const getGroupedPlayers = () => {
    const groups = {};
    upcomingPlayers.forEach((p) => {
      const setId = p.originalSetId || "OTHERS";
      if (!groups[setId]) groups[setId] = { id: setId, name: p.setName || "Mixed", players: [] };
      groups[setId].players.push(p);
    });
    return Object.values(groups);
  };
  const grouped = getGroupedPlayers();
  const toggleSet = (id) => setExpandedSets(prev => ({...prev, [id]: !prev[id]}));
  
  // --- DRAG & DROP ---
  const handleDragStart = (e, type, index, parentIndex) => { dragItem.current = {type, index, parentIndex}; e.target.style.opacity = "0.5"; };
  const handleDragEnter = (e, type, index, parentIndex) => { dragOverItem.current = {type, index, parentIndex}; };
  const handleDragEnd = (e) => {
      e.target.style.opacity = "1";
      if (!dragItem.current || !dragOverItem.current) return;
      if (dragItem.current.type === "SET" && dragOverItem.current.type === "SET") {
          const list = [...grouped];
          const item = list.splice(dragItem.current.index, 1)[0];
          list.splice(dragOverItem.current.index, 0, item);
          const flat = list.flatMap(g => g.players);
          setUpcomingPlayers(flat);
          socket.emit("reorder_queue", flat);
      }
      dragItem.current = null;
      dragOverItem.current = null;
  };

  // --- ACTIONS ---
  const handleNext = () => socket.emit("next_player");
  const handlePause = () => socket.emit("toggle_pause");
  const handleSold = () => {
      if(!currentBidder) {
          const t = prompt("Enter Team ID (CSK, MI...):");
          if(t && TEAMS[t.toUpperCase()]) socket.emit("player_sold", {...currentPlayer, soldPrice: currentBid, soldTo: t.toUpperCase()});
      } else socket.emit("player_sold", {...currentPlayer, soldPrice: currentBid, soldTo: currentBidder});
  };
  const handleUnsold = () => socket.emit("player_unsold", currentPlayer);
  const handleReset = () => { if(confirm("Reset?")) socket.emit("reset_auction"); };
  const handleReAuction = (id) => { if(confirm("Return player?")) socket.emit("re_auction_player", id); };
  
  const handleToggleAutoPilot = () => socket.emit("toggle_autopilot");
  const handleStartTimer = () => socket.emit("start_timer");

  // --- NEW: EDIT PRICE ---
  const handleEditBasePrice = () => {
      const newPrice = prompt("Enter New Base Price (Cr):", currentPlayer.basePrice);
      if (newPrice && !isNaN(newPrice)) {
          socket.emit("update_base_price", newPrice);
      }
  };

  // --- NEW: ADD PLAYER FORM SUBMIT ---
  const handleAddNewPlayer = (e) => {
      e.preventDefault();
      const form = e.target;
      const newPlayer = {
          name: form.pName.value,
          country: form.pCountry.value,
          role: form.pRole.value,
          basePrice: parseFloat(form.pPrice.value)
      };
      socket.emit("add_new_player", newPlayer);
      setShowAddPlayer(false);
  };

  const getTeamStats = (id) => {
      const list = soldPlayers.filter(p => p.soldTo === id);
      const spent = list.reduce((a,b) => a + parseFloat(b.soldPrice), 0);
      return { list, count: list.length, purse: (70 - spent).toFixed(2) };
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "white", fontFamily: "Arial" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "380px", borderRight: "1px solid #334155", backgroundColor: "#1e293b", display: "flex", flexDirection: "column", paddingBottom: "50px" }}>
         <div style={{height:"25%", padding: "10px", borderBottom: "1px solid #334155", overflowY: "auto"}}>
            <h3 style={{fontSize: "14px", color: "#4ade80"}}>Team Purses</h3>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px"}}>
                {Object.keys(TEAMS).map(id => <div key={id} style={{fontSize:"12px", display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.05)", padding:"5px", borderRadius:"4px"}}>{id} <span style={{color:"#fbbf24"}}>₹{getTeamStats(id).purse}</span></div>)}
            </div>
         </div>
         <div style={{height:"15%", padding: "10px", background: "rgba(239,68,68,0.05)", borderBottom: "1px solid #334155", overflowY: "auto"}}>
             <h3 style={{fontSize: "12px", color: "#f87171"}}>Unsold</h3>
             {unsoldPlayers.map(p => <div key={p.id} style={{fontSize:"12px", display:"flex", justifyContent:"space-between", padding:"2px 0"}}>{p.name} <button onClick={()=>handleReAuction(p.id)} style={{background:"none", border:"1px solid #facc15", color:"#facc15", cursor:"pointer"}}>↺</button></div>)}
         </div>
         <div style={{flex:1, padding: "10px", overflowY: "auto"}}>
             <h3 style={{fontSize: "14px", color: "#fbbf24"}}>Upcoming Sets</h3>
             {grouped.map((g, i) => (
                 <div key={g.id} draggable onDragStart={(e)=>handleDragStart(e,"SET",i)} onDragEnter={(e)=>handleDragEnter(e,"SET",i)} onDragEnd={handleDragEnd} style={{marginBottom:"10px", background:"#0f172a", border:"1px solid #334155", borderRadius:"8px"}}>
                     <div onClick={()=>toggleSet(g.id)} style={{padding:"10px", cursor:"pointer", fontSize:"13px", display:"flex", justifyContent:"space-between"}}><span>☰ {g.name}</span><span style={{color:"#94a3b8"}}>{g.players.length}</span></div>
                     {expandedSets[g.id] && g.players.map(p => <div key={p.id} style={{padding:"5px 10px", fontSize:"12px", color:"#cbd5e1", borderTop:"1px solid #334155"}}>{p.name}</div>)}
                 </div>
             ))}
         </div>
      </div>

      {/* CONTROL AREA */}
      <div style={{ flex: 1, padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        
        {/* TOP BAR */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
           <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>AUCTION CONTROL</h1>
           <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowAddPlayer(true)} style={{ padding: "10px 20px", background: "#059669", border: "none", borderRadius: "5px", color: "white", fontWeight: "bold", cursor: "pointer" }}>➕ ADD PLAYER</button>
              
              <button 
                onClick={handleToggleAutoPilot} 
                style={{ padding: "10px 20px", backgroundColor: isAutoPilot ? "#7c3aed" : "#334155", border: "1px solid #8b5cf6", color: "white", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
              >
                {isAutoPilot ? `🤖 AUTO ON (${autoPilotTimer}s)` : "👤 MANUAL MODE"}
              </button>
              
              <button onClick={handlePause} style={{ padding: "10px", background: isPaused?"#22c55e":"#f59e0b", border:"none", borderRadius:"5px", color:"white", fontWeight: "bold" }}>{isPaused?"RESUME":"PAUSE"}</button>
              <button onClick={() => setShowSquads(true)} style={{ padding: "10px", background: "#2563eb", border: "none", borderRadius:"5px", color:"white", fontWeight: "bold" }}>SQUADS</button>
              <button onClick={handleReset} style={{ padding: "10px", background: "#ef4444", border:"none", borderRadius:"5px", color:"white", fontWeight: "bold" }}>RESET</button>
              <button onClick={onLogout} style={{ padding: "10px", background: "#64748b", border:"none", borderRadius:"5px", color:"white", fontWeight: "bold" }}>EXIT</button>
           </div>
        </div>

        {currentPlayer ? (
          <div style={{ textAlign: "center", backgroundColor: "#1e293b", padding: "40px", borderRadius: "20px", border: "1px solid #334155", width: "100%", maxWidth: "800px", opacity: isPaused ? 0.5 : 1 }}>
            
            {isAutoPilot && (
                <div style={{ width: "100%", height: "10px", backgroundColor: "#334155", borderRadius: "5px", marginBottom: "20px", overflow: "hidden" }}>
                    <div style={{ width: `${(autoPilotTimer / 60) * 100}%`, height: "100%", backgroundColor: autoPilotTimer < 10 ? "#ef4444" : "#8b5cf6", transition: "width 1s linear" }}></div>
                </div>
            )}

            <span style={{ backgroundColor: "#3b82f6", padding: "5px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold" }}>{currentPlayer.role}</span>
            <div style={{ marginTop: "10px", color: "#fbbf24" }}>{currentPlayer.setName}</div>
            <h2 style={{ fontSize: "60px", margin: "10px 0", fontWeight: "900" }}>{currentPlayer.name}</h2>
            
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
                <p style={{ fontSize: "28px", color: "#94a3b8", margin: 0 }}>{currentPlayer.country} • Base: ₹{currentPlayer.basePrice} Cr</p>
                {/* EDIT PRICE BUTTON */}
                <button onClick={handleEditBasePrice} style={{ background: "#475569", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", padding: "5px 10px" }} title="Edit Base Price">✏️</button>
            </div>
            
            <div style={{ backgroundColor: "#0f172a", padding: "30px", borderRadius: "15px", marginBottom: "30px", border: "1px solid #334155" }}>
              <div style={{ color: "#64748b", fontSize: "14px", textTransform: "uppercase" }}>Current Bid</div>
              <div style={{ fontSize: "80px", color: "#4ade80", fontWeight: "bold" }}>₹{currentBid} <span style={{fontSize: "30px"}}>Cr</span></div>
              <div style={{ marginTop: "20px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center", gap: "15px" }}>
                {currentBidder ? <><img src={TEAMS[currentBidder].logo} style={{height:"40px"}} /><span style={{color:"#facc15", fontSize:"24px", fontWeight:"bold"}}>{currentBidder}</span></> : <span style={{color:"#64748b", fontSize:"20px"}}>No Bids Yet</span>}
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
              <button disabled={isPaused || isAutoPilot} onClick={handleSold} style={{ padding: "20px 40px", background: "#22c55e", border: "none", borderRadius: "10px", color: "white", fontWeight: "bold", cursor: isPaused||isAutoPilot?"not-allowed":"pointer", width: "200px", fontSize: "20px" }}>SOLD</button>
              
              <button 
                disabled={isPaused || !currentBidder || timerValue !== null || isAutoPilot} 
                onClick={handleStartTimer} 
                style={{ padding: "20px 40px", background: (!currentBidder || timerValue !== null || isAutoPilot) ? "#334155" : "#d97706", border: "none", borderRadius: "10px", color: "white", fontWeight: "bold", cursor: "pointer", width: "200px", fontSize: "20px" }}
              >
                {timerValue !== null ? `⏱️ ${timerValue}` : "⏱️ TIMER"}
              </button>

              <button disabled={isPaused || isAutoPilot} onClick={handleUnsold} style={{ padding: "20px 40px", background: "#ef4444", border: "none", borderRadius: "10px", color: "white", fontWeight: "bold", cursor: isPaused||isAutoPilot?"not-allowed":"pointer", width: "200px", fontSize: "20px" }}>UNSOLD</button>
            </div>
            {isAutoPilot && <div style={{marginTop: "20px", color: "#a78bfa"}}>System will auto-decide in {autoPilotTimer}s</div>}
          </div>
        ) : (
          <div style={{ marginTop: "100px", textAlign: "center" }}>
             <h2 style={{color: "#94a3b8", fontSize:"30px"}}>Waiting...</h2>
             {isAutoPilot ? 
                <div style={{color: "#a78bfa", fontSize: "20px", animation: "pulse 1s infinite"}}>🤖 Auto Pilot is finding next player...</div> :
                <button onClick={handleNext} style={{padding:"20px 60px", background:"#3b82f6", border:"none", borderRadius:"10px", color:"white", fontSize:"24px", cursor:"pointer", fontWeight:"bold"}}>START NEXT PLAYER ➡️</button>
             }
          </div>
        )}
      </div>

      {/* SQUADS OVERLAY */}
      {showSquads && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.95)", zIndex: 100, padding: "40px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <h1 style={{ fontSize: "30px", fontWeight: "bold" }}>SQUAD DASHBOARD</h1>
            <button onClick={() => setShowSquads(false)} style={{ padding: "10px 30px", background: "#dc2626", color: "white", borderRadius: "5px", border: "none" }}>CLOSE</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
            {Object.entries(TEAMS).map(([id, team]) => {
              const stats = getTeamStats(id);
              return (
                <div key={id} style={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "10px" }}>
                        <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
                            <img src={team.logo} style={{height:"40px"}} />
                            <div style={{fontWeight:"bold"}}>{id}</div>
                        </div>
                        <div style={{color:"#fbbf24", fontWeight:"bold"}}>₹{stats.purse}</div>
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                        {["Batter", "Bowler", "All-Rounder", "Wicket Keeper"].map(role => (
                            <div key={role}>
                                <div style={{fontSize:"10px", color:"#64748b", fontWeight:"bold"}}>{role}s</div>
                                {stats.list.filter(p=>p.role===role).map(p=><div key={p.id} style={{fontSize:"12px", display:"flex", justifyContent:"space-between"}}><span>{p.name}</span><span style={{color:"#4ade80"}}>{p.soldPrice}</span></div>)}
                            </div>
                        ))}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD PLAYER MODAL */}
      {showAddPlayer && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#1e293b", padding: "30px", borderRadius: "12px", width: "400px", border: "1px solid #334155" }}>
                  <h2 style={{ marginBottom: "20px" }}>Add New Player</h2>
                  <form onSubmit={handleAddNewPlayer} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      <input name="pName" placeholder="Player Name" required style={{ padding: "10px", borderRadius: "5px", border: "1px solid #475569", background: "#0f172a", color: "white" }} />
                      <input name="pCountry" placeholder="Country" defaultValue="India" style={{ padding: "10px", borderRadius: "5px", border: "1px solid #475569", background: "#0f172a", color: "white" }} />
                      <select name="pRole" style={{ padding: "10px", borderRadius: "5px", border: "1px solid #475569", background: "#0f172a", color: "white" }}>
                          <option>Batter</option>
                          <option>Bowler</option>
                          <option>All-Rounder</option>
                          <option>Wicket Keeper</option>
                      </select>
                      <input name="pPrice" type="number" step="0.01" placeholder="Base Price (Cr)" defaultValue="2.00" style={{ padding: "10px", borderRadius: "5px", border: "1px solid #475569", background: "#0f172a", color: "white" }} />
                      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                          <button type="submit" style={{ flex: 1, padding: "10px", background: "#22c55e", border: "none", borderRadius: "5px", color: "white", fontWeight: "bold", cursor: "pointer" }}>ADD</button>
                          <button type="button" onClick={() => setShowAddPlayer(false)} style={{ flex: 1, padding: "10px", background: "#ef4444", border: "none", borderRadius: "5px", color: "white", fontWeight: "bold", cursor: "pointer" }}>CANCEL</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* TICKER */}
      <div className="broadcast-bar">
         <div className="ticker-content">
            {getTickerContent()}
         </div>
      </div>

    </div>
  );
}