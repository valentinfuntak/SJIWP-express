const JWT_SECRET_KEY = "ww0gtIRVJLtkJLRHvBkspdMsRzmojOf1wiiocyDBU1L0Kd2A4Mf1pzx7tp6EmuQ4lODFS4uwHv40Lvm4u37KBB6iHyAFycXQPbSWe6yKJqp8rEADhv9VGOzGKYIfOhCu";

const jwt = require ("jsonwebtoken");

function getUserToket(id, email, name, role, expDays = 7){
    const tokenData = {
        uid: id, 
        email: email,
        name: name,
        role: role,
        time: Date.now() 
    };

    const tokenOptions = {
        expiresIn: expDays * 24 * 60 * 60
    };

    const token = jwt.sign(tokenData, JWT_SECRET_KEY, tokenOptions);

    return token;
}

function checkAuthCookie(req, res, next){
    const token = req.cookie["Auth"];

    const result = jwt.verify(token, JWT_SECRET_KEY);

    console.log("TOKEN CHECK", result);
}

module.exports = {
    getUserToken,
    checkAuthCookie
};