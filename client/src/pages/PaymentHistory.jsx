import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get('/api/payments');
        setPayments(response.data.payments);
      } catch (error) {
        console.error('Fetch payments error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="loading">Loading payment history...</div>;

  return (
    <div className="history-container">
      <h1>Payment History</h1>
      
      {payments.length === 0 ? (
        <div className="no-payments">
          <p>No payments made yet.</p>
          <a href="/portal/payment" className="btn">Make your first payment</a>
        </div>
      ) : (
        <div className="payments-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Recipient</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td>{payment.recipientName}</td>
                  <td>{payment.recipientBank}</td>
                  <td>{payment.amount.toLocaleString()}</td>
                  <td>{payment.currency}</td>
                  <td><span className="status-completed">✓ {payment.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;