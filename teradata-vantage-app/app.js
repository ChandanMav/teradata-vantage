var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var morgan = require("morgan");
var dotenv = require("dotenv");
var fs = require("fs");
var session = require("express-session");
var bodyParser = require("body-parser");
var rateLimit = require("express-rate-limit");
var cors = require("cors");
var mongoSanitize = require("express-mongo-sanitize");
var helmet = require("helmet");
var xssClean = require("xss-clean");

dotenv.config();

var winston = require("./config/winston");
var Error = require("./common/app.err.messages");

var app = express();
app.enable("trust proxy");
app.set("trust proxy", function () {
  return true;
});

//Rate limiting to prevent  backend APIs from malicious attacks and for handling unwanted streams of requests from users.
if (process.env.RATE_LIMIT_ENABLE === "true") {
  const requestLimiter = rateLimit({
    windowMs: Number(process.env.MAX_REQUESTS_WAIT_WINDOW * 60 * 1000), // wait time in mins window
    max: Number(process.env.MAX_REQUESTS_IP), //max requests in given window
    headers: false,
    keyGenerator: function (req, res) {
      return (
        req.headers["x-real-ip"] ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress
      );
    },
  });
  //Limit on user for maximum requests in 10 mins window.
  app.use(requestLimiter);
}

//Setting up CORS
if (process.env.CORS_ENABLE === "true") {
  const corsConfig = require("./config/cors-config");
  app.use(cors(corsConfig));
}

//Log File location
fs.existsSync(process.env.LOG_FILE_LOCATION) ||
  fs.mkdirSync(process.env.LOG_FILE_LOCATION);

//Setting file location
fs.existsSync(process.env.SETTING_FILE_LOCATION) ||
  fs.mkdirSync(process.env.SETTING_FILE_LOCATION);

//Request size is set to 11mb as default is 1mb and express rejects the request.
app.use(bodyParser.json({ limit: "11mb" }));
app.use(bodyParser.urlencoded({ limit: "11mb", extended: true }));
app.use(mongoSanitize());
app.use(helmet());
app.use(xssClean());

//middleware for express session
const expiryDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
app.use(
  session({
    secret: process.env.SECRETE,
    resave: true,
    saveUninitialized: true
  })
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(morgan("combined", { stream: winston.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//Index File Route
var indexRouter = require("./routes/index");
app.use("/", indexRouter);

//Various other Routes
require("./routes/vantage-route")(app);
require("./routes/question-route")(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  //this line to include winston logging
  winston.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  // render the error page
  res.status(err.status || 500);

  if (!err.status && err.status === 500) {
    return res.send({ status: 500, message: Error.ERR_500 });
  } else if (err.status === 404) {
    return res.send({ status: err.status, message: Error.ERR_NOT_FOUND });
  } else {
    return res.send(err);
  }
});

module.exports = app;
