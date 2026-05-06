const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Review = require("../Model/reviewmodel");

router.get("/productreview/:product_id", async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product_id" });
    }

    const reviews = await Review.find({ product_id })
      .populate("user_id", "name") 
      .sort({ createdAt: -1 });

    res.json({success: true,count: reviews.length,data: reviews,});
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch reviews" });
  }
});

router.get("/myproductreview/:product_id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Token required" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "loginfree@1234");
    const review = await Review.findOne({product_id: req.params.product_id,user_id: decoded.id,});

    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "No review found" });

    res.json({ success: true, data: review });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch review" });
    }
});

router.post("/customerreview", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Token required" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "loginfree@1234");

    const { product_id, rating, message } = req.body;

    const exists = await Review.findOne({product_id,user_id: decoded.id,});

    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Already reviewed" });

    const review = await Review.create({product_id,user_id: decoded.id,rating,message: message.trim(),});

    res.status(201).json({success: true,data: review,});
  } catch (error) {
    res.status(500).json({success: false,message: "Submit failed",error});
  }
});

module.exports = router;