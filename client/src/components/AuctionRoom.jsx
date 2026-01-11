import { useEffect, useState, useRef } from "react";
import "../App.css"; 

const TEAMS = {
  CSK: { name: "Chennai Super Kings", primary: "#F9CD05", secondary: "#005DA0", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/1200px-Chennai_Super_Kings_Logo.svg.png" },
  MI: { name: "Mumbai Indians", primary: "#004BA0", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/1200px-Mumbai_Indians_Logo.svg.png" },
  RCB: { name: "Royal Challengers Bengaluru", primary: "#EC1C24", secondary: "#000000", logo: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png" },
  KKR: { name: "Kolkata Knight Riders", primary: "#3A225D", secondary: "#B3A123", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/1200px-Kolkata_Knight_Riders_Logo.svg.png" },
  SRH: { name: "Sunrisers Hyderabad", primary: "#F7A721", secondary: "#000000", logo: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png" },
  PBKS: { name: "Punjab Kings", primary: "#DD1F2D", secondary: "#C0C0C0", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/1200px-Punjab_Kings_Logo.svg.png" },
};

const AUCTION_FACTS = [
  "IPL 2026 Mega Auction Live.",
  "Did you know? Chris Morris was once the most expensive player at ₹16.25 Cr!",
  "Mitchell Starc broke all records in 2024 with a ₹24.75 Cr bid.",
  "Teams must spend at least 75% of their total purse.",
  "Unsold players may return in the accelerated auction phase.",
  "Right To Match (RTM) cards are not available in this mock auction.",
  "Mumbai Indians and CSK share 10 titles combined."
];

const HAMMER_SOUND = "https://www.soundjay.com/misc/sounds/gavel-1.mp3";

export default function AuctionRoom({ socket, userTeam, onLogout }) {
  const myTeam = userTeam?.teamId; 
  const coachName = userTeam?.coachName || "Coach"; 
  const theme = TEAMS[myTeam] || { primary: "#3b82f6", secondary: "#1e293b" };

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [upcomingPlayers, setUpcomingPlayers] = useState([]);
  const [showSquads, setShowSquads] = useState(false);
  const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timerValue, setTimerValue] = useState(null);
  
  // AUTO PILOT STATES
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [autoPilotTimer, setAutoPilotTimer] = useState(null);
  
  const [selectedSquadId, setSelectedSquadId] = useState(null);
  const audioRef = useRef(new Audio(HAMMER_SOUND));

  useEffect(() => {
    if (!socket) return;
    socket.emit("request_init");

    const handleUpdate = (data) => {
      if (data.currentPlayer !== undefined) {
        if (data.currentPlayer && !currentPlayer) setLastSoldPlayer(null);
        setCurrentPlayer(data.currentPlayer);
      }
      if (data.currentBid !== undefined) setCurrentBid(data.currentBid);
      if (data.currentBidder !== undefined) setCurrentBidder(data.currentBidder);
      if (data.logs) setLogs(data.logs);
      if (data.soldPlayers) {
         setSoldPlayers(data.soldPlayers);
         const latest = data.soldPlayers[data.soldPlayers.length - 1];
         // Trigger Sold Animation Logic
         if (latest && (!lastSoldPlayer || latest.id !== lastSoldPlayer.id)) {
            if (data.currentPlayer === null) {
              setLastSoldPlayer(latest);
              audioRef.current.currentTime = 0; 
              audioRef.current.play().catch(e => console.log("Audio Error:", e));
              setTimeout(() => setLastSoldPlayer(null), 4000); // Overlay stays for 4s
            }
         }
      }
      if (data.currentSet) setUpcomingPlayers(data.currentSet);
      if (data.isPaused !== undefined) setIsPaused(data.isPaused);
      if (data.timerValue !== undefined) setTimerValue(data.timerValue);
      
      if (data.isAutoPilot !== undefined) setIsAutoPilot(data.isAutoPilot);
      if (data.autoPilotTimer !== undefined) setAutoPilotTimer(data.autoPilotTimer);
    };

    socket.on("init_data", handleUpdate);
    socket.on("auction_update", handleUpdate);
    return () => { socket.off("init_data"); socket.off("auction_update"); };
  }, [socket, lastSoldPlayer, currentPlayer]);

  const placeBid = (amount) => {
    if(isPaused || timerValue !== null) return; 
    socket.emit("auction_update", { currentBid: amount.toFixed(2), currentBidder: myTeam });
  };

  const getTeamStats = (teamId) => {
    const list = soldPlayers.filter(p => p.soldTo === teamId);
    const spent = list.reduce((acc, p) => acc + parseFloat(p.soldPrice), 0);
    return { list, count: list.length, purse: (70 - spent).toFixed(2) }; 
  };

  const handleDownloadSquad = () => {
    const stats = getTeamStats(myTeam);
    if (stats.list.length === 0) { alert("Your squad is empty!"); return; }

    const date = new Date().toLocaleString();
    let content = `IPL 2026 MOCK AUCTION - SQUAD REPORT\nGenerated on: ${date}\n\nTEAM: ${TEAMS[myTeam].name} (${myTeam})\nCOACH: ${coachName}\nREMAINING PURSE: ₹${stats.purse} Cr\nTOTAL PLAYERS: ${stats.count}\n\nPLAYERS PURCHASED:\n------------------------------------------------\n`;

    ["Batter", "Bowler", "All-Rounder", "Wicket Keeper"].forEach(role => {
        const players = stats.list.filter(p => p.role === role);
        if (players.length > 0) {
            content += `\n[ ${role}s ]\n`;
            players.forEach(p => content += `- ${p.name.padEnd(25)} | ₹${p.soldPrice} Cr | ${p.country}\n`);
        }
    });

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${myTeam}_Squad.txt`;
    link.click();
  };

  const getTickerContent = () => {
    const messages = [...AUCTION_FACTS];
    if (soldPlayers.length > 0) {
      const topPlayer = [...soldPlayers].sort((a, b) => parseFloat(b.soldPrice) - parseFloat(a.soldPrice))[0];
      messages.unshift(`🔥 HIGHEST BID: ${topPlayer.name} sold to ${topPlayer.soldTo} for ₹${topPlayer.soldPrice} Cr!`);
      messages.push(`Total Players Sold: ${soldPlayers.length}`);
    } else {
      messages.unshift("Waiting for the first buy of the season...");
    }
    return messages.join("  •  ");
  };

  const myStats = getTeamStats(myTeam);
  const myPurse = parseFloat(myStats.purse);
  const currentVal = parseFloat(currentBid);
  const basePrice = currentPlayer ? parseFloat(currentPlayer.basePrice) : 0;
  
  const nextBidAmount = currentVal === 0 ? basePrice : currentVal + 0.20;
  const isLeader = currentBidder === myTeam;
  const isOpening = currentVal === 0 || currentVal < basePrice;
  const canAffordStandard = myPurse >= nextBidAmount;

  const quickBids = [
    { label: "+ 50L", val: 0.50 },
    { label: "+ 1 Cr", val: 1.00 },
    { label: "+ 2 Cr", val: 2.00 },
    { label: "+ 5 Cr", val: 5.00 },
  ];

  return (
    <div style={{ height: "100vh", background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)", color: "white", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* HEADER - PREMIUM GLASS STYLE */}
      <div style={{ height: "70px", background: `linear-gradient(90deg, ${theme.secondary} 0%, rgba(30, 41, 59, 0.95) 100%)`, borderBottom: `2px solid ${theme.primary}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {TEAMS[myTeam] && <div style={{background: "white", padding: "4px", borderRadius: "50%", boxShadow: "0 0 10px rgba(255,255,255,0.2)"}}><img src={TEAMS[myTeam].logo} alt={myTeam} style={{ height: "45px", display: "block" }} /></div>}
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "900", textTransform: "uppercase", margin: 0, letterSpacing: "1px", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{myTeam ? TEAMS[myTeam].name : "Spectator Mode"}</h1>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <p style={{ fontSize: "14px", color: "#cbd5e1", margin: 0, fontWeight: "600" }}>Head Coach: <span style={{color: "white"}}>{coachName}</span></p>
              <div style={{height: "15px", width: "1px", background: "#64748b"}}></div>
              <span style={{ fontSize: "14px", color: canAffordStandard ? "#4ade80" : "#ef4444", fontWeight: "bold", textShadow: "0 0 10px rgba(74, 222, 128, 0.3)" }}>
                Purse: ₹{myPurse.toFixed(2)} Cr
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleDownloadSquad} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "13px", backdropFilter: "blur(5px)" }}>📥 SAVE</button>
          <button onClick={() => setShowSquads(!showSquads)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "13px", backdropFilter: "blur(5px)" }}>VIEW ALL</button>
          <button onClick={onLogout} style={{ padding: "8px 16px", background: "#ef4444", border: "none", borderRadius: "6px", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "13px", boxShadow: "0 4px 10px rgba(239, 68, 68, 0.4)" }}>EXIT</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", paddingBottom: "40px", position: "relative" }}> 
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }}></div>

        {/* LEFT SIDEBAR: LOGS - GLASS STYLE */}
        <div style={{ width: "260px", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(10px)", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", overflowY: "auto" }}>
            <h3 style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px", fontWeight: "bold" }}>Live Feed</h3>
            {logs.map((log, i) => (
               <div key={i} style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "11px", borderLeft: log.type==='SOLD' ? "3px solid #4ade80" : "3px solid #60a5fa", marginBottom: "5px" }}>
                 <strong style={{ color: log.type==='SOLD'?'#4ade80':'#60a5fa', display: "block" }}>{log.type}</strong> {log.msg}
               </div>
            ))}
          </div>
          <div style={{ height: "40%", padding: "10px", overflowY: "auto", background: "rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "12px", color: "#fbbf24", textTransform: "uppercase", marginBottom: "10px", fontWeight: "bold" }}>Up Next</h3>
            {upcomingPlayers.slice(0, 5).map((p, i) => (
              <div key={i} style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: 0.8 }}>
                <div style={{ fontWeight: "bold", fontSize: "13px", color: "white" }}>{p.name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{p.role} • {p.country}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: AUCTION ARENA */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative" }}>
          
          {/* SOLD POPUP OVERLAY */}
          {lastSoldPlayer && (
            <div style={{ position: "absolute", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <div className="sold-overlay-container" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", width: "600px", padding: "40px", borderRadius: "20px", border: "2px solid #eab308", textAlign: "center", position: "relative", boxShadow: "0 0 50px rgba(234, 179, 8, 0.3)" }}>
                  <div className="sold-stamp">SOLD</div>
                  <div style={{ background: "#eab308", color: "black", padding: "5px 15px", borderRadius: "20px", display: "inline-block", fontWeight: "bold", marginBottom: "20px" }}>AUCTION UPDATE</div>
                  <h1 style={{ fontSize: "48px", margin: "10px 0", color: "white" }}>{lastSoldPlayer.name}</h1>
                  <p style={{ color: "#94a3b8", fontSize: "20px" }}>{lastSoldPlayer.role} • {lastSoldPlayer.country}</p>
                  <div style={{ margin: "30px 0", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div style={{textAlign:"left"}}>
                        <div style={{fontSize: "12px", color: "#94a3b8"}}>SOLD TO</div>
                        <div style={{fontSize: "24px", fontWeight: "bold", color: "#fbbf24"}}>{TEAMS[lastSoldPlayer.soldTo]?.name}</div>
                     </div>
                     <img src={TEAMS[lastSoldPlayer.soldTo]?.logo} style={{ height: "60px" }} alt="Winner" />
                  </div>
                  <div style={{ fontSize: "50px", fontWeight: "900", color: "#4ade80" }}>₹{lastSoldPlayer.soldPrice} Cr</div>
               </div>
            </div>
          )}

          {/* AUTO PILOT BAR */}
          {isAutoPilot && currentPlayer && (
             <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "4px", background: "rgba(255,255,255,0.1)" }}>
                 <div style={{ width: `${(autoPilotTimer/60)*100}%`, height: "100%", background: "linear-gradient(90deg, #8b5cf6, #ec4899)", boxShadow: "0 0 10px #8b5cf6", transition: "width 1s linear" }}></div>
             </div>
          )}
          
          {/* 3s TIMER */}
          {timerValue !== null && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 0.5s infinite" }}>
               <div style={{ fontSize: "250px", fontWeight: "900", color: "#ef4444", textShadow: "0 0 80px rgba(239, 68, 68, 0.8)", fontFamily: "Impact, sans-serif" }}>{timerValue}</div>
            </div>
          )}

          {isPaused && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
              <div style={{ background: "#f59e0b", padding: "20px 60px", borderRadius: "10px", fontSize: "40px", fontWeight: "900", color: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>⏸️ PAUSED</div>
            </div>
          )}

          {/* MAIN PLAYER CARD - PREMIUM STYLE */}
          {currentPlayer ? (
            <div style={{ width: "100%", maxWidth: "750px", textAlign: "center", position: "relative" }}>
              
              <div style={{ background: "linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", padding: "40px", boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.6)", backdropFilter: "blur(20px)" }}>
                
                <span style={{ backgroundColor: "#3b82f6", color: "white", padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.4)" }}>{currentPlayer.role}</span>
                <h1 style={{ fontSize: "64px", fontWeight: "900", margin: "15px 0 5px", background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{currentPlayer.name}</h1>
                <p style={{ fontSize: "24px", color: "#64748b", margin: "0", fontWeight: "300" }}>{currentPlayer.country} • Base: ₹{currentPlayer.basePrice} Cr</p>
                
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px 30px", borderRadius: "16px", margin: "30px 0", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", letterSpacing: "1px" }}>CURRENT PRICE</div>
                    <div style={{ fontSize: "56px", fontWeight: "bold", color: "#4ade80", textShadow: "0 0 20px rgba(74, 222, 128, 0.1)" }}>₹{currentBid}<span style={{fontSize:"24px", opacity: 0.6}}>Cr</span></div>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", letterSpacing: "1px" }}>HIGHEST BIDDER</div>
                    <div style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                      {currentBidder ? <><span style={{ color: "#facc15", fontWeight: "bold", fontSize: "24px" }}>{currentBidder === myTeam ? "YOU" : currentBidder}</span><img src={TEAMS[currentBidder].logo} style={{height: "40px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"}} /></> : <span style={{color: "#475569", fontSize: "18px", fontStyle: "italic"}}>Waiting...</span>}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "30px" }}>
                  {isOpening ? (
                    <button 
                      disabled={isPaused || timerValue !== null || !canAffordStandard} 
                      onClick={() => placeBid(basePrice)} 
                      style={{ 
                        width: "100%", padding: "22px", 
                        background: (isPaused || timerValue !== null || !canAffordStandard) ? "#334155" : "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", 
                        border: "none", borderRadius: "12px", color: (isPaused || timerValue !== null || !canAffordStandard) ? "#94a3b8" : "white", 
                        fontSize: "20px", fontWeight: "bold", letterSpacing: "1px", 
                        cursor: (isPaused || timerValue !== null || !canAffordStandard) ? "not-allowed" : "pointer",
                        boxShadow: canAffordStandard ? "0 10px 30px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                        transition: "transform 0.1s"
                      }}
                    >
                      {canAffordStandard ? `✋ RAISE PADDLE (OPEN ₹${basePrice} Cr)` : "⚠️ INSUFFICIENT PURSE"}
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      
                      {/* MAIN BID BUTTON */}
                      <button 
                        disabled={isPaused || isLeader || timerValue !== null || !canAffordStandard} 
                        onClick={() => placeBid(currentVal + 0.20)} 
                        style={{ 
                          width: "100%", padding: "20px", 
                          background: (isPaused || isLeader || timerValue !== null || !canAffordStandard) ? "#334155" : "linear-gradient(135deg, #16a34a 0%, #14532d 100%)", 
                          border: "none", borderRadius: "12px", 
                          color: (isPaused || isLeader || timerValue !== null || !canAffordStandard) ? "#94a3b8" : "white", 
                          fontSize: "24px", fontWeight: "900", letterSpacing: "1px",
                          cursor: (isPaused || isLeader || timerValue !== null || !canAffordStandard) ? "not-allowed" : "pointer",
                          boxShadow: canAffordStandard ? "0 10px 30px rgba(22, 163, 74, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                          textShadow: "0 2px 2px rgba(0,0,0,0.3)"
                        }}
                      >
                        {canAffordStandard ? `✋ BID ₹${(currentVal + 0.20).toFixed(2)} Cr` : "⚠️ INSUFFICIENT PURSE"}
                      </button>

                      {/* QUICK BID GRID - NEON STYLE */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                        {quickBids.map((opt, idx) => {
                          const jumpAmount = currentVal + opt.val;
                          const canAffordJump = myPurse >= jumpAmount;
                          return (
                            <button 
                              key={idx}
                              disabled={isPaused || isLeader || timerValue !== null || !canAffordJump}
                              onClick={() => placeBid(jumpAmount)}
                              style={{ 
                                padding: "15px", 
                                background: (isPaused || isLeader || timerValue !== null || !canAffordJump) ? "#1e293b" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", 
                                color: (isPaused || isLeader || timerValue !== null || !canAffordJump) ? "#475569" : "white", 
                                fontWeight: "bold", fontSize: "14px",
                                cursor: (isPaused || isLeader || timerValue !== null || !canAffordJump) ? "not-allowed" : "pointer",
                                boxShadow: canAffordJump ? "0 4px 10px rgba(37, 99, 235, 0.3)" : "none"
                              }}
                            >
                              🚀 {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {isAutoPilot && <div style={{ marginTop: "20px", color: "#a78bfa", fontSize: "14px", opacity: 0.8 }}>🤖 Auto-Pilot System Active ({autoPilotTimer}s)</div>}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "60px", marginBottom: "20px", opacity: 0.5 }}>⌛</div>
              <h2 style={{ fontSize: "30px", marginBottom: "10px", color: "white" }}>Waiting for Auctioneer...</h2>
              <p>The next player will appear shortly.</p>
              {isAutoPilot && <p style={{color: "#a78bfa", marginTop: "15px", animation: "pulse 1.5s infinite"}}>System is selecting player...</p>}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: SQUAD - GLASS STYLE */}
        <div style={{ width: "300px", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(10px)", borderLeft: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                <h3 style={{ fontSize: "14px", color: "#fbbf24", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "bold" }}>My Squad</h3>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "5px" }}>{myStats.count} / 25 Players Acquired</div>
                <div style={{ width: "100%", height: "4px", background: "#334155", marginTop: "10px", borderRadius: "2px", overflow: "hidden" }}>
                   <div style={{ width: `${(myStats.count/25)*100}%`, height: "100%", background: "#22c55e" }}></div>
                </div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
                {myStats.count === 0 ? (
                    <div style={{ textAlign: "center", marginTop: "80px", color: "#64748b" }}>
                        <div>Your squad is empty.</div>
                        <div style={{ fontSize: "12px", marginTop: "5px", fontStyle: "italic" }}>Make your first bid!</div>
                    </div>
                ) : (
                    ["Batter", "Bowler", "All-Rounder", "Wicket Keeper"].map(role => {
                        const rolePlayers = myStats.list.filter(p => p.role === role);
                        if (rolePlayers.length === 0) return null;
                        return (
                            <div key={role} style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                                  <span>{role}s</span><span style={{background: "#334155", padding: "0 6px", borderRadius: "4px", color: "white"}}>{rolePlayers.length}</span>
                                </div>
                                {rolePlayers.map(p => (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", marginBottom: "5px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <span style={{color: "white"}}>{p.name}</span>
                                        <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: "12px" }}>{p.soldPrice}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
      </div>

      {/* TICKER */}
      <div className="broadcast-bar" style={{ borderTop: "1px solid #eab308" }}>
         <div className="ticker-content" style={{ color: "#fef08a", fontWeight: "600", fontSize: "14px", padding: "10px 0" }}>
            {getTickerContent()}
         </div>
      </div>

      {/* GLOBAL SQUADS POPUP */}
      {(showSquads || selectedSquadId) && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 15, 20, 0.98)", backdropFilter: "blur(15px)", zIndex: 100, overflowY: "auto", padding: "40px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", alignItems: "center" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "900", color: "white", textTransform: "uppercase", letterSpacing: "2px" }}>League Overview</h1>
              <button onClick={() => { setShowSquads(false); setSelectedSquadId(null); }} style={{ padding: "12px 30px", background: "#ef4444", color: "white", borderRadius: "30px", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 5px 15px rgba(239, 68, 68, 0.4)" }}>CLOSE</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: selectedSquadId ? "1fr" : "repeat(auto-fit, minmax(350px, 1fr))", gap: "25px" }}>
              {Object.entries(TEAMS).map(([id, team]) => {
                if (selectedSquadId && id !== selectedSquadId) return null;
                const stats = getTeamStats(id);
                return (
                  <div key={id} style={{ background: "linear-gradient(145deg, #1e293b, #0f172a)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                    <div style={{ padding: "20px", background: `linear-gradient(90deg, ${team.secondary}22, rgba(255,255,255,0.05))`, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <img src={team.logo} alt={id} style={{ height: "50px", filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.3))" }} />
                        <div><div style={{ fontWeight: "bold", fontSize: "20px", color: "white" }}>{id}</div><div style={{ fontSize: "12px", color: "#94a3b8" }}>{team.name}</div></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#4ade80", fontWeight: "bold", fontSize: "20px" }}>₹{stats.purse}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>AVAILABLE</div>
                      </div>
                    </div>
                    <div style={{ padding: "20px" }}>
                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                          {["Batter", "Bowler", "All-Rounder", "Wicket Keeper"].map(role => {
                            const rolePlayers = stats.list.filter(p => p.role === role);
                            return (
                              <div key={role} style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>{role}s ({rolePlayers.length})</div>
                                {rolePlayers.length > 0 ? (
                                  rolePlayers.map(p => (
                                    <div key={p.id} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                      <span style={{color: "#e2e8f0"}}>{p.name}</span><span style={{ color: "#fbbf24" }}>{p.soldPrice}</span>
                                    </div>
                                  ))
                                ) : <div style={{ fontSize: "11px", color: "#475569", fontStyle: "italic" }}>-</div>}
                              </div>
                            )
                          })}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}