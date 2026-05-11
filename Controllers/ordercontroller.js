const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Cart = require("../Model/cartmodel");
const Order = require("../Model/ordermodel");

const JWT_SECRET = process.env.JWT_SECRET || "loginfree@1234";

router.get("/checkout/:userid", async (req, res) => {
  try {
    const orders = await Order.find({
      userid: req.params.userid,
    }).populate("itemid");

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/getallorders", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate, status } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate),  $lte: new Date(endDate), };
    }

    if (status) {
      filter.status = { $in: status.split(",") };
    }

    const orders = await Order.find(filter)
      .populate("itemid")
      .populate("userid")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({success: true, total,  page, limit, count: orders.length, data: orders, });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false,  message: "Failed to fetch orders", });
  }
});

router.get("/getorder/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id",
});
    }

    const order = await Order.findById(id)
      .populate("userid", "name email address")
      .populate("itemid", "name price");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found", });
    }

    res.json({ success: true,data: order, });
  } catch (err) {
    console.error(err);
    res.status(500).json({  success: false, message: "Failed to fetch order",});
  }
});

router.get("/getmyorders", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token required",});
    }

    const token = auth.split(" ")[1];
    const { id: userid } = jwt.verify(token, JWT_SECRET);

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({ success: false, message: "Invalid user id", });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { userid };

    const orders = await Order.find(filter)
      .populate("itemid")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({success: true, total, page,  limit,count: orders.length,data: orders, });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch orders", });
  }
});

router.put("/updatestatus", async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id", });
    }

    const allowed = ["pending", "confirmed", "delivered", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status",});
    }

    const updateData = { status };

    if (status === "delivered") {
      updateData.deliverdate = new Date();
    } else {
      updateData.deliverdate = null;
    }

    const updated = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({  success: false,  message: "Order not found", });
    }

    res.json({ success: true, message: "Status updated", data: updated, });
  } catch (err) {
    console.error(err);
    res.status(500).json({success: false, message: "Failed to update status",});
  }
});

router.get("/salessummary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate),};
    }

    const summary = await Order.aggregate([ { $match: match }, { $group: { _id: null, totalOrders: { $sum: 1 }, totalItemsSold: { $sum: "$itemcount" },}, },
    ]);

    res.json({ success: true, data: { totalOrders: summary[0]?.totalOrders || 0, totalItemsSold: summary[0]?.totalItemsSold || 0, },});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch summary", });
  }
});


router.get("/getordersby", async (req, res) => {
  try {
    const { userid } = req.query;

    if (!userid) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    }

    const orders = await Order.find({
      userid: userid,
    })
      .populate("itemid")
      .populate("userid")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;