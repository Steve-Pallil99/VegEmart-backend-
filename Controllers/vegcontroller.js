const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const VegModel = require("../Model/vegmodel");

const router = express.Router();

router.post("/additem", (req, res) => {
  const { name, category, type, pricePerKg, stockKg, originCountry } = req.body;

  if (!req.headers.authorization) {
    return res.status(401).send("Authorization token required");
  }

  const token = req.headers.authorization.slice(7);
  const decoded = jwt.verify(token, "loginfree@1234");
  const user_id = decoded.id;

  if (!name || !category || !type || pricePerKg === undefined || stockKg === undefined) {
    return res.status(400).send("All required fields must be provided");
  }

  if (!["vegetable", "fruit"].includes(category)) {
    return res.status(400).send("Invalid category");
  }

  if (!["locally-grown", "imported"].includes(type)) {
    return res.status(400).send("Invalid type");
  }

  if (pricePerKg <= 0 || stockKg < 0) {
    return res.status(400).send("Invalid price or stock");
  }

  VegModel.create({ name, category, type, pricePerKg, stockKg, originCountry: originCountry || "Local", user_id,})
    .then((data) => res.send({ message: "Item added", data }))
    .catch(() => res.status(500).send("Error adding item"));
});

router.get("/viewitems", (req, res) => {
  VegModel.find()
    .sort({ createdAt: -1 })
    .then((items) => res.send(items)) 
    .catch(() => res.status(500).send("Error fetching items"));
});

router.delete("/deleteitem/:id", (req, res) => {
  VegModel.findByIdAndDelete(req.params.id)
    .then(() => res.send("Item deleted"))
    .catch(() => res.status(500).send("Delete failed"));
});

module.exports = router;
