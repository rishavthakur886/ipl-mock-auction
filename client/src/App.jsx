import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import  io  from "socket.io-client";

// Import Components
import LandingPage from "./components/LandingPage";
import AuctionRoom from "./components/AuctionRoom";
import AdminPanel from "./components/AdminPanel";

// Connect to Backend
// REVERT TO THIS:
const socket = io("http://localhost:5000");

function App() {
  // Initialize state from LocalStorage to prevent data loss on refresh
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

  const [userTeam, setUserTeam] = useState(() => {
    const saved = localStorage.getItem("userTeam");
    return saved ? JSON.parse(saved) : null;
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("isAdmin", isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    if (userTeam) {
      localStorage.setItem("userTeam", JSON.stringify(userTeam));
    } else {
      localStorage.removeItem("userTeam");
    }
  }, [userTeam]);

  // --- THIS IS THE FUNCTION YOU WERE MISSING ---
  const handleAdminLogin = () => {
    console.log("Admin Logged In Successfully!");
    setIsAdmin(true); // This sets the state, which triggers the Route change below
  };
  // --------------------------------------------

  const handleTeamSelect = (teamId, coachName) => {
    setUserTeam({ teamId, coachName });
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setUserTeam(null);
    localStorage.clear();
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* LANDING PAGE ROUTE */}
        <Route 
          path="/" 
          element={
            // Logic: If already logged in, go to respective page. Else show Landing.
            userTeam ? <Navigate to="/auction" /> : 
            isAdmin ? <Navigate to="/admin" /> :
            // NEW / FIXED CODE
            <LandingPage 
                onJoin={(data) => {
                if (data.role === "admin") {
                handleAdminLogin();
            } else {
            handleTeamSelect(data);
           }
          }} 
        />
          } 
        />

        {/* AUCTION ROOM ROUTE */}
        <Route 
          path="/auction" 
          element={
            userTeam ? (
              <AuctionRoom socket={socket} userTeam={userTeam} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          } 
        />

        {/* ADMIN PANEL ROUTE */}
        <Route 
          path="/admin" 
          element={
            isAdmin ? (
              <AdminPanel socket={socket} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
