//
// This is the corrected server.js file for the BookNest system.
// It has been updated to correctly interact with the provided database schema.
// All table and column names have been synchronized with the SQL CREATE TABLE statements.
// The order placement and order history logic has been completely revised.
//

// ==============================
// 📦 Imports and Middleware Setup
// ==============================
require('dotenv').config();      // Load environment variables
const bcrypt = require('bcrypt');      // Password hashing
const express = require('express');    // Web framework
const mysql = require('mysql');        // MySQL DB
const cors = require('cors');          // CORS support
const jwt = require('jsonwebtoken');   // JWT for auth

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
    database: "test", // Assuming you've created a database named 'booknest'
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
    return res.json("Welcome to the BookNest API.");
});

// ==============================
// 📝 POST /register
// ==============================
app.post('/register', async (req, res) => {
    // The schema uses 'shipping_address', so we get it from the request body.
    const { name, email, password, shipping_address } = req.body;
    if (!name || !email || !password || !shipping_address) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // The SQL query is updated to use 'shipping_address'.
        const sql = `INSERT INTO customers (name, email, password, shipping_address) VALUES (?, ?, ?, ?)`;
        db.query(sql, [name, email, hashedPassword, shipping_address], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: "Email already exists" });
                }
                return res.status(500).json(err);
            }
            res.status(201).json({ message: "Customer registration successful", customerId: result.insertId });
        });
    } catch (err) {
        res.status(500).json({ message: "Server error during customer registration." });
    }
});

// ==============================
// 🔑 POST /login → returns JWT + user
// ==============================
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM customers WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const customer = results[0];
        try {
            const isMatch = await bcrypt.compare(password, customer.password);
            if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

            // JWT payload uses the correct customer_id and shipping_address
            const token = jwt.sign(
                { customer_id: customer.customer_id, name: customer.name, email: customer.email },
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    customer_id: customer.customer_id,
                    name: customer.name,
                    email: customer.email,
                    shipping_address: customer.shipping_address
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
    const customerId = req.user.customer_id; // Using customer_id from JWT payload

    db.query('SELECT customer_id, name, email, shipping_address FROM customers WHERE customer_id = ?', [customerId], (err, results) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        if (results.length === 0) return res.sendStatus(404);
        res.json(results[0]);
    });
});

// ==============================
// 📋 GET /customers → (Admin view)
// ==============================
app.get('/customers', authenticateToken, (req, res) => {
    const sql = "SELECT customer_id, name, email, shipping_address FROM customers";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to fetch customers." });
        return res.json(data);
    });
});

// ==============================
// 📚 Get all books
// ==============================
app.get("/books", (req, res) => {
    db.query("SELECT * FROM books", (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(results);
    });
});

// ==============================
// 📝 POST /place-order
// ==============================
app.post("/place-order", authenticateToken, async (req, res) => {
    const customerId = req.user.customer_id;
    const { books, shipping_address, total_amount, status } = req.body; // 'books' is an array of {book_id, quantity, price}

    if (!books || books.length === 0 || !shipping_address || !total_amount) {
        return res.status(400).json({ message: "Invalid order data." });
    }

    try {
        // Start a transaction
        await new Promise((resolve, reject) => {
            db.beginTransaction(err => {
                if (err) reject(err);
                resolve();
            });
        });

        // 1. Create a new order
        const insertOrderSql = "INSERT INTO orders (customer_id, shipping_address, total_amount, status) VALUES (?, ?, ?, ?)";
        const orderResult = await new Promise((resolve, reject) => {
            db.query(insertOrderSql, [customerId, shipping_address, total_amount, status || 'Pending'], (err, result) => {
                if (err) {
                    db.rollback(() => reject(err));
                }
                resolve(result);
            });
        });

        const orderId = orderResult.insertId;

        // 2. Insert each book into order_items and update book stock
        for (const book of books) {
            // Check book stock before placing the order
            const checkStockSql = "SELECT stock, price FROM books WHERE book_id = ?";
            const stockResult = await new Promise((resolve, reject) => {
                db.query(checkStockSql, [book.book_id], (err, results) => {
                    if (err) {
                        db.rollback(() => reject(err));
                    }
                    if (results.length === 0 || results[0].stock < book.quantity) {
                         db.rollback(() => reject({ message: `Insufficient stock for book ${book.book_id}` }));
                    }
                    resolve(results[0].price);
                });
            });

            // Insert into order_items
            const insertOrderItemSql = "INSERT INTO order_items (order_id, book_id, quantity, price_at_time_of_order) VALUES (?, ?, ?, ?)";
            await new Promise((resolve, reject) => {
                db.query(insertOrderItemSql, [orderId, book.book_id, book.quantity, stockResult], (err) => {
                    if (err) {
                        db.rollback(() => reject(err));
                    }
                    resolve();
                });
            });

            // Update book stock
            const updateStockSql = "UPDATE books SET stock = stock - ? WHERE book_id = ?";
            await new Promise((resolve, reject) => {
                db.query(updateStockSql, [book.quantity, book.book_id], (err) => {
                    if (err) {
                        db.rollback(() => reject(err));
                    }
                    resolve();
                });
            });
        }

        // Commit the transaction
        await new Promise((resolve, reject) => {
            db.commit(err => {
                if (err) {
                    db.rollback(() => reject(err));
                }
                resolve();
            });
        });

        res.status(201).json({ message: "✅ Order placed successfully!", orderId: orderId });

    } catch (err) {
        console.error("Transaction failed:", err);
        res.status(500).json({ message: "Server error during order placement.", error: err.message || err });
    }
});

