// src/components/Controls/CheckoutBox.jsx
import React from 'react';
import './CheckoutBox.css';

const CheckoutBox = ({ tripCost, isPaid, onCheckout }) => {
  if (!tripCost) return null;
  
  return (
    <div className="checkout-box">
      <p>
        Giá vé: <b>{tripCost.toLocaleString()} VND</b>
      </p>
      <button 
        onClick={onCheckout} 
        className={`btn-checkout ${isPaid ? 'paid' : ''}`}
        disabled={isPaid}
      >
        {isPaid ? '✅ Đã thanh toán' : '💳 Thanh toán & Đi'}
      </button>
    </div>
  );
};

export default CheckoutBox;
