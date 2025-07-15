// ==============================
// 📦 Imports and Middleware Setup
// ==============================
require('dotenv').config();                   // Load environment variables
const bcrypt = require('bcrypt');             // Password hashing
const express = require('express');           // Web framework
const mysql = require('mysql');               // MySQL DB
const cors = require('cors');                 // CORS support
const jwt = require('jsonwebtoken');          // JWT for auth

const app = express();

// ==============================
// 🔧 Middleware Configuration
// ==============================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ==============================
// 🔐 Secret Key from .env file
// ==============================
const SECRET_KEY = process.env.SECRET_KEY || "default_development_key";

// ==============================
// 🛢️ MySQL Database Configuration
// ==============================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "test",
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed: ' + err.stack);
    return;
  }
  console.log('✅ Connected to DB');
});

// ==============================
// 🔐 JWT Middleware
// ==============================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ==============================
// 🌐 GET /
// ==============================
app.get('/', (req, res) => {
  return res.json("Welcome to the DB class.");
});

// ==============================
// 📝 POST /register
// ==============================
app.post('/register', async (req, res) => {
  const { name, email, password, birthday, gpa } = req.body;
  if (!name || !email || !password || !birthday || gpa === undefined) {
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO students (name, email, password, birthday, gpa) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [name, email, hashedPassword, birthday, gpa], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: "Email already exists" });
        }
        return res.status(500).json(err);
      }
      res.status(201).json({ message: "Registration successful", studentId: result.insertId });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ==============================
// 🔑 POST /login → returns JWT + user
// ==============================
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM students WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const student = results[0];
    try {
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

      const token = jwt.sign(
        { id: student.id, name: student.name, email: student.email },
        SECRET_KEY,
        { expiresIn: '2h' }
      );

      // ✅ Return token and user info
      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          birthday: student.birthday,
          gpa: student.gpa
        }
      });
    } catch (err) {
      res.status(500).json({ message: "Server error during login." });
    }
  });
});

// ==============================
// 👤 GET /me → Get current user info
// ==============================
app.get('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT id, name, email, birthday, gpa FROM students WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error", error: err });
    if (result.length === 0) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json(result[0]);
  });
});

// ==============================
// 📋 GET /listall → (Admin view)
// ==============================
app.get('/listall', authenticateToken, (req, res) => {
  const stmt = "SELECT * FROM students";
  db.query(stmt, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// ==============================
// ➕ POST /student
// ==============================
app.post('/student', authenticateToken, (req, res) => {
  const { name, birthday, gpa } = req.body;
  if (!name || !birthday || gpa === undefined) {
    return res.status(400).json({ message: "Missing required fields." });
  }
  const sql = "INSERT INTO students (name, birthday, gpa) VALUES (?, ?, ?)";
  db.query(sql, [name, birthday, gpa], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.status(201).json({ message: "Student added", insertedId: result.insertId });
  });
});

// ==============================
// 🧾 GET /student/:id
// ==============================
app.get('/student/:id', authenticateToken, (req, res) => {
  const studentId = req.params.id;
  const sql = "SELECT * FROM students WHERE id = ?";
  db.query(sql, [studentId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0) return res.status(404).json({ message: "Student not found" });
    return res.json(data[0]);
  });
});

// ==============================
// ✏️ PUT /student/:id
// ==============================
app.put('/student/:id', authenticateToken, (req, res) => {
  const studentId = req.params.id;
  const { name, birthday, gpa } = req.body;
  const sql = "UPDATE students SET name = ?, birthday = ?, gpa = ? WHERE id = ?";
  db.query(sql, [name, birthday, gpa, studentId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ message: "Student updated" });
  });
});

// ==============================
// ❌ DELETE /student/:id
// ==============================
app.delete('/student/:id', authenticateToken, (req, res) => {
  const studentId = req.params.id;
  const sql = "DELETE FROM students WHERE id = ?";
  db.query(sql, [studentId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(200).json({ message: "Student deleted" });
  });
});

// ==============================
// 📊 GET /student/:id/gpa → Optional route
// ==============================
app.get('/student/:id/gpa', authenticateToken, (req, res) => {
  const studentId = req.params.id;
  const sql = "SELECT gpa FROM students WHERE id = ?";
  db.query(sql, [studentId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ gpa: result[0].gpa });
  });
});

// ==============================
// 🚀 Start Server
// ==============================
app.listen(8081, () => {
  console.log("🚀 Server listening on port 8081");
});

//*****************************BOOKNEST*********************************8 */
//List all books
app.get('/books', (req, res) => {
  db.query("SELECT * FROM books", (err, results) => {
    if (err) return res.status(500).json(err);
    return res.json(results);
  });
});

// Search books by title
app.get('/books/search/:title', (req, res) => {
  const title = req.params.title;
  const sql = "SELECT * FROM books WHERE title LIKE ?";
  db.query(sql, [`%${title}%`], (err, results) => {
    if (err) return res.status(500).json(err);
    return res.json(results);
  });
});

//Add a new book
app.post('/books', (req, res) => {
  const { title, isbn, price, publication_year, stock } = req.body;
  const sql = "INSERT INTO books (title, isbn, price, publication_year, stock) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [title, isbn, price, publication_year, stock], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.status(201).json({ message: "Book added", bookId: result.insertId });
  });
});

//Update a book by ID
app.put('/books/:id', (req, res) => {
  const id = req.params.id;
  const { title, isbn, price, publication_year, stock } = req.body;
  const sql = "UPDATE books SET title = ?, isbn = ?, price = ?, publication_year = ?, stock = ? WHERE id = ?";
  db.query(sql, [title, isbn, price, publication_year, stock, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Book not found" });
    return res.json({ message: "Book updated" });
  });
});

//Delete a book by ID
app.delete('/books/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM books WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Book not found" });
    return res.json({ message: "Book deleted" });
  });
});
