var express = require('express');
var router = express.Router();
var Joi = require("joi");

router.get('/signin', function (req, res, next) {
  res.render('users/signin', { status: { display_form: true, error: false } });
});

const schema_signin = Joi.object({
  email: Joi.string().email().max(50).required(),
  password: Joi.string().max(50).required()
});

router.post('/signin', function (req, res, next) {
  const data = req.body;

  const validation = schema_signin.validate(data);
  console.log("Validation", validation);
  if (validation.error) {
    res.render('users/signin', { status: { submit_form: true, error: true } });
  } else {
    // TODO: prijava korisnika
    res.render('users/signin', { status: { submit_form: true, error: false } });
  }
});

module.exports = router;
