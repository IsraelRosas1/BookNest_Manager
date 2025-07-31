import React, { useEffect, useState } from 'react';

// Use this for styling

const StudentDashboard = () => {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect fetches the list of available books and the current user's details.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please log in to place an order.");
      setLoading(false);
      return;
    }

    // Fetch user details to get the shipping address required by the backend.
    const fetchUser = fetch("http://localhost:8081/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.json());

    // Fetch all available books.
    const fetchBooks = fetch("http://localhost:8081/books")
      .then(res => res.json());

    // Wait for both fetches to complete.
    Promise.all([fetchUser, fetchBooks])
      .then(([userData, booksData]) => {
        if (userData && userData.customer_id) {
          setUser(userData);
          setBooks(booksData);
        } else {
          setMessage("Failed to fetch user data or not logged in.");
        }
        setLoading(false);
      })
      .catch(err => {
        setMessage("Error fetching data.");
        setLoading(false);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages

    if (!user) {
      return setMessage("Please log in to place an order.");
    }

    // Find the selected book from the books list to get its details
    const selectedBook = books.find(book => book.book_id === parseInt(selectedBookId));

    if (!selectedBook) {
      return setMessage("Please select a valid book.");
    }

    const orderData = {
      // The backend expects a 'books' array, even for a single item.
      books: [{
        book_id: selectedBook.book_id,
        quantity: parseInt(quantity)
      }],
      shipping_address: user.shipping_address,
      // Calculate the total amount on the frontend.
      total_amount: selectedBook.price * parseInt(quantity)
    };

    const token = localStorage.getItem("token");

    fetch("http://localhost:8081/place-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(error => { throw new Error(error.message); });
        }
        return res.json();
    })
    .then(data => {
      setMessage(data.message || "Order placed!");
      // Optionally, refresh the book list to show updated stock
      window.location.reload();
    })
    .catch(error => {
      setMessage(`Error placing order: ${error.message}`);
    });
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">🛒 Place Order</h2>
      {message && (
        <p className={`p-3 rounded-lg text-center font-semibold mb-4 ${message.startsWith("Error") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </p>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-gray-600">
            Shipping to: <span className="font-medium text-gray-800">{user.shipping_address}</span>
          </p>
          <div>
            <label htmlFor="book-select" className="block text-gray-700 font-medium mb-1">Select Book:</label>
            <select
              id="book-select"
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">--Choose a book--</option>
              {books.map(book => (
                <option key={book.book_id} value={book.book_id}>
                  {book.title} (${book.price}) - {book.stock} in stock
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity-input" className="block text-gray-700 font-medium mb-1">Quantity:</label>
            <input
              id="quantity-input"
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Place Order
          </button>
        </form>
      ) : (
        <p className="text-center text-gray-600">Please log in to see your order options.</p>
      )}
    </div>
  );
}

export default StudentDashboard;
