var TeradataConnection = require("teradata-nodejs-driver/teradata-connection");
var TeradataExceptions = require("teradata-nodejs-driver/teradata-exceptions");
var winston = require("./config/winston");

var connParams = {
  host: "153.64.73.11",
  log: "0",
  password: "Migrate1234#",
  user: "CDMTDF3",
};

getConnection = (config) => {
  config = config || connParams;
  let teradataConnection = null;
  try {
    teradataConnection = new TeradataConnection.TeradataConnection();
    teradataConnection.connect(config);
    winston.info("Teradata Connection Successful!")
  } catch (error) {
    if (error instanceof TeradataExceptions.OperationalError) {
      winston.error("Teradata Connection failed! " + error.message)
      return null;
    } else {
      winston.error("Teradata Connection failed! " + error)
      return null;
    }
  }

  return teradataConnection;
}

closeConnection = (conn) => {
  try {
    if (conn) {
      conn.close();
    }
    winston.info("************Teradata Connection closed successfully!")
  } catch (error) {
    if (error instanceof TeradataExceptions.OperationalError) {
      winston.error("Teradata Connection failed! " + error.message)
    } else {
      winston.error("Teradata Connection failed! " + error)
    }
  }
}

module.exports = {
  getConnection,
  closeConnection
}
