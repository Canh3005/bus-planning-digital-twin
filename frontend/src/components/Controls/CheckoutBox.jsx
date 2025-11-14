// src/components/Controls/CheckoutBox.jsx
import React from 'react';
import './CheckoutBox.css';

const CheckoutBox = ({ tripCost, onCheckout }) => {
  if (!tripCost) return null;
  
  return (
    <div className="checkout-box">
      <p>
        Giá vé: <b>{tripCost.toLocaleString()} VND</b>
      </p>
      <button onClick={onCheckout} className="btn-checkout">
        💳 THANH TOÁN & ĐI
      </button>
    </div>
  );
};

export default CheckoutBox;
