const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    userid: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true},
    vegid: {type: mongoose.Schema.Types.ObjectId, ref: "VegetableFruit",required: true},
    quantity: {type: Number,required: true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
