const express = require("express");
const cors = require("cors");
require("./Dbconnection");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());

const AdminRouter = require("./Controllers/admin_controller");
const UserRouter = require("./Controllers/usercontroller");
const VegRouter = require("./Controllers/vegcontroller");
const ProductRouter = require("./Controllers/productmanage");
const ContactRouter = require("./Controllers/contactcontroller");
const OrderRouter = require("./Controllers/ordercontroller");
const CartRouter = require("./Controllers/cartcontroller");
const ComplaintRouter = require("./Controllers/complaintcontroller");
const ReviewRouter = require("./Controllers/reviewcontroller");


app.use("/api", AdminRouter);
app.use("/api", UserRouter);
app.use("/api", VegRouter);
app.use("/api", ProductRouter);
app.use("/api", ContactRouter);
app.use("/api", OrderRouter);
app.use("/api", CartRouter);
app.use("/api", ComplaintRouter);
app.use("/api", ReviewRouter);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.listen(3000, () => {
  console.log("Server started at port 3000");
});
