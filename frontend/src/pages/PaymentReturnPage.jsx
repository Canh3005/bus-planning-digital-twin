// src/pages/PaymentReturnPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './PaymentReturnPage.css';

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentResult, setPaymentResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy tất cả params từ VNPay callback
    const vnpParams = {};
    for (let [key, value] of searchParams.entries()) {
      vnpParams[key] = value;
    }

    const rspCode = vnpParams['vnp_ResponseCode'];
    const amount = vnpParams['vnp_Amount'] ? parseInt(vnpParams['vnp_Amount']) / 100 : 0;
    const orderId = vnpParams['vnp_TxnRef'];
    const bankCode = vnpParams['vnp_BankCode'];
    const cardType = vnpParams['vnp_CardType'];

    setPaymentResult({
      success: rspCode === '00',
      code: rspCode,
      amount,
      orderId,
      bankCode,
      cardType,
      message: rspCode === '00' ? 'Thanh toán thành công!' : 'Thanh toán thất bại!',
    });

    setLoading(false);
  }, [searchParams]);

  const handleBackToHome = () => {
    // Lưu thông tin thanh toán vào localStorage nếu thành công
    if (paymentResult.success) {
      const paymentData = {
        isPaid: true,
        orderId: paymentResult.orderId,
        amount: paymentResult.amount,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('paymentResult', JSON.stringify(paymentData));
    }
    
    navigate('/');
  };

  if (loading) {
    return (
      <div className="payment-return-page">
        <div className="payment-loading">
          <div className="spinner"></div>
          <p>Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-return-page">
      <div className={`payment-result-card ${paymentResult.success ? 'success' : 'failed'}`}>
        <div className="payment-icon">
          {paymentResult.success ? '✅' : '❌'}
        </div>
        
        <h1>{paymentResult.message}</h1>
        
        <div className="payment-details">
          <div className="detail-row">
            <span className="label">Mã giao dịch:</span>
            <span className="value">{paymentResult.orderId}</span>
          </div>
          
          <div className="detail-row">
            <span className="label">Số tiền:</span>
            <span className="value amount">{paymentResult.amount.toLocaleString()} VND</span>
          </div>
          
          {paymentResult.bankCode && (
            <div className="detail-row">
              <span className="label">Ngân hàng:</span>
              <span className="value">{paymentResult.bankCode}</span>
            </div>
          )}
          
          {paymentResult.cardType && (
            <div className="detail-row">
              <span className="label">Loại thẻ:</span>
              <span className="value">{paymentResult.cardType}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="label">Trạng thái:</span>
            <span className={`value status ${paymentResult.success ? 'success' : 'failed'}`}>
              {paymentResult.success ? 'Thành công' : 'Thất bại'}
            </span>
          </div>
        </div>

        {paymentResult.success && (
          <div className="success-message">
            <p>🎉 Chúc bạn có chuyến đi vui vẻ!</p>
            <p className="note">Vé xe đã được gửi vào email của bạn.</p>
          </div>
        )}

        {!paymentResult.success && (
          <div className="error-message">
            <p>Giao dịch không thành công. Vui lòng thử lại.</p>
            <p className="note">Mã lỗi: {paymentResult.code}</p>
          </div>
        )}

        <button onClick={handleBackToHome} className="btn-back-home">
          🏠 Về trang chủ
        </button>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
