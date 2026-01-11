import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const TEAMS = {
  CSK: { name: "Chennai Super Kings", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/1200px-Chennai_Super_Kings_Logo.svg.png" },
  MI: { name: "Mumbai Indians", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/1200px-Mumbai_Indians_Logo.svg.png" },
  RCB: { name: "Royal Challengers Bengaluru", logo: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png" },
  KKR: { name: "Kolkata Knight Riders", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/1200px-Kolkata_Knight_Riders_Logo.svg.png" },
  SRH: { name: "Sunrisers Hyderabad", logo: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png" },
  PBKS: { name: "Punjab Kings", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/1200px-Punjab_Kings_Logo.svg.png" },
};

// --- ICONS ---
const DiscordIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "pointer", filter: "drop-shadow(0 0 5px #5865F2)", transition: "transform 0.2s" }}>
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" fill="#5865F2"/>
  </svg>
);

const XIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "pointer", filter: "drop-shadow(0 0 5px #ffffff)", transition: "transform 0.2s" }}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
  </svg>
);

export default function LandingPage({ onJoin }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [coachName, setCoachName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!selectedTeam || !coachName) {
      alert("Please select a team and enter your name!");
      return;
    }
    onJoin({ teamId: selectedTeam, coachName, role: "bidder" });
    navigate("/auction");
  };

  const handleAdminLogin = () => {
    if (adminPassword === "admin123") { 
      onJoin({ role: "admin" });
      navigate("/admin");
    } else {
      alert("Wrong Password!");
    }
  };

  return (
    <div style={{ 
      height: "100vh", 
      background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      color: "white", 
      fontFamily: "'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      
      {/* Background Mesh Effect */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }}></div>

      <div style={{ zIndex: 10, textAlign: "center", width: "100%", maxWidth: "900px", padding: "20px" }}>
        
        {/* TITLE */}
        <h1 style={{ fontSize: "60px", fontWeight: "900", marginBottom: "40px", textShadow: "0 4px 10px rgba(0,0,0,0.5)", background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          IPL 2026 AUCTION
        </h1>

        {/* TEAM SELECTOR */}
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
          {Object.entries(TEAMS).map(([id, team]) => (
            <div 
              key={id} 
              onClick={() => setSelectedTeam(id)}
              style={{ 
                width: "100px", height: "100px", 
                background: selectedTeam === id ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" : "rgba(255,255,255,0.05)", 
                borderRadius: "16px", 
                display: "flex", alignItems: "center", justifyContent: "center", 
                cursor: "pointer", 
                border: selectedTeam === id ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.1)",
                transform: selectedTeam === id ? "scale(1.1)" : "scale(1)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: selectedTeam === id ? "0 10px 25px -5px rgba(37, 99, 235, 0.5)" : "none"
              }}
            >
              <img src={team.logo} alt={id} style={{ height: "60px", filter: selectedTeam === id ? "none" : "grayscale(100%) opacity(0.7)", transition: "all 0.2s" }} />
            </div>
          ))}
        </div>

        {/* USER INPUTS */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginBottom: "60px" }}>
          <input 
            type="text" 
            placeholder="Enter Coach Name" 
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            style={{ padding: "15px 30px", width: "300px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white", fontSize: "16px", textAlign: "center", outline: "none" }}
          />
          
          <button 
            onClick={handleJoin}
            style={{ 
              padding: "15px 50px", 
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", 
              border: "none", borderRadius: "10px", 
              color: "white", fontSize: "18px", fontWeight: "bold", 
              cursor: "pointer", 
              boxShadow: "0 4px 15px rgba(34, 197, 94, 0.4)",
              letterSpacing: "1px",
              width: "360px"
            }}
          >
            ENTER AUCTION ROOM
          </button>
        </div>

        {/* ADMIN LOGIN */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", opacity: 0.7 }}>
          <input 
            type="password" 
            placeholder="Admin Password" 
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #475569", background: "#1e293b", color: "white", outline: "none" }}
          />
          <button 
            onClick={handleAdminLogin}
            style={{ padding: "10px 20px", background: "#6366f1", border: "none", borderRadius: "5px", color: "white", fontWeight: "bold", cursor: "pointer" }}
          >
            Control Room
          </button>
        </div>

      </div>

      {/* --- FOOTER: COPYRIGHT & SOCIALS --- */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        color: "#94a3b8",
        fontSize: "14px",
        fontWeight: "500",
        letterSpacing: "1px",
        opacity: 0.8,
        display: "flex",
        alignItems: "center",
        gap: "15px",
        zIndex: 20
      }}>
        <span>
          &copy; 2026 IPL Auction &bull; Made with <span style={{color: "#ef4444", fontSize: "18px"}}>&#10084;</span> from <span style={{color: "#3b82f6", fontWeight: "bold", textTransform: "uppercase"}}>Jazz</span>
        </span>
        
        {/* X (Twitter) Icon */}
        <a href="https://x.com/jazzhubc" target="_blank" rel="noreferrer" title="Follow on X">
           <XIcon />
        </a>

        {/* Discord Icon */}
        <a href="https://discord.gg/YhXMnwdfXq" target="_blank" rel="noreferrer" title="Join Discord Community">
           <DiscordIcon />
        </a>
      </div>

    </div>
  );
}