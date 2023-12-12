var express = require('express');
var router = express.Router();
var Joi = require("joi");

router.get('/signin', function (req, res, next) {
  res.render('users/signin', { status: { Display_form :true , error: false } });
});

const schema_signin = Joi.object({
  email: Joi.string().email().max(50).required(),
  password: Joi.string().max(50).required()
});

router.post('/signin', function (req, res, next) {
  const data = req.body;

  const validation = schema_signin.validate(data);
  if (validation.error) {
    //dogodila se greška u podacima

    res.render('users/signin', { status: { Sumbit_form :true, error: true } });
  }
  else{
    //TODO: Prijava korisnika
    res.render('users/signin', { status: {  Sumbit_form: true, error: false } });
  }
});

module.exports = router;
