// ==============================================
// 👤 CustomerLogin.jsx
// A login page for customers using JWT auth
// Submits credentials, stores token in localStorage,
// updates auth state, and redirects to dashboard.
// ==============================================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const StudentLogin = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:8081/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (setIsAuthenticated) setIsAuthenticated(true);

        navigate("/dashboard", { replace: true });
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Try again.");
    }
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px" }}>
      <h2>👤 Customer Login</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        /><br />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default StudentLogin;
