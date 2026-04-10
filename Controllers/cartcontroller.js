const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Cart = require("../Model/cartmodel");
const Veg = require("../Model/vegmodel");

router.post("/addtocart", async (req, res) => {
  try {
    const { vegid, quantity } = req.body;

    if (!req.headers.authorization) {
      return res.status(401).send({success: false,message: "Authorization token required"});
    }

    const token = req.headers.authorization.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "loginfree@1234");
    const userid = decoded.id;

    if (!vegid || !quantity) {
      return res.status(400).send({success: false, message: "vegid and quantity are required"});
    }

    if (!mongoose.Types.ObjectId.isValid(vegid)) {
      return res.status(400).send({success: false,message: "Invalid vegid"});
    }

    if (quantity <= 0) {
      return res.status(400).send({success: false,message: "Quantity must be greater than 0"});
    }

    const veg = await Veg.findById(vegid);
    if (!veg) {
      return res.status(404).send({success: false,message: "Vegetable/Fruit not found"});
    }

    const existingCartItem = await Cart.findOne({ userid, vegid });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await existingCartItem.save();

      return res.send({success: true,message: "Cart quantity updated",data: existingCartItem});
    }

    const cartItem = await Cart.create({userid,vegid,name: veg.name,price: veg.price,quantity});

    res.send({success: true,message: "Item added to cart",data: cartItem});

  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).send({success: false,message: "Failed to add item to cart"});
  }
});


router.get("/viewcart", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({success: false, message: "Authorization token required", });
    }

    const token = req.headers.authorization.slice(7);
    const decoded = jwt.verify(token, "loginfree@1234");
    const userid = decoded.id;

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).send({success: false,message: "Invalid user id",});
    }

    const cartItems = await Cart.find({ userid })
      .populate("vegid")
      .sort({ createdAt: -1 });

    res.send({success: true,message: "Cart items fetched successfully",data: cartItems,});
  } catch (error) {
    res.status(500).send({success: false,message: "Failed to fetch cart items",});
  }
});


module.exports = router;
