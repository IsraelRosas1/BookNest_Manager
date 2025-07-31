import React, { useEffect, useState } from 'react';

// Use this for styling

const CustomerDashboard = () => {
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage("Please log in to view your dashboard.");
      setLoading(false);
      return;
    }

    // Fetch both customer info and order history concurrently
    Promise.all([
      fetch('http://localhost:8081/me', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch('http://localhost:8081/order-history', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([customerData, ordersData]) => {
      setCustomer(customerData);

      // Group the flat array of order items into a structured orders array.
      // This is necessary because the backend returns a flat list where each entry is a single book in an order.
      const groupedOrders = ordersData.reduce((acc, currentItem) => {
        const { order_id, order_date, total_amount, status, book_id, title, quantity, price_at_time_of_order } = currentItem;
        
        if (!acc[order_id]) {
          acc[order_id] = {
            order_id,
            order_date,
            total_amount,
            status,
            items: []
          };
        }

        acc[order_id].items.push({
          book_id,
          title,
          quantity,
          price_at_time_of_order
        });

        return acc;
      }, {});

      // Convert the grouped object back into an array for rendering
      setOrders(Object.values(groupedOrders));
      setLoading(false);
    })
    .catch(err => {
      console.error("Error fetching data:", err);
      setMessage("Error fetching data. Please try again later.");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center mt-8 text-gray-700">Loading your dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Customer Dashboard</h2>
        {message && <p className="text-red-500 mb-4">{message}</p>}
        {customer ? (
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{customer.name}</span>!
            Your email: <span className="font-semibold">{customer.email}</span>
          </p>
        ) : (
          <p className="text-gray-600">Please log in to view your details.</p>
        )}
      </div>

      <h3 className="text-2xl font-bold text-gray-800 mb-4">View Order History</h3>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center">No orders found.</p>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.order_id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Order ID: {order.order_id}</h4>
                  <p className="text-sm text-gray-500">Ordered on: {new Date(order.order_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">Total: ${order.total_amount.toFixed(2)}</p>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              <ul className="divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <li key={`${item.book_id}-${index}`} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-700">{item.title}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900">${(item.price_at_time_of_order * item.quantity).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;
