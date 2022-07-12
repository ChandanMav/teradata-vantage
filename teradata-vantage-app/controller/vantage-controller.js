var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var sanitize = require("mongo-sanitize");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");

exports.testConnection = (req, res, next) => {
  winston.info("***********Checking Teradata Connection");

  var connectionInfo = sanitize(req.body);
  if (!connectionInfo || _.isEmpty(connectionInfo)) {
    return next({ status: 400, message: Error.MISSING_REQUIRED_INPUT });
  } else {
    let host = connectionInfo.host;
    let password = connectionInfo.password;
    let user = connectionInfo.user;

    let config = {
      host,
      log: "0",
      password,
      user,
    };

    let connection = getConnection(config);

    if (connection) {
      let sessData = req.session;
      sessData.config = config;
      res
        .status(200)
        .send({ Success: true, message: `Teradata Connnection Successful!` });
    } else {
      res
        .status(500)
        .send({ Success: false, message: `Teradata Connnection failed!` });
    }

    closeConnection(connection);
  }
};

exports.getDatabases = (req, res, next) => {
  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
    return;
  }

  //console.log(config);

  let connection = getConnection(config);
  if (connection) {
    DAO.findDatabases(connection, (err, data) => {
      closeConnection(connection);
      if (data) {
        res.status(200).send({ databases: data });
      } else {
        res.status(500).send({ message: err });
      }
    });
  } else {
    res
      .status(500)
      .send({ Success: false, message: `Teradata Connnection failed!` });
  }
};

exports.getTables = (req, res, next) => {
  let database = req.params.database;

  if (!database) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
      return;
  }

  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
  if (connection) {
    DAO.findTables(connection, database, (err, data) => {
      closeConnection(connection);
      if (data) {
        res.status(200).send({ databases: data });
      } else {
        res.status(500).send({ message: err });
      }
    });
  } else {
    res
      .status(500)
      .send({ Success: false, message: `Teradata Connnection failed!` });
  }




  console.log(database);
  res.status(200).send({});
};

exports.getColumns = (req, res, next) => {
  let database = req.params.database;
  let table = req.params.table;

  console.log(database);
  console.log(table);

  res.status(200).send({});
};
