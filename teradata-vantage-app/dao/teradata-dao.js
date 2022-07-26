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
      //console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      winston.error("Error in fetching database list ", error);      
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
      //console.log(parameterizedQuery);
      cursor.execute(parameterizedQuery);
      let fetchedRows = cursor.fetchall();
      //console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      winston.error("Error in fetching table list ", error); 
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
      //console.log(fetchedRows);
      for (let i = 0; i < fetchedRows.length; i++) {
        data.push(fetchedRows[i][0]);
      }
      cb(null, data);
    } catch (error) {
      winston.error("Error in fetching column list ", error); 
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
};

exports.dropTable = (connection, query, cb) => {
  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("Table deleted successfully");
    cb(null, true);
  } catch (error) {
    winston.error("Table deletion failed, can be ignored!");
    cb(null, false);
  }
};

exports.createTable = (connection, query, cb) => {
  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("Table Created successfully");
    cb(null, true);

  } catch (error) {
    winston.error("Table creation failed");
    cb(null, false);
  }
};


exports.executeQuery = (connection, query, cb) => {
  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    winston.info("Query Execution Done");
    cb(null, true);

  } catch (error) {
    winston.error(error);
    winston.error("Query Execution Failed");
    cb(null, false);
  }
};




exports.fetchResult = (connection, query, cb) => { 
  try {
    let cursor = connection.cursor();
    cursor.execute(query);
    let fetchedRows = cursor.fetchall();
    winston.info("Data fetching is completed");
    //console.log(fetchedRows); 
    cb(null, fetchedRows);
  } catch (error) {
    winston.error(error);
    winston.error("Query Execution Failed");
    cb(null, false);
  }
};

