var { getConnection, closeConnection } = require("./teradata-connection");
var { anIgnoreError } = require("./common/util");
var TeradataExceptions = require("teradata-nodejs-driver/teradata-exceptions");

function doFetchAll(cursor) {
  const sQuery =
    " SELECT trim(COLUMNNAME) from DBC.COLUMNSV where tablename='cellphone' and databasename = 'CDMTDFMGR'";

  try {
    cursor.execute(sQuery);
    var fetchedRows = cursor.fetchall();
    for (var i = 0; i < fetchedRows.length; i++) {
      console.log("Fetched Rows Count: " + fetchedRows[i]);
    }
  } catch (error) {
    if (!anIgnoreError(error)) {
      throw error;
    }
  }
}

function setupAndRun() {
  try {
    var teradataConnection = getConnection();
    var cursor = teradataConnection.cursor();
    doFetchAll(cursor);
    closeConnection(teradataConnection);
  } catch (error) {
    if (error instanceof TeradataExceptions.OperationalError) {
      console.log(error.message);
    } else {
      console.log(error);
    }
  }
}
setupAndRun();

/*

DB : CDMTDFMGR
TABLE : cellphone
DepCol : Churn

*/
