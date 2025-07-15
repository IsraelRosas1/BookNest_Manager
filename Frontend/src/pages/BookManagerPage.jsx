import React, { useState, useEffect } from 'react';

function BookManagerPage() {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    title: '',
    isbn: '',
    price: '',
    publication_year: '',
    stock: ''
  });
  const [editingId, setEditingId] = useState(null);

  const fetchBooks = () => {
    fetch('http://localhost:8081/books')
      .then(res => res.json())
      .then(data => setBooks(data));
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    fetch(`http://localhost:8081/books/search/${searchTerm}`)
      .then(res => res.json())
      .then(data => setBooks(data));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `http://localhost:8081/books/${editingId}` : 'http://localhost:8081/books';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(() => {
        setForm({ title: '', isbn: '', price: '', publication_year: '', stock: '' });
        setEditingId(null);
        fetchBooks();
      });
  };

  const handleEdit = (book) => {
    setForm(book);
    setEditingId(book.id);
  };

  const handleDelete = (id) => {
    if (window.confirm('Do you want to delete?')) {
      fetch(`http://localhost:8081/books/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => fetchBooks());
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">BookNest Inventory Manager</h2>

      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search books by title"
          className="border p-2 mr-2 rounded"
        />
        <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input name="title" value={form.title} onChange={handleChange} placeholder="Title" required className="border p-2 w-full rounded" />
        <input name="isbn" value={form.isbn} onChange={handleChange} placeholder="ISBN" required className="border p-2 w-full rounded" />
        <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} placeholder="Price" required className="border p-2 w-full rounded" />
        <input name="publication_year" type="number" value={form.publication_year} onChange={handleChange} placeholder="Publication Year" required className="border p-2 w-full rounded" />
        <input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="Stock" required className="border p-2 w-full rounded" />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          {editingId ? 'Update Book' : 'Add Book'}
        </button>
      </form>

      <table className="w-full table-auto border-separate border-spacing-y-3">

      <thead>
  <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
    <th className="px-4 py-3">Title</th>
    <th className="px-4 py-3">ISBN</th>
    <th className="px-4 py-3 text-right">Price</th>
    <th className="px-4 py-3">Year</th>
    <th className="px-4 py-3">Stock</th>
    <th className="px-4 py-3 text-right">Actions</th> {/* 👈 Add this */}
  </tr>
</thead>

<tbody>
  {books.map(book => (
    <tr key={book.id} className="bg-white shadow rounded hover:shadow-md transition-shadow duration-200">
      <td className="px-4 py-3">{book.title}</td>
      <td className="px-4 py-3">{book.isbn}</td>
      <td className="px-4 py-3 text-right">${book.price}</td>
      <td className="px-4 py-3">{book.publication_year}</td>
      <td className="px-4 py-3">{book.stock}</td>
      <td className="px-4 py-3 text-right"> {/* 👈 And here */}
        <button onClick={() => handleEdit(book)} className="text-blue-600 hover:underline mr-4">Edit</button>
        <button onClick={() => handleDelete(book.id)} className="text-red-600 hover:underline">Delete</button>
      </td>
    </tr>
  ))}
</tbody>



      </table>
    </div>
  );
}

export default BookManagerPage;
