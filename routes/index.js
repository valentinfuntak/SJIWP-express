const express = require("express");
const router = express.Router();

// GET /
router.get("/", function (req, res, next) {
  res.render("naslovnica");
});

module.exports = router;
