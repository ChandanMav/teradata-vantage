var QUERY = require("./query");

exports.findDatabases = (connection, cb) => {
  let databases = [];
  if (connection) {
    try {
      var cursor = connection.cursor();
      cursor.execute(QUERY.findDatabases);
      var fetchedRows = cursor.fetchall();
      console.log(fetchedRows);
      for (var i = 0; i < fetchedRows.length; i++) {
        databases.push(fetchedRows[i][0]);
      }     
      cb(null, databases);
    } catch (error) {
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
};

exports.findTables = (connection, databaseName, cb) => {
  if (connection) {
    try {
      var cursor = connection.cursor();
      cursor.execute(QUERY.findTables);
      var fetchedRows = cursor.fetchall();
      console.log(fetchedRows);
      for (var i = 0; i < fetchedRows.length; i++) {
        databases.push(fetchedRows[i][0]);
      }     
      cb(null, databases);
    } catch (error) {
      cb(error, null);
    }
  } else {
    cb(new Error("No Database Connection"), null);
  }
}
