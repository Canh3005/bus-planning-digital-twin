// ~/bus-admin-backend/controllers/paymentController.js
const crypto = require('crypto');
const querystring = require('qs');
const Payment = require('../models/Payment');
const revenueService = require('../services/revenueService');
class PaymentController {
    /**
     * POST /api/payment/create_payment_url - Tạo URL thanh toán VNPay
     */
    async createPaymentUrl(req, res) {
        try {
            process.env.TZ = 'Asia/Ho_Chi_Minh';
            
            const ipAddr = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket?.remoteAddress;

            const date = new Date();
            const dateFormat = (await import('dateformat')).default;
            const createDate = dateFormat(date, 'yyyymmddHHmmss');
            const orderId = dateFormat(date, 'HHmmss');

            const amount = req.body.amount;
            const routeIds = req.body.routeIds || []; // Nhận routeIds từ frontend
            const bankCode = req.body.bankCode || '';
            const orderInfo = req.body.orderDescription || 'Thanh toan ve xe buyt';
            const orderType = req.body.orderType || 'billpayment';
            let locale = req.body.language || 'vn';
            
            if (!locale || locale === '') {
                locale = 'vn';
            }

            const currCode = 'VND';
            
            // VNPay config - nên lưu trong .env hoặc config file
            const tmnCode = process.env.VNP_TMN_CODE || 'YOUR_TMN_CODE';
            const secretKey = process.env.VNP_HASH_SECRET || 'YOUR_SECRET_KEY';
            let vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
            const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3000/payment/vnpay-return';

            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = locale;
            vnp_Params['vnp_CurrCode'] = currCode;
            vnp_Params['vnp_TxnRef'] = orderId;
            vnp_Params['vnp_OrderInfo'] = orderInfo;
            vnp_Params['vnp_OrderType'] = orderType;
            vnp_Params['vnp_Amount'] = amount * 100; // VNPay yêu cầu số tiền * 100
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;
            
            if (bankCode && bankCode !== '') {
                vnp_Params['vnp_BankCode'] = bankCode;
            }

            // Sắp xếp params theo thứ tự alphabet
            vnp_Params = this.sortObject(vnp_Params);
            console.log(vnp_Params);

            const signData = querystring.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
            vnp_Params['vnp_SecureHash'] = signed;
            
            vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

            // Lưu thông tin payment vào database
            await Payment.create({
                orderId,
                amount,
                routeIds,
                status: 'pending'
            });

            // Trả về URL để frontend redirect
            res.status(200).json({ 
                success: true,
                paymentUrl: vnpUrl 
            });
        } catch (error) {
            console.error('Lỗi tạo payment URL:', error);
            res.status(500).json({ 
                success: false,
                error: 'Lỗi máy chủ nội bộ' 
            });
        }
    }

    /**
     * GET /api/payment/vnpay_return - Xử lý callback từ VNPay
     */
    async vnpayReturn(req, res) {
        try {
            let vnp_Params = req.query;
            const secureHash = vnp_Params['vnp_SecureHash'];

            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            vnp_Params = this.sortObject(vnp_Params);

            const secretKey = process.env.VNP_HASH_SECRET || 'YOUR_SECRET_KEY';
            const signData = querystring.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            if (secureHash === signed) {
                const rspCode = vnp_Params['vnp_ResponseCode'];
                
                // vnp_ResponseCode: '00' = success, khác '00' = failed
                res.status(200).json({
                    success: rspCode === '00',
                    code: rspCode,
                    message: rspCode === '00' ? 'Thanh toán thành công' : 'Thanh toán thất bại',
                    data: vnp_Params
                });
            } else {
                res.status(200).json({
                    success: false,
                    code: '97',
                    message: 'Chữ ký không hợp lệ'
                });
            }
        } catch (error) {
            console.error('Lỗi xử lý VNPay return:', error);
            res.status(500).json({ 
                success: false,
                error: 'Lỗi máy chủ nội bộ' 
            });
        }
    }

    /**
     * GET /api/payment/vnpay_ipn - Xử lý IPN từ VNPay
     */
    async vnpayIPN(req, res) {
        try {
            let vnp_Params = req.query;
            const secureHash = vnp_Params['vnp_SecureHash'];
            
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            vnp_Params = this.sortObject(vnp_Params);

            const secretKey = process.env.VNP_HASH_SECRET || 'YOUR_SECRET_KEY';
            const signData = querystring.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            if (secureHash === signed) {
                const orderId = vnp_Params['vnp_TxnRef'];
                const rspCode = vnp_Params['vnp_ResponseCode'];
                const amount = parseInt(vnp_Params['vnp_Amount']) / 100;
                
                // Tìm payment record
                const payment = await Payment.findOne({ orderId });
                
                if (!payment) {
                    return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
                }
                
                // Kiểm tra số tiền
                if (payment.amount !== amount) {
                    return res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
                }
                
                if (rspCode === '00') {
                    // Thanh toán thành công - Cập nhật status và gọi recordRevenue
                    payment.status = 'success';
                    payment.vnpayResponse = vnp_Params;
                    await payment.save();
                    
                    // Gọi API recordRevenue
                    try {
                        const currentDate = new Date();
                        const month = currentDate.getMonth() + 1;
                        const year = currentDate.getFullYear();
                        
                        await revenueService.recordRevenue({
                            routeIds: payment.routeIds,
                            month,
                            year,
                            amount: payment.amount
                        });
                        
                        console.log('✅ Đã ghi doanh thu:', { orderId, amount, routeIds: payment.routeIds });
                    } catch (error) {
                        console.error('❌ Lỗi ghi doanh thu:', error);
                        // Không return error để VNPay vẫn nhận được success response
                    }
                    
                    res.status(200).json({ RspCode: '00', Message: 'Success' });
                } else {
                    // Thanh toán thất bại
                    payment.status = 'failed';
                    payment.vnpayResponse = vnp_Params;
                    await payment.save();
                    
                    res.status(200).json({ RspCode: '00', Message: 'Success' });
                }
            } else {
                res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
            }
        } catch (error) {
            console.error('Lỗi xử lý VNPay IPN:', error);
            res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
        }
    }

    /**
     * Helper: Sắp xếp object theo alphabet
     */
    sortObject(obj) {
        const sorted = {};
        const str = [];
        
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key));
            }
        }
        
        str.sort();
        
        for (let key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        
        return sorted;
    }
}

const paymentController = new PaymentController();

module.exports = {
    createPaymentUrl: paymentController.createPaymentUrl.bind(paymentController),
    vnpayReturn: paymentController.vnpayReturn.bind(paymentController),
    vnpayIPN: paymentController.vnpayIPN.bind(paymentController)
};
