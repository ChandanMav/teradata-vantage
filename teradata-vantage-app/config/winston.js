var appRoot = require("app-root-path");
var winston = require("winston");
const { timestamp, combine, json } = winston.format;
// define the custom settings for each transport (file, console)
var options = {
  file: {
    level: "error",
    filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/error.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: "info",
    filename: `${appRoot}/${process.env.LOG_FILE_LOCATION}/all.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: true,
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
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.Console),
    new winston.transports.Http({
      level: "warn",
      format: winston.format.json(),
    })
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function (message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
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
