const _ = require('lodash');
var ERRORS = require('../common/app.err.messages');
var winston = require("./../config/winston");

var whitelist = []

let urlList = process.env.PORTAL_URL;

if (urlList) {
    whitelist = urlList.split(",");
    whitelist = _.map(whitelist, item => item.trim())
}

exports.corsOptions = {
    origin: function (origin, callback) {
        //console.log(origin);
        //console.log("whitelist ", whitelist);
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            winston.error(ERRORS.CORS_ERROR_MSG)
            callback(new Error(ERRORS.CORS_ERROR_MSG))
        }
    },
    exposedHeaders: ['X-Report-FileName']
}

