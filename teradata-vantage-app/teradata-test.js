var TeradataConnection = require("teradata-nodejs-driver/teradata-connection");
var TeradataExceptions = require("teradata-nodejs-driver/teradata-exceptions");
var connParams = {
    host: '153.64.73.11',
    log: '0',
    password: 'Migrate1234#',
    user: 'CDMTDF3'
};

/*
* Fetches all data from tables
*/
function doFetchAll(cursor) {
    const sQuery = 'SELECT distinct databasename from dbc.tablesv order by databasename';
  
    try {
      cursor.execute(sQuery);
      var fetchedRows = cursor.fetchall();
      for(var i = 0; i<fetchedRows.length; i++){
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
        var teradataConnection = new TeradataConnection.TeradataConnection();
        var cursor = teradataConnection.cursor();
        teradataConnection.connect(connParams);
        doFetchAll(cursor);
        teradataConnection.close();
        console.log("Close Success");
    }
    catch (error) {
        if (error instanceof TeradataExceptions.OperationalError) {
            /* A database operational error */
            console.log(error.message);
        }
        else {
            console.log(error);
        }
    }
}
setupAndRun();