const multer = require("multer")
const path = require("path")
const appRoot = require('app-root-path');
const winston = require("./../config/winston");

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${appRoot}/${process.env.SETTING_FILE_LOCATION}`)
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + ".txt")
    }
});

// Define the maximum size for uploading
const maxSize = 1 * 1000 * 1000;
exports.upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
        var filetypes = /txt/;
        var extname = filetypes.test(path.extname(
            file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        winston.error(`Error: File upload only supports the following filetypes - ${filetypes}`)
        cb("Error: File upload only supports the "
            + "following filetypes - " + filetypes);
    }
});
