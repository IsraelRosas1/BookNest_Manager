1.- Backend Setup (/Backend)
cd Backend
npm install
🛠 This installs:

Express
MySQL
Cors
Nodemon
🔌 Then configure your mysql.createConnection() in server.js to match your local DB setup.

Run the Backend Server:
npm start
The server will run at: http://localhost:8081

2.- Frontend Setup (/Frontend)
cd ../Frontend
npm install
🛠 This installs:

React
Vite
React DOM
Run the Frontend App:
npm run dev
The frontend will run at: http://localhost:5173

3.- MySQL Database Configuration:
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "test",
  port: 3306
});
