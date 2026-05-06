const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const VegModel = require("../Model/vegmodel");

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "loginfree@1234", (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

router.post("/additem", authMiddleware, async (req, res) => {
  try {
    const item = await VegModel.create({...req.body,pricePerKg: Number(req.body.pricePerKg),stockKg: Number(req.body.stockKg),});
    res.status(201).json({ success: true, data: item });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false,  message: "Authentication failed. Please login again." });
    }

    console.error("Add item error:", err);

    res.status(400).json({  success: false,  message: err.message || "Failed to add item" });
  }
});

router.get("/viewitem/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({  success: false, message: "Product ID is required",  });
    }

    const item = await VegModel.findById(id).select( "_id name image price" );

    if (!item) {
      return res.status(404).json({  success: false,  message: "Product not found", });
    }

    return res.status(200).json({ success: true, data: item, });
  } catch (err) {
    console.error("VIEW ITEM ERROR:", err);

    return res.status(500).json({ success: false, message: "Server error while fetching product", });
  }
});

router.get("/viewitems", async (req, res) => {
  try {
    const items = await VegModel.find({})
      .select("_id name price image")
      .lean();

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("View Items Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch items",
    });
  }
});

router.delete("/deleteitem/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id))
    return res.status(400).json({ message: "Invalid ID" });

  const deleted = await VegModel.findByIdAndDelete(id);
  if (!deleted)
    return res.status(404).json({ message: "Item not found" });

  res.json({ success: true, message: "Item deleted" });
});

router.put("/edititem/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id))
    return res.status(400).json({ message: "Invalid ID" });

  const updated = await VegModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated)
    return res.status(404).json({ message: "Item not found" });

  res.json({ success: true, data: updated });
});

module.exports = router;
