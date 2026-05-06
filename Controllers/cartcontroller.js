const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Cart = require("../Model/cartmodel");
const Veg = require("../Model/vegmodel");

router.post("/addtocart", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false,  message: "Authorization token required",});
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify( token,  process.env.JWT_SECRET || "loginfree@1234" );
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token", });
    }

    const userid = decoded.id;

    const { vegid, quantity } = req.body;

    if (!vegid || quantity === undefined) {
      return res.status(400).json({ success: false,  message: "vegid and quantity are required", });
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty === 0) {
      return res.status(400).json({ success: false,  message: "Quantity must be non-zero number", });
    }

    if (!mongoose.Types.ObjectId.isValid(vegid)) {
      return res.status(400).json({ success: false, message: "Invalid vegid", });
    }

    const veg = await Veg.findById(vegid).select("_id");
    if (!veg) {
      return res.status(404).json({ success: false,  message: "Item not found", });
    }

    let existing = await Cart.findOne({ userid, vegid });

    if (qty > 0) {
      if (existing) {
        existing.quantity += qty;
        await existing.save();

        return res.json({ success: true, message: "Cart updated", data: existing, });
      }

      const cartItem = await Cart.create({ userid, vegid, quantity: qty, });

      return res.json({ success: true, message: "Item added to cart",  data: cartItem, });
    }

    if (qty < 0) {
      if (!existing) {
        return res.status(404).json({ success: false,  message: "Item not in cart", });
      }

      existing.quantity += qty;

      if (existing.quantity <= 0) {
        await Cart.deleteOne({ _id: existing._id });

        return res.json({ success: true, message: "Item removed from cart", });
      }

      await existing.save();

      return res.json({ success: true, message: "Cart updated", data: existing, });
    }

  } catch (err) {
    console.error("Add to Cart Error:", err);

    return res.status(500).json({ success: false, message: "Server error", });
  }
});


router.get("/viewcart", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false,  message: "Authorization token required", });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "loginfree@1234");
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token", });
    }

    const userid = decoded.id;

    const cartItems = await Cart.find({ userid })
      .populate({ path: "vegid", select: "name pricePerKg", })
      .sort({ createdAt: -1 })
      .lean();

    const data = cartItems.map((item) => ({ _id: item._id,  productId: item.vegid?._id,  
       name: item.vegid?.name, price: item.vegid?.pricePerKg, 
       quantity: item.quantity, subtotal: (item.vegid?.pricePerKg || 0) * item.quantity, }));

    return res.json({ success: true, count: data.length,data, });

  } catch (err) {
    console.error("viewcart error:", err);

    return res.status(500).json({ success: false,message: "Failed to fetch cart",});
  }
});

module.exports = router;
