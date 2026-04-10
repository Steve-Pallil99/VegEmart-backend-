const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {userid: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true},
   itemid: {type: mongoose.Schema.Types.ObjectId,ref: "VegetableFruit",required: true},
   itemcount: {type: Number,required: true,min: 1},
   orderStatus: {type: String,enum: ["pending", "confirmed", "delivered", "cancelled"],default: "pending"},
   deliverdate: {type: Date,default: null}},
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);