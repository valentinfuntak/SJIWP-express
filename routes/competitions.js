const express = require("express");
const router = express.Router();
const { authRequired } = require("../services/auth");

// GET /
router.get("/", authRequired, function (req, res, next) {
    res.render("competitions/index");
});

module.exports = router;