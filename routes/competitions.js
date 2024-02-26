const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");
const { decode } = require("jsonwebtoken");

// GET /competitions
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT c.id_competition, c.name, c.description, u.name AS author, c.apply_till
        FROM competitions c, users u
        WHERE c.author_id = u.id
        ORDER BY c.apply_till
    `);
    const result = stmt.all();

    res.render("competitions/index", { result: { items: result } });
});

// SCHEMA id
const schema_id = Joi.object({
    id_competition: Joi.number().integer().positive().required()
});

// GET /competitions/delete/:id_competition
router.get("/delete/:id_competition", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("DELETE FROM competitions WHERE id_competition = ?;");
    const deleteResult = stmt.run(req.params.id_competition);

    if (!deleteResult.changes || deleteResult.changes !== 1) {
        throw new Error("Operacija nije uspjela");
    }
    res.redirect("/competitions");
});

// GET /competitions/edit/:id
router.get("/edit/:id_competition", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("SELECT * FROM competitions WHERE id_competition = ?;");
    const selectResult = stmt.get(req.params.id_competition);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.render("competitions/form", { result: { display_form: true, edit: selectResult } });
});

// GET /competitions/add
router.get("/add", adminRequired, function (req, res, next) {
    res.render("competitions/form", { result: { display_form: true } });
});
// SCHEMA add
const schema_add = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required()
});
// POST /competitions/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO competitions (name, description, author_id, apply_till) VALUES (?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("competitions/form", { result: { success: true } });
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }
});
// SCHEMA edit
const schema_edit = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required(),
    id_competition: Joi.number().integer().positive().required()
});
// POST /competitions/edit/
router.post("/edit", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_edit.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }
    const stmt = db.prepare("UPDATE competitions SET name = ?, description = ?, apply_till = ? WHERE id_competition = ?;");
    const updateResult = stmt.run(req.body.name, req.body.description, req.body.apply_till, req.body.id_competition);
    if (updateResult.changes && updateResult.changes === 1) {
        res.redirect("/competitions");
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }
});


//SCHEMA apply
const schema_apply = Joi.object({
    id: Joi.number().integer().positive().required(),
    id_competition: Joi.number().integer().positive().required(),
});

// GET /competitions/apply/:id
router.get("/apply/:id_competition", function (req, res, next) {
    const result = schema_apply.validate({ id: req.user.id, id_competition: req.params.id_competition });
    if (result.error) {
        throw new Error("Desila se pogreška prilikom prijave!");
    }
    const stmt = db.prepare("INSERT INTO apply (id, id_competition) VALUES (?, ?);");
    const insertResult = stmt.run(req.user.id, req.params.id_competition);

    if (insertResult.changes && applyResult.changes === 1) {
        res.render("competitions/form", { result: { signedUp: true } });
    } else {
        res.render("competitions/form", { result: { sdatabase_error: true } })
    }
});


module.exports = router;