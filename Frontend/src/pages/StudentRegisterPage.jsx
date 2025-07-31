// ==============================================
// 🧾 CustomerRegisterPage.jsx
// Handles registration for new customers
// Collects name, email, password, and shipping address
// ==============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function StudentRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    // CORRECTED: Changed 'address' to 'shipping_address' to match the backend
    shipping_address: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = (e) => {
    e.preventDefault();

    fetch('http://localhost:8081/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.customerId) navigate('/login');
      });
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px" }}>
      <h2>🧾 Register Customer</h2>

      <form onSubmit={handleRegister}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
          required
        /><br />

        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          required
        /><br />

        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
        /><br />

        <input
          // CORRECTED: Changed 'name' attribute to 'shipping_address'
          name="shipping_address"
          value={form.shipping_address}
          onChange={handleChange}
          placeholder="Shipping Address"
          required
        /><br />

        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default StudentRegister;
