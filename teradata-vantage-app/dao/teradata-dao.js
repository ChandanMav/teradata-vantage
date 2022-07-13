var QUERY = require("./query");
var _ = require("lodash");
var winston = require("./../config/winston");

exports.findDatabases = (connection, cb) => {
  let data = [];
  if (connection) {
    try {
      let cursor = connection.cursor();
      cursor.execute(QUERY.findDatabases);
      let fetchedRows = cursor.fetchall();
      console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
};

exports.findTables = (connection, databaseName, cb) => {
  let data = [];
  if (connection) {
    try {
      let cursor = connection.cursor();
      let parameterizedQuery = QUERY.findTables.replace(
        ":X",
        `'${databaseName}'`
      );
      console.log(parameterizedQuery);
      cursor.execute(parameterizedQuery);
      let fetchedRows = cursor.fetchall();
      console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
};

exports.findColumns = (connection, databaseName, tableName, cb) => {
  let data = [];
  if (connection) {
    try {
      let cursor = connection.cursor();
      let parameterizedQuery = QUERY.findColumns.replace(
        ":X",
        `'${databaseName}'`
      );
      parameterizedQuery = parameterizedQuery.replace(":Y", `'${tableName}'`);

      cursor.execute(parameterizedQuery);
      let fetchedRows = cursor.fetchall();
      console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
};

exports.dropTable = (connection, query, cb) => {
  if (!connection) {
    cb(new Error("No Database Connection"), null);
    return;
  }

  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("******************Table deleted successfully");
    cb(null, "Table Deleted");
  } catch (error) {
    winston.error("**************Table deletion failed but this can be ignored!");
    cb(null, "Table Deleted Succssfully");
  }
};

exports.createTable = (connection, query, cb) => {
  if (!connection) {
    cb(new Error("No Database Connection"), null);
    return;
  }

  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("******************Table Created successfully");
    cb(null, "Table Created");

  } catch (error) {
    winston.error("******************Table creation failed");
    winston.error(error);
    cb(error, null);
  }
};


exports.executeQuery = (connection, query, cb) => {
  if (!connection) {
    cb(new Error("No Database Connection"), null);
    return;
  }

  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("******************Query Execution Done");
    cb(null, "Query Execution is completed");

  } catch (error) {
    winston.error("******************Query Execution Failed");
    winston.error(error);
    cb(error, null);
  }
};