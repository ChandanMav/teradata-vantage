const multer = require("multer")
const path = require("path")
var appRoot = require('app-root-path');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // app-setting is the upload folder name
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
        // Set the filetypes
        var filetypes = /txt/;
        var extname = filetypes.test(path.extname(
            file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb("Error: File upload only supports the "
            + "following filetypes - " + filetypes);
    }
});
