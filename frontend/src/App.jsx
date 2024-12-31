import React, { useState, useEffect } from "react";
import Hero from "./components/Hero.jsx";
import About from "./components/About.jsx";
import Interface from "./components/chat/Interface.jsx";
import AuthPage from "./components/AuthPage.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import {jwtDecode} from "jwt-decode";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
    // State hooks
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);

    // Function to handle login
    const handleLogin = (user) => {
        setUser(user);
    };

    // Function to handle logout
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("token");
    };

    // Effect to check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
            } catch (err) {
                console.error("Invalid token:", err);
                localStorage.removeItem("token");
            }
        }
    }, []);

    // Function to handle messages
    const handleMessages = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    };

    // Function to send a message to the backend
    const sendMessageToBackend = async (message) => {
        if (!message.trim()) return;

        // Add user message to the chat
        handleMessages({ text: message, sender: "user" });

        try {
            const response = await fetch("http://localhost:5000/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch bot response");
            }

            const data = await response.json();

            // Add bot response to the chat
            handleMessages({ text: data.reply || "No valid response from bot.", sender: "bot" });
        } catch (error) {
            console.error("Error:", error);
            handleMessages({ text: "Failed to connect to the Gemini service.", sender: "bot" });
        }
    };

    return (
        <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
            <Router>
                <div>
                    {/* Navbar */}
                    <Navbar user={user} onLogout={handleLogout} />

                    {/* Routes */}
                    <Routes>
                        <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
                        <Route path="/" element={<Hero user={user} />} />
                        <Route path="/about" element={<About />} />
                        <Route
                            path="/chat"
                            element={
                                // Directly route to the chat page without checking authentication
                                <Interface
                                    messages={messages}
                                    handleMessages={handleMessages}
                                    sendMessage={sendMessageToBackend}
                                />
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </GoogleOAuthProvider>
    );
}

export default App;
