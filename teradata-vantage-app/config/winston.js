var appRoot = require("app-root-path");
var winston = require("winston");
const { timestamp, combine, json } = winston.format;

var options = {
  file: {
    level: "info",
    name: "info-file",
    filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/all-logs.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: "error",
    name: "error-file",
    filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/error-logs.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  request: {
    name: "request-file",
    level: "request",
    filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/requests.log`,
    json: true,
    maxsize: 5242880, //5MB
    maxFiles: 5,
    colorize: false
  },
};
// instantiate a new Winston Logger with the settings defined above
var logger = winston.createLogger({
  format: combine(
    timestamp({
      format: "ddd, DD MMM YYYY HH:mm:ss",
    }),
    json()
  ),
  exceptionHandlers: [
    new winston.transports.File({
      filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/exceptions.log`,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/rejections.log`,
    }),
  ],
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.File(options.console),
    new winston.transports.File(options.request)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function (message, encoding) {  
    logger.info(message);
  },
};

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
