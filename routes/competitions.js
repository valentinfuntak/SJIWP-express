const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");
const { decode } = require("jsonwebtoken");

// GET /competitions
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT c.id, c.name , c.description, c.max_comp, c.cur_comp, u.name AS author, c.apply_till
        FROM competitions c, users u
        WHERE c.author_id = u.id
        ORDER BY c.id 
    `);
    const result = stmt.all();

    res.render("competitions/index", { result: { items: result } });
});

// SCHEMA id
const schema_id = Joi.object({
    id: Joi.number().integer().positive().required()
});

// GET /competitions/delete/:id
router.get("/delete/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("DELETE FROM apply WHERE competition_id = ?");
    const deleteApply = stmt.run(req.params.id);

    const stmt2 = db.prepare("DELETE FROM competitions WHERE id = ?;");
    const deleteResult = stmt2.run(req.params.id);

    if (!deleteResult.changes || deleteResult.changes !== 1) {
        throw new Error("Operacija nije uspjela");
    }
    res.redirect("/competitions");
});

// GET /competitions/edit/:id
router.get("/edit/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("SELECT * FROM competitions WHERE id = ?;");
    const selectResult = stmt.get(req.params.id);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.render("competitions/form", { result: { display_form: true, edit: selectResult } });
});

// SCHEMA edit
const schema_edit = Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required(),
    max_comp: Joi.number().integer().min(1).required(),
    cur_comp: Joi.number().integer().min(0).required()
});

// POST /competitions/edit/
router.post("/edit", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_edit.validate(req.body);
    if (!result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    } 
    const stmt = db.prepare("UPDATE competitions SET name = ?, description = ?, max_comp = ?, cur_comp = ?, apply_till = ? WHERE id = ?");
    const updateResult = stmt.run(req.body.name, req.body.description, req.body.max_comp, req.body.cur_comp, req.body.apply_till, req.body.competition_id);
    
    /*if (updateResult.changes && updateResult.changes === 1) {
        res.redirect("/competitions/index");
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }*/
});

// GET /competitions/add
router.get("/add", adminRequired, function (req, res, next) {
    res.render("competitions/form", { result: { display_form: true } });
});

// SCHEMA add
const schema_add = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required(),
    max_comp: Joi.number().integer().min(1).required(),
    cur_comp: Joi.number().integer().min(0).required()
});
// POST /competitions/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO competitions (name, description, author_id, apply_till, max_comp, cur_comp) VALUES (?, ?, ?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till, req.body.max_comp, req.body.cur_comp);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("competitions/form", { result: { success: true } });
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }
}); 

// GET /competitions/apply/:id
router.get("/apply/:id", function (req, res, next) {
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }
    const stmt2 = db.prepare("SELECT * FROM apply WHERE user_id = ? AND competition_id = ?");
    const dbResult = stmt2.get(req.user.sub, req.params.id);

    if (dbResult) {
        res.render("competitions/form", { result: { alreadySignedUp: true } });
    }
    else {
        const stmt = db.prepare("INSERT INTO apply (user_id, competition_id) VALUES (?,?);");
        const singUpResult = stmt.run(req.user.sub, req.params.id);

        if (singUpResult.changes && singUpResult.changes === 1) {
            res.render("competitions/form", { result: { signedUp: true } });
        } else {
            res.render("competitions/form", { result: { database_error: true } });
        }
    }

});

// GET /competitions/rezultati/:id
router.get("/rezultati/:id", function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare(`
        SELECT a.competition_id, a.id, a.bodovi AS points, u.name AS nameUser, c.name AS nameCompetition, c.apply_till AS date,
        c.max_comp AS korisniciMax, c.cur_comp AS korisniciTren
        FROM users u, apply a, competitions c 
        WHERE a.user_id = u.id AND a.competition_id = c.id AND c.id = ? 
        ORDER BY bodovi`);
    const podaci = stmt.all(req.params.id);

    if (podaci) {
        res.render("competitions/rezultati", { result: { items: podaci } });
    } else {
        res.render("competitions/rezultati", { result: { database_error: true } });
    }

});

// POST /competitions/rezultat/:id
router.post("/rezultat/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("UPDATE apply SET bodovi = ? WHERE id = ?;");
    const selectResult = stmt.run(req.body.bodovi, req.params.id);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.redirect("/competitions/rezultati/" + req.body.competition_id);
}); 

// GET /competitions/deleteComp/:id
router.get("/deleteComp/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);   

    const stmt = db.prepare("DELETE FROM apply WHERE user_id = ?");
    const deleteComp= stmt.run(req.params.id);
    
    res.render("competitions/rezultati");
});

// GET /competitions/ispis/:id
router.get("/ispis/:id", function (req, res, next) {
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare(`
        SELECT a.competition_id, a.id, a.bodovi AS points, u.name AS nameUser, c.name AS nameCompetition, c.apply_till AS date
        FROM users u, apply a, competitions c 
        WHERE a.user_id = u.id AND a.competition_id = c.id AND c.id = ? 
        ORDER BY bodovi DESC `);
    const podaci = stmt.all(req.params.id);

    res.render("competitions/ispis", { result: { items: podaci , printLayout: true} });

});


module.exports = router;