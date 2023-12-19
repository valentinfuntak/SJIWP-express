const express = require("express");
const router = express.Router();
const {checkAutCookie} = require("../services/auth.js")
// GET /
router.get("/", function(req, res, next) {
  res.render("index");
});

router.get("/protected", checkAutCookie, function(req, res, next) {
  res.send("ok");
});

module.exports = router;
