var QUERY = require("./query");

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
      let parameterizedQuery = QUERY.findTables.replace(":X", `'${databaseName}'`);
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
      let parameterizedQuery = QUERY.findColumns.replace(":X", `'${databaseName}'`);
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
