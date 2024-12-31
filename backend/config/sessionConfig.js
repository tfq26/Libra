// config/sessionConfig.js
require('dotenv').config();
module.exports.sessionConfig = {
    secret: process.env.SESSION_SECRET || 'someRandomSecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,         // set to true in production (HTTPS)
        httpOnly: true,        // helps mitigate XSS
        maxAge: 1000 * 60 * 60 // 1 hour in ms
    },
};
