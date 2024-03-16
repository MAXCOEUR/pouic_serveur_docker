const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./constantes.js');

function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}
function authenticateTokenSocket(token) {
    return new Promise((resolve, reject) => {
        if (!token) {
            reject(new Error('No token provided'));
        }

        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                reject(new Error('Invalid token'));
            } else {
                resolve(true);
            }
        });
    });
}

module.exports = { authenticateToken,authenticateTokenSocket };