// ==============================
// 🧾 GET /order-history
// ==============================
app.get('/order-history', authenticateToken, (req, res) => {
    const customerId = req.user.customer_id;

    // This query correctly joins the orders, order_items, and books tables.
    const query = `
      SELECT
          o.order_id,
          o.order_date,
          o.total_amount,
          o.status,
          b.book_id,
          b.title,
          b.isbn,
          oi.quantity,
          oi.price_at_time_of_order
      FROM orders AS o
      JOIN order_items AS oi ON o.order_id = oi.order_id
      JOIN books AS b ON oi.book_id = b.book_id
      WHERE o.customer_id = ?
      ORDER BY o.order_date DESC;
    `;

    db.query(query, [customerId], (err, results) => {
        if (err) {
            console.error('Error fetching order history:', err);
            return res.status(500).json({ error: 'Failed to fetch order history' });
        }
        res.json(results);
    });
});

// ==============================
// 🔍 Search books by title
// ==============================
app.get('/books/search/:title', (req, res) => {
    const title = req.params.title;
    const sql = "SELECT * FROM books WHERE title LIKE ?";
    db.query(sql, [`%${title}%`], (err, results) => {
        if (err) return res.status(500).json(err);
        return res.json(results);
    });
});

// ==============================
// ➕ POST /books (Add a new book)
// ==============================
app.post('/books', (req, res) => {
    const { title, isbn, price, publication_year, stock } = req.body;
    const sql = "INSERT INTO books (title, isbn, price, publication_year, stock) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, isbn, price, publication_year, stock], (err, result) => {
        if (err) return res.status(500).json(err);
        return res.status(201).json({ message: "Book added", bookId: result.insertId });
    });
});

// ==============================
// ✏️ PUT /books/:id (Update a book)
// ==============================
app.put('/books/:id', (req, res) => {
    const bookId = req.params.id; // Using book_id for consistency
    const { title, isbn, price, publication_year, stock } = req.body;
    const sql = "UPDATE books SET title = ?, isbn = ?, price = ?, publication_year = ?, stock = ? WHERE book_id = ?";
    db.query(sql, [title, isbn, price, publication_year, stock, bookId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Book not found" });
        return res.json({ message: "Book updated" });
    });
});

// ==============================
// ❌ DELETE /books/:id (Delete a book)
// ==============================
app.delete('/books/:id', (req, res) => {
    const bookId = req.params.id; // Using book_id for consistency
    db.query("DELETE FROM books WHERE book_id = ?", [bookId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Book not found" });
        return res.json({ message: "Book deleted" });
    });
});

// ==============================
// 🚀 Start Server
// ==============================
app.listen(8081, () => {
    console.log("🚀 Server listening on port 8081");
});
