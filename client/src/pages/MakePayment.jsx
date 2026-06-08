import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MakePayment = () => {
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientAccount: '',
    recipientBank: '',
    swiftCode: '',
    amount: '',
    currency: 'USD',
    reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api.post('/payment', formData);
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Payment of ${response.data.payment.amount} ${response.data.payment.currency} sent successfully! New balance: $${response.data.newBalance}` 
        });
        setTimeout(() => navigate('/portal/history'), 2000);
      }
    } catch (error) {
      setError({ 
        type: 'error', 
        text: error.response?.data?.error || 'Payment failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form-container">
      <h1>Make International Payment</h1>
      
      {message && <div className="success-message">{message.text}</div>}
      {error && <div className="error-message">{error.text}</div>}
      
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-row">
          <div className="form-group">
            <label>Recipient Full Name *</label>
            <input type="text" name="recipientName" value={formData.recipientName} onChange={handleChange} required placeholder="John Smith" />
          </div>
          <div className="form-group">
            <label>Recipient Account Number *</label>
            <input type="text" name="recipientAccount" value={formData.recipientAccount} onChange={handleChange} required placeholder="1234567890" />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Recipient Bank *</label>
            <input type="text" name="recipientBank" value={formData.recipientBank} onChange={handleChange} required placeholder="Bank of America" />
          </div>
          <div className="form-group">
            <label>SWIFT/BIC Code *</label>
            <input type="text" name="swiftCode" value={formData.swiftCode} onChange={handleChange} required placeholder="BOFAUS3N" />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Amount *</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required step="0.01" placeholder="1000.00" />
          </div>
          <div className="form-group">
            <label>Currency *</label>
            <select name="currency" value={formData.currency} onChange={handleChange}>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="ZAR">ZAR - South African Rand</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Reference (Optional)</label>
          <input type="text" name="reference" value={formData.reference} onChange={handleChange} placeholder="Invoice #12345" />
        </div>
        
        <button type="submit" className="btn btn-payment" disabled={loading}>
          {loading ? 'Processing Payment...' : 'Send Payment'}
        </button>
      </form>
    </div>
  );
};

export default MakePayment;