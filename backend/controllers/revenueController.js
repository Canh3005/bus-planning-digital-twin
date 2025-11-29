const revenueService = require('../services/revenueService');

class RevenueController {
    /**
     * GET /api/revenue/report - Lấy báo cáo doanh thu
     */
    async getRevenueReport(req, res) {
        try {
            const { month, year } = req.query;
            const report = await revenueService.getRevenueReport({ 
                month: month ? parseInt(month) : undefined, 
                year: year ? parseInt(year) : undefined 
            });
            console.log("Báo cáo doanh thu:", report);
            
            res.status(200).json({
                success: true,
                data: report,
                message: 'Lấy báo cáo doanh thu thành công'
            });
        } catch (err) {
            console.error("Lỗi khi lấy báo cáo doanh thu:", err);
            res.status(500).json({ 
                success: false,
                error: "Lỗi máy chủ nội bộ",
                message: err.message 
            });
        }
    }
}

module.exports = new RevenueController();