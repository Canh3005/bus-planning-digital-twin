const Revenue = require("../models/Revenue");

class RevenueService {
  /**
     * Ghi nhận doanh thu cho một tuyến xe trong một tháng cụ thể
     * @param {String} routeId - ID của tuyến xe
     * @param {Number} month - Tháng (1-12)
     * @param {Number} year - Năm (ví dụ: 2024)
     * @param {Number} amount - Số tiền doanh thu cần ghi nhận
     
        * @returns {Object} - Đối tượng doanh thu đã được cập nhật hoặc tạo mới
        */
  async recordRevenue({ routeIds, month, year, amount }) {
    for (const routeId of routeIds) {
      let revenueRecord = await Revenue.findOne({ routeId, month, year });
      if (revenueRecord) {
        // Cập nhật doanh thu hiện tại
        revenueRecord.totalRevenue += amount;
        revenueRecord.totalTicketsSold += 1; // Giả sử mỗi lần ghi nhận là bán được 1 vé
      } else {
        // Tạo bản ghi doanh thu mới
        revenueRecord = new Revenue({
          routeId,
          month,
          year,
          totalRevenue: amount,
          totalTicketsSold: 1,
        });
      }
      await revenueRecord.save();
      return revenueRecord;
    }
  }

  /**
   * Lấy báo cáo doanh thu cho một tuyến xe trong một khoảng thời gian
   * @param {String} routeId - ID của tuyến xe
   * @param {Number} month - Tháng (1-12), nếu không cung cấp sẽ lấy theo năm
   * @param {Number} year - Năm (ví dụ: 2024)
   * @returns {Array} - Mảng các bản ghi doanh thu trong khoảng thời gian
   */
  async getRevenueReport({ month, year }) {
    if (!year) {
      throw new Error("Thiếu tham số year");
    }
    
    const yearNum = parseInt(year);
    
    if (month) {
      const monthNum = parseInt(month);
      const revenues = await Revenue.find({ month: monthNum, year: yearNum }).populate(
        "routeId",
        "routeName"
      );
      
      // Map để trả về đúng format
      return revenues.map(rev => ({
        routeId: rev.routeId?._id,
        routeName: rev.routeId?.routeName || 'N/A',
        totalRevenue: rev.totalRevenue,
        totalTicketsSold: rev.totalTicketsSold,
        month: rev.month,
        year: rev.year
      }));
    }
    
    const revenues = await Revenue.aggregate([
      { $match: { year: yearNum } },
      {
        $group: {
          _id: "$routeId",
          totalRevenue: { $sum: "$totalRevenue" },
          totalTicketsSold: { $sum: "$totalTicketsSold" },
        },
      },
      {
        $lookup: {
          from: "busroutes",
          localField: "_id",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      { $unwind: "$routeInfo" },
      {
        $project: {
          routeId: "$_id",
          routeName: "$routeInfo.routeName",
          totalRevenue: 1,
          totalTicketsSold: 1,
        },
      },
    ]);
    return revenues;
  }
}

module.exports = new RevenueService();
