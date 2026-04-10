const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Complaint = require("../Model/complaintmodel");
const Order = require("../Model/ordermodel");
const verifyToken = (req, res, next) => {
const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({success: false, message: "Invalid or missing token",});
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET || "loginfree@1234");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({success: false,message: "Invalid or expired token", });
  }
};

router.post("/createcomplaint", verifyToken, async (req, res) => {
  try {
    const userid = req.user.id;
    const { orderid, category, issue } = req.body;

    if (!orderid || !category || !issue) {
      return res.status(400).json({success: false,message: "orderid, category and issue are required",});
    }

    if (!mongoose.Types.ObjectId.isValid(orderid)) {
      return res.status(400).json({success: false,message: "Invalid order id",});
    }

    if (!["Delivery Issue", "Product Issue", "Payment Issue"].includes(category)) {
      return res.status(400).json({success: false,message: "Invalid complaint category",});
    }

    const orderExists = await Order.findById(orderid);
    if (!orderExists) {
      return res.status(404).json({success: false,message: "Order not found",});
    }

    const complaint = await Complaint.create({userid,orderid,category,issue,});

    return res.status(201).json({success: true,message: "Complaint created successfully",data: complaint,});

  } catch (error) {
    console.error("Create complaint error:", error);
    return res.status(500).json({success: false,message: "Failed to create complaint",});
  }
});

router.get("/showcomplaint", verifyToken, async (req, res) => {
  try {
    const userid = req.user.id;

    const complaints = await Complaint.find({ userid })
      .populate("orderid")
      .sort({ createdAt: -1 });

    return res.status(200).json({success: true,count: complaints.length,data: complaints,});

  } catch (error) {
    console.error("Show complaint error:", error);
    return res.status(500).json({success: false,message: "Failed to fetch complaints",});
  }
});

router.get("/getallcomplaints", verifyToken, async (req, res) => {
  try {
    const userid = req.user.id;

    const allComplaints = await Complaint.find()
      .populate("orderid")
      .populate("userid", "-password")
      .sort({ createdAt: -1 });

    const myComplaints = [];
    const otherComplaints = [];

    allComplaints.forEach((complaint) => {
      if (complaint.userid._id.toString() === userid) {
        myComplaints.push(complaint);
      } else {
        otherComplaints.push(complaint);
      }
    });

    return res.status(200).json({success: true,counts: {myComplaints: myComplaints.length,otherComplaints: otherComplaints.length,},data: {myComplaints,otherComplaints,},});

  } catch (error) {
    console.error("Get all complaints error:", error);
    return res.status(500).json({success: false,message: "Failed to fetch complaints",});
  }
});

router.put("/updateComplaintStatus", verifyToken, async (req, res) => {
  try {
    const { complaintId, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({success: false, message: "Invalid complaint id",});
    }

    const updated = await Complaint.findByIdAndUpdate(complaintId,{ status }, { new: true });

    if (!updated) {
      return res.status(404).json({success: false,message: "Complaint not found",});
    }

    return res.status(200).json({success: true,message: "Status updated",data: updated,});

  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({success: false,message: "Failed to update status",});
  }
});

module.exports = router;