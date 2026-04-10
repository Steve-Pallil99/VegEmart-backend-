const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Order = require("../Model/ordermodel");
const User = require("../Model/usermodel");
const Cart = require("../Model/cartmodel"); 

router.post("/AdminLogin", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({success: false,message: "Please enter username and password"});
    }
    const ADMIN_EMAIL = "Addtwo@edge.com";
    const ADMIN_PASSWORD = "Addtwo@1234";

    if (username !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({success: false, message: "Invalid username or password"});
    }

    const token = jwt.sign({admin: true,email: username},process.env.JWT_SECRET || "loginfree@1234",{ expiresIn: "2h" });

    return res.status(200).json({success: true,message: "Login successful",token: token});

  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({success: false,message: "Server error"});
  }
});

router.get("/salescard", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: "pending" });
    const completedOrders = await Order.countDocuments({ orderStatus: "completed" });
    const totalProducts = await Order.distinct("itemid").then(items => items.length);
    const orders = await Order.find({ orderStatus: { $ne: "cancelled" } })
      .populate("itemid");

    let totalRevenue = 0;
    orders.forEach(order => {
      if (order.itemid) {
        totalRevenue += order.itemcount * order.itemid.pricePerKg;
      }
    });

    res.json({message: "Sales card data fetched successfully",data: { totalUsers,totalOrders, totalProducts, pendingOrders, completedOrders,totalRevenue}});

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching sales card data" });
  }
});

router.get("/piesales", async (req, res) => {
  try {
    const orders = await Order.find().populate("itemid");

    let response = {
      imported: { totalQuantity: 0, totalRevenue: 0, totalOrders: 0 },
      "locally-grown": { totalQuantity: 0, totalRevenue: 0, totalOrders: 0 }
    };

    orders.forEach(order => {
      const item = order.itemid;
      if (!item) return;

      const quantity = order.itemcount;
      const revenue = quantity * item.pricePerKg;

      if (item.type === "imported") {
        response.imported.totalQuantity += quantity;
        response.imported.totalRevenue += revenue;
        response.imported.totalOrders += 1;
      }

      if (item.type === "locally-grown") {
        response["locally-grown"].totalQuantity += quantity;
        response["locally-grown"].totalRevenue += revenue;
        response["locally-grown"].totalOrders += 1;
      }
    });

    res.json({ message: "Pie sales data fetched successfully", data: response });

  } catch (error) {
    res.status(500).json({ message: "Server error while fetching pie sales data" });
  }
});

router.get("/usergrowth", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {$group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }}},
      { $sort: { _id: 1 } }
    ]);

    res.json({ message: "User growth data fetched successfully", data: userGrowth });

  } catch (error) {
    res.status(500).json({ message: "Server error while fetching user growth data" });
  }
});

router.get("/salesgrowth", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesGrowth = await Order.aggregate([
      {$match: { createdAt: { $gte: sevenDaysAgo },  orderStatus: { $ne: "cancelled" } }},
      {$lookup: { from: "vegetablefruits", localField: "itemid", foreignField: "_id",  as: "itemDetails" }},
      { $unwind: "$itemDetails" },
      { $group: {_id: {  date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } },  totalRevenue: { $sum: { $multiply: ["$itemcount", "$itemDetails.pricePerKg"] }  } }},
      { $sort: { "_id.date": 1 } }
    ]);

    res.json({ message: "Sales growth data fetched successfully", data: salesGrowth });

  } catch (error) {
    res.status(500).json({ message: "Server error while fetching sales growth data" });
  }
});

router.get("/daygrowth", async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      orderStatus: { $ne: "cancelled" }
    });
    const yesterdayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      orderStatus: { $ne: "cancelled" }
    });
    const difference = todayOrders - yesterdayOrders;
    let percentage = 0;
    if (yesterdayOrders > 0) {
      percentage = ((difference / yesterdayOrders) * 100).toFixed(2);
    }
    let trend = "nochange";
    if (difference > 0) trend = "increase";
    if (difference < 0) trend = "decrease";

    res.json({message: "Day growth fetched successfully",data: {todayOrders,yesterdayOrders,difference,percentage,trend}});

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching day growth" });
  }
});

module.exports = router;