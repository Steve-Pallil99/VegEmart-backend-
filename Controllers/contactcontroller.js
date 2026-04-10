const express = require("express");
const router = express.Router();
const Contact = require("../Model/contactmodel");

router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({success: false,message: "All fields are required"});
    }

    const emailRegex =/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false,message: "Invalid email format"});
    }

    const contact = await Contact.create({name,email,subject,message});

    return res.status(201).json({success: true,message: "Message sent successfully",data: contact});

  } catch (error) {
    console.error("Contact API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
});

module.exports = router;
