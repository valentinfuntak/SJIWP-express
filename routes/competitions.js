const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");
const { decode } = require("jsonwebtoken");




// GET /competitions
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT c.id, c.name , c.description, c.max_comp, c.cur_comp, c.num_questions, u.name AS author, c.apply_till
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
//SCHEMA id_brisanje

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
    cur_comp: Joi.number().integer().min(0).required(),
    num_questions: Joi.number().integer().min(0).required()
});

// POST /competitions/edit/
router.post("/edit", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_edit.validate(req.body);
    if (!result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }
    const stmt = db.prepare("UPDATE competitions SET name = ?, description = ?, max_comp = ?, cur_comp = ?, apply_till = ?, num_questions WHERE id = ?");
    const updateResult = stmt.run(req.body.name, req.body.description, req.body.max_comp, req.body.cur_comp, req.body.apply_till, req.body.num_questions, req.body.competition_id);
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
    cur_comp: Joi.number().integer().min(0).required(),
    num_questions: Joi.number().integer().min(0).required()
});
// POST /competitions/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO competitions (name, description, author_id, apply_till, max_comp, cur_comp, num_questions) VALUES (?, ?, ?, ?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till, req.body.max_comp, req.body.cur_comp, req.body.num_questions);

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
    const stmt = db.prepare("SELECT * FROM apply WHERE user_id = ? AND competition_id = ?");
    const dbResult = stmt.get(req.user.sub, req.params.id);

    if (dbResult) {
        res.render("competitions/form", { result: { alreadySignedUp: true } });
    }
    else {
        const stmt1 = db.prepare("INSERT INTO apply (user_id, competition_id) VALUES (?,?);");
        const singUpResult = stmt1.run(req.user.sub, req.params.id);

        const stmt2 = db.prepare(`UPDATE competitions SET cur_comp = cur_comp + 1 WHERE id = ?`);
        const dbResult1 = stmt2.run(req.params.id);

        res.redirect("/competitions");
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


    const result = schema_id.validate(req.params.id);

    console.log("RQP", req.params.id);

    const stmt1 = db.prepare("DELETE FROM apply WHERE id = ? AND user_id = ?");
    const deleteApply = stmt1.run(req.params.id, req.user.sub);

    console.log(deleteApply);


    const stmt2 = db.prepare(`UPDATE competitions SET cur_comp = cur_comp - 1 WHERE id = ?;`);
    const dbResult1 = stmt2.run(req.params.id);

    console.log(dbResult1);

    if (!deleteApply) {
        throw new Error("Neispravan poziv");
    }
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

    res.render("competitions/ispis", { result: { items: podaci, printLayout: true } });

});

// GET /questions/:id
router.get("/questions/:id", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT a.competition_id, a.id, a.bodovi AS points, u.name AS nameUser, c.name AS nameCompetition, c.apply_till AS date
        FROM users u, apply a, competitions c 
        WHERE a.user_id = u.id AND a.competition_id = c.id AND c.id = ?
        ORDER BY bodovi DESC`);
    const podaci = stmt.all(req.params.id);
    res.render("competitions/questions", { result: { items: podaci } });
});

// GET /competitions/questions/addq
router.get("/competitions/questions/addq", adminRequired, function (req, res, next) {
    res.render("competitions/questions_form", { result: { display_form_quest: true } });
});

// SCHEMA addQuest 
const schema_addQuest = Joi.object({
    Pitanje: Joi.string().min(3).max(50).required(),
    TocanOdgovor: Joi.string().min(3).max(1000).required(),
    Bodovi: Joi.number().integer().min(0).max(10).required(),
});

// POST /competitions/questions/add
router.post("/competitions/addq", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form_quest: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO Questions (Pitanje, TocanOdgovor, Bodovi) VALUES (?, ?, ?);");
    const insertResult = stmt.run(req.body.Pitanje, req.body.tocodg, req.body.bodovi);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("competitions/questions", { result: { success: true } });
    } else {
        res.render("competitions/questions", { result: { database_error: true } });
    }
}); 

module.exports = router;