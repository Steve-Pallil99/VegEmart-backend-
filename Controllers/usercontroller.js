const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const User = require("../Model/usermodel");
const Order = require("../Model/ordermodel");

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;


const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

const comparePassword = (password, storedPassword) => {
  return new Promise((resolve, reject) => {
    const [salt, originalHash] = storedPassword.split(":");

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);

      resolve(originalHash === derivedKey.toString("hex"));
    });
  });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, address, password } = req.body;

    if (!name || !email || !address || !password) {
      return res.status(400).json({success: false,message: "All fields are required.",});
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({success: false,message: "Invalid email format.",});
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({success: false, message:"Weak password. Include uppercase, lowercase, number, special char, and at least 8 characters.",});
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({success: false,message: "User already registered.",});
    }

    const hashedPassword = await hashPassword(password);

    await User.create({name,email,address,password: hashedPassword,});

    return res.status(201).json({success: true,message: "Registration successful!"});

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Registration failed.",});
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({success: false,message: "Email and password are required.",});
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({success: false,message: "Invalid email format.",});
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({success: false,message: "Invalid email or password.",});
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({success: false,message: "Invalid email or password.",});
    }

    const token = jwt.sign({ id: user._id },process.env.JWT_SECRET,{ expiresIn: "1h" });

    return res.status(200).json({success: true,message: "Login successful!",token: token,});

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({success: false,message: "Login failed.",});
  }
});

router.get("/getallusers", async (req, res) => {
  try {
    const users = await User.find().select("name email address");

    return res.status(200).json({success: true,data: users,});

  } catch (error) {
    return res.status(500).json({success: false,message: "Error fetching users",});
  }
});

router.post("/forgotpass", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({success: false,message: "Email is required.",});
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({success: false,message: "User not found.",});
    }

    const resetToken = crypto.randomBytes(32).toString("base64url");
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);
    user.token = resetToken;
    user.expirytime = expiryTime;
    await user.save();
    const transporter = nodemailer.createTransport({service: "gmail",auth: {user: "stevejacob953@gmail.com", pass: process.env.GOOGLE_APP_PASSWORD,},});
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: '"Password Reset" <stevejacob953@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${resetLink}`,
      html: `
        <h3>Password Reset</h3>
        <p>You requested a password reset.</p>
        <p>This link is valid for 5 minutes.</p>
        <a href="${resetLink}">Reset Password</a>
      `,
    });

    return res.status(200).json({success: true,message: "Reset link sent to email successfully",});

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Something went wrong",error,});
  }
});

router.patch("/resetpass", async (req, res) => {
  try {
    const { token, password } = req.body; 

    if (!token) {
      return res.status(400).json({success: false,message: "Reset token is required.",});
    }

    if (!password) {
      return res.status(400).json({success: false,message: "New password is required.",});
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json(
        {success: false,message:"Weak password. Include uppercase, lowercase, number, special char, and at least 8 characters.",});
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(400).json({success: false,message: "Invalid token.",});
    }

    if (user.expirytime < new Date()) {
      return res.status(400).json({success: false,message: "Token expired. Please request a new reset link.",});
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    user.token = null;
    user.expirytime = 0;

    await user.save();

    return res.status(200).json({success: true,message: "Password reset successful.",});

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Reset password failed.",});
  }
});

router.patch("/resetone", async (req, res) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({success: false,message: "Authorization token missing",});
    }

    const token = header.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({success: false,message: "Invalid or expired token",});
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({success: false,message: "Current password and new password are required",});
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({success: false,message:"Weak password. Include uppercase, lowercase, number, special char, and at least 8 characters.",});
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({success: false,message: "User not found",});
    }

    const match = await comparePassword(currentPassword, user.password);

    if (!match) {
      return res.status(400).json({success: false, message: "Current password is incorrect", });
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({success: true,message: "Password updated successfully",});

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Password reset failed",});
  }
});

router.get("/myprofile", async (req, res) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({success: false, message: "Authorization token missing",});
    }

    const token = header.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({success: false,message: "Invalid or expired token",});
    }

    const user = await User.findById(decoded.id).select("name email phone");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found",});
    }

    return res.status(200).json({
      success: true, data: user, });

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Failed to fetch profile",});
  }
});

router.patch("/updatephone", async (req, res) => {
  try {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false,  message: "Authorization token missing",});
    }

    const token = header.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false,  message: "Invalid or expired token", });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone required",});
    }

    const user = await User.findByIdAndUpdate(decoded.id,{ phone }, { new: true }).select("name email phone");

    return res.status(200).json({ success: true,message: "Phone updated successfully", data: user,});

  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Phone update failed",});
  }
});


router.patch("/updatename", async (req, res) => {
  try {

    if (!req.headers.authorization) {
      return res.status(401).json({success: false, message: "Authorization token required",});
    }

    const token = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify( token, process.env.JWT_SECRET || "loginfree@1234");

    const userid = decoded.id;

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name required",});
    }

    const user = await User.findByIdAndUpdate( userid, { name }, { new: true } ).select("-password");

    res.json({ success: true, message: "Name updated successfully", data: user,});

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update name",});
  }
});

router.patch("/updateemail", async (req, res) => {
  try {

    if (!req.headers.authorization) {
      return res.status(401).json({success: false, message: "Authorization token required",});
    }

    const token = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "loginfree@1234");

    const userid = decoded.id;

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required",});
    }

    const user = await User.findByIdAndUpdate(userid, { email }, { new: true }
    ).select("-password");

    res.json({ success: true, message: "Email updated successfully", data: user,});

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update email",});
  }
});

router.post("/updatestatus", async (req, res) => {
  try {

    const { id, orderStatus } = req.body;

    if (!id || !orderStatus) {
      return res.status(400).json({success: false,message: "Order id and status required"});
    }
    const order = await Order.findById(id)
      .populate("userid")
      .populate("itemid");

    if (!order) {
      return res.status(404).json({success: false, message: "Order not found"});
    }
    order.orderStatus = orderStatus;

    if (orderStatus === "delivered") {
      order.deliverdate = new Date();
    }

    await order.save();

    const userEmail = order.userid.email;
    const userName = order.userid.name;
    let message = "";

    if (orderStatus === "confirmed")
      message = "Your order has been confirmed.";

    if (orderStatus === "cancelled")
      message = "Your order has been cancelled.";

    if (orderStatus === "delivered")
      message = "Your order has been delivered.";

    if (orderStatus === "pending")
      message = "Your order is currently pending.";

    const transporter = nodemailer.createTransport({ service: "gmail",
       auth: {  user: "stevejacob953@gmail.com",  pass: process.env.GOOGLE_APP_PASSWORD }});

    await transporter.sendMail({
      from: '"Order Update" <stevejacob953@gmail.com>',
      to: userEmail,
      subject: "Order Status Update",
      html: `
        <h3>Hello ${userName}</h3>
        <p>${message}</p>

        <p><b>Order ID:</b> ${order._id}</p>
        <p><b>Item:</b> ${order.itemid?.name}</p>
        <p><b>Status:</b> ${orderStatus}</p>

        ${
          orderStatus === "delivered"
            ? `<p><b>Delivered Date:</b> ${new Date().toLocaleDateString()}</p>`
            : ""
        }

        <p>Thank you for shopping with us.</p>
      `
    });

    return res.json({success: true, message: "Order status updated and email sent",data: order});

  } catch (error) {

    console.error(error);

    return res.status(500).json({success: false,message: "Failed to update order status"});

  }
});

module.exports = router;