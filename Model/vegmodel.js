const mongoose = require("mongoose");

const VegSchema = new mongoose.Schema({
    name: {type: String,required: true},
    category: {type: String,enum: ["vegetable", "fruit"],required: true},
    type: {type: String,enum: ["locally-grown", "imported"],required: true},
    pricePerKg: {type: Number,required: true },
    stockKg: {type: Number,required: true},
    originCountry: {type: String,default: "Local"}
  },{ timestamps: true }
);

module.exports = mongoose.model("VegetableFruit", VegSchema);
