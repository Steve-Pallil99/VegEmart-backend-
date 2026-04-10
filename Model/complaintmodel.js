const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
  { 
    userid: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true},
    orderid: {type: mongoose.Schema.Types.ObjectId,ref: "Order",required: true},
    category: {type: String,enum: ["Delivery Issue", "Product Issue", "Payment Issue"],required: true},
    issue: {type: String,required: true,trim: true},
    status: {type: String,enum: ["open", "in-progress", "resolved"],default: "open"}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", ComplaintSchema);
