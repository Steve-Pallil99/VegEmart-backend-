const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Cart = require("../Model/cartmodel");
const Order = require("../Model/ordermodel");

router.post("/createorder", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({success: false,message: "Authorization token required",});
    }

    const token = req.headers.authorization.slice(7);
    const decoded = jwt.verify(token, "loginfree@1234");
    const userid = decoded.id;

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).send({success: false,message: "Invalid user id",});
    }

    const cartItems = await Cart.find({ userid });

    if (cartItems.length === 0) {
      return res.status(400).send({success: false,message: "Cart is empty",});
    }

    const orderData = cartItems.map(item => ({userid,itemid: item.vegid,itemcount: item.quantity,status: "pending",}));

    await Order.insertMany(orderData);
    await Cart.deleteMany({ userid });

    res.send({success: true,message: "Order created successfully",});

  } catch (error) {
    console.error(error);
    res.status(500).send({success: false,message: "Failed to create order",});
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
      filter.createdAt = {$gte: new Date(startDate),$lte: new Date(endDate),};
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

    res.status(200).json({success: true,total,page,limit,count: orders.length,data: orders,});

  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({success: false,message: "Failed to fetch all orders",});
  }
});

router.get("/getorder/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: "Invalid order id",});
    }

    const order = await Order.findById(id)
      .populate("userid", "name email address")
      .populate("itemid", "name price");

    if (!order) {
      return res.status(404).json({success: false,message: "Order not found",});
    }

    res.status(200).json({success: true,data: order,});

  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({success: false, message: "Failed to fetch order details",});
  }
});

router.get("/getmyorders", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({success: false,message: "Authorization token required",});
    }

    const token = req.headers.authorization.split(" ")[1];
    const { id: userid } = jwt.verify(token, "loginfree@1234");

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).send({success: false,message: "Invalid user id",});
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

    res.send({success: true,total,page,limit,count: orders.length,data: orders,});

  } catch (error) {
    console.error(error);
    res.status(500).send({success: false,message: "Failed to fetch orders",});
  }
});

router.get("/getuserorders", async (req, res) => {
  try {
    const { userid, startDate, endDate, status } = req.query;

    if (!userid) {
      return res.status(400).json({success: false,message: "User id is required",});
    }

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({success: false,message: "Invalid user id",});
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = { userid };

    if (startDate && endDate) {
      filter.createdAt = {$gte: new Date(startDate),$lte: new Date(endDate),};
    }

    if (status) {
      filter.status = { $in: status.split(",") };
    }

    const orders = await Order.find(filter)
      .populate("userid")   
      .populate("itemid")   
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({success: true,total,page,limit,count: orders.length,data: orders,});

  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({success: false,message: "Failed to fetch user orders",});
  }
});

router.get("/salessummary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {$gte: new Date(startDate),$lte: new Date(endDate),};
    }

    const summary = await Order.aggregate([
      { $match: matchStage },
      {$group: {_id: null,totalOrders: { $sum: 1 },totalItemsSold: { $sum: "$itemcount" },},},
    ]);

    res.status(200).json({success: true,data: {totalOrders: summary[0]?.totalOrders || 0,totalItemsSold: summary[0]?.totalItemsSold || 0,},
    });

  } catch (error) {
    console.error("Sales summary error:", error);
    res.status(500).json({success: false,message: "Failed to fetch sales summary",});
  }
});

router.get("/ordersdaily", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {$gte: new Date(startDate),$lte: new Date(endDate),};
    }

    const data = await Order.aggregate([
      { $match: matchStage },
      {$group: {_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },},orderCount: { $sum: 1 }, },},
      { $sort: { _id: 1 } },
      {$project: {_id: 0,date: "$_id",orderCount: 1,},},
    ]);

    res.status(200).json({success: true,data});

  } catch (error) {
    console.error("Orders daily error:", error);
    res.status(500).json({success: false,message: "Failed to fetch orders daily",});
  }
});

router.put("/updatestatus", async (req, res) => {
  try {
    const { id, orderStatus } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false,message: "Invalid order id",});
    }

    const allowedStatus = ["pending", "confirmed", "delivered", "cancelled"];

    if (!allowedStatus.includes(orderStatus)) {
      return res.status(400).json({success: false,message: "Invalid order status",});
    }

    let updateData = {orderStatus,};

    if (orderStatus === "delivered") {
      updateData.deliverdate = new Date();
    }

    if (orderStatus !== "delivered") {
      updateData.deliverdate = null;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id,updateData,{ new: true });

    if (!updatedOrder) {
      return res.status(404).json({success: false,message: "Order not found",});
    }

    res.status(200).json({success: true,message: "Order status updated successfully",data: updatedOrder,});

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({success: false,message: "Failed to update order status",});
  }
});

router.get("/invoice", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({success: false,  message: "Authorization token required",});
    }

    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "loginfree@1234");
    const userid = decoded.id;

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({success: false,message: "Invalid user id",});
    }

    const orders = await Order.aggregate([{$match: {userid: new mongoose.Types.ObjectId(userid),},},{ $lookup: { from: "vegetablefruits", localField: "itemid", foreignField: "_id", as: "item", },},{ $unwind: "$item" },{$group: {_id: "$itemid",product: { $first: "$item.name" },price: { $first: "$item.price" },quantity: { $sum: "$itemcount" },},},{ $project: { _id: 0, product: 1, price: 1, quantity: 1,},},]);

    res.status(200).json({success: true,data: orders,});

  } catch (error) {
    console.error("Invoice API error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice",});
  }
});

module.exports = router;