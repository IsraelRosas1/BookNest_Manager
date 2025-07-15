
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link
} from "react-router-dom";

// Page imports
import StudentLogin from "./pages/StudentLoginPage";
import StudentRegister from "./pages/StudentRegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentGPAReport from "./pages/StudentGPAReport";
import BookManagerPage from './pages/BookManagerPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔐 Check token on first load
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  // 🔓 Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return (
    <Router>
      {/* Outer wrapper to center content */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px" }}>
        {/* Header */}
        <header style={{ marginBottom: "20px" }}>
          <h1 style={{ marginBottom: "10px" }}>🎓 Student Portal</h1>
          <nav style={{ marginBottom: "10px" }}>
            {!isAuthenticated ? (
              <>
                <Link to="/login" style={{ marginRight: "10px" }}>Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" style={{ marginRight: "10px" }}>Dashboard</Link>
                <Link to="/gpa" style={{ marginRight: "10px" }}>GPA Report</Link>
                <Link to="/books" style={{ marginRight: "10px" }}>Book Manager</Link> 

                <button onClick={handleLogout} style={{ cursor: "pointer" }}>Logout</button>
              </>
            )}
          </nav>
          <hr />
        </header>

        {/* Routes */}
        <main>
          <Routes>
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
            />
            <Route
              path="/login"
              element={<StudentLogin setIsAuthenticated={setIsAuthenticated} />}
            />
            <Route path="/register" element={<StudentRegister />} />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <StudentDashboard /> : <Navigate to="/login" />}
            />
            <Route path="/books" element={<BookManagerPage />} />

            <Route
              path="/gpa"
              element={isAuthenticated ? <StudentGPAReport /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
