var { getTimeStamp, cleanupTempFile } = require("./common/util");
var { getConnection, closeConnection } = require("./teradata-connection");
var TeradataExceptions = require("teradata-nodejs-driver/teradata-exceptions");

const init = (DB, BASE_TABLE, DEP_COL) => {
  let BASE_TABLE_ORIG = BASE_TABLE;
  let log = "date" + getTimeStamp().trim();

  let OutlierMethod = "percentile";
  let PercentileThreshold = "1,90";
  let RemoveTail = "both";
  let ReplacementValue = "median";
  let MaxDepth = 9;
  let MinNodeSize = 1;
  let NumTrees = 30;
  let Variance = "0.0";
  let Mtry = 3;
  let MtrySeed = 100;
  let Seed = 100;
  let IDColumn = "sn";
  let Detailed = false;
  let splitpct = 0.8;

  cleanupTempFile(BASE_TABLE);

  let connection = getConnection();

  let columnQuery = `SELECT trim(COLUMNNAME) from DBC.COLUMNSV where tablename='${BASE_TABLE}' and databasename = '${DB}'`;
  let columnTypeQuery = `SELECT trim(COLUMNNAME)||'|'||trim(COLUMNTYPE) from DBC.COLUMNSV where tablename='${BASE_TABLE}' and databasename = '${DB}' and COLUMNNAME <> '${DEP_COL}'`;
  let rowCountQuery = `SELECT trim(count(*)) from ${DB}.${BASE_TABLE}`;
  let top5Query = `SELECT top 5 * from ${DB}.${BASE_TABLE}`;

  let columns = [];
  let columnNameTypes = [];
  let top5Row = [];
  let numericCols = [];
  let categCols = [];
  let rowCount = 0;
  let train_size = 0
  let test_size = 0;

  try {
    let cursor = connection.cursor();
    cursor.execute(columnQuery);
    let columnNames = cursor.fetchall();
    for (let i = 0; i < columnNames.length; i++) {
      columns.push(columnNames[i][0]);
    }
    //console.log(columns);

    cursor.execute(columnTypeQuery);
    let columnTypes = cursor.fetchall();
    for (i = 0; i < columnTypes.length; i++) {
      columnNameTypes.push(columnTypes[i][0]);
    }
    //console.log(columnNameTypes);

    cursor.execute(rowCountQuery);
    let counts = cursor.fetchall();
    for (i = 0; i < counts.length; i++) {
      rowCount = counts[i][0];
    }
    //console.log(rowCount);

    cursor.execute(top5Query);
    let top5Data = cursor.fetchall();
    for (i = 0; i < top5Data.length; i++) {
      let data = top5Data[i];
      let obj = {};
      for (let j = 0; j < data.length; j++) {
        obj[columns[j]] = data[j];
      }
      top5Row.push(obj);
    }
    //console.log(top5Row);

    for (i = 0; i < columnNameTypes.length; i++) {
      let colType = columnNameTypes[i].split("|")[1];
      let colName = columnNameTypes[i].split("|")[0];
      if (colType.startsWith("I") || colType === "D") {
        numericCols.push(colName);
      } else {
        categCols.push(colName);
      }
    }    
    //console.log(numericCols);
    //console.log(categCols);

    if(numericCols.length === 0){
      console.log("No Numeric Columns in the dataset")
    }
    if(categCols.length === 0){
       console.log("No Categorical Columns in the initial dataset");
    }

    
    //Split
    train_size = Math.ceil(rowCount*splitpct);
    test_size = rowCount - train_size;


    // console.log("\n\nAbove steps are done and below are basic findings:")

    // console.log("Numeric Columns in the dataset: ")
    // console.log(numericCols);
    
    // console.log("Categorical Columns in the dataset: ");
    // console.log(categCols);

    // console.log("Row count in the whole dataset :" + rowCount);
    // console.log("Row Count to be put into the Training Set : " + train_size)
    // console.log("Row Count to be put into the Testing Set : " + test_size)

    // console.log("Below are five sample rows from the dataset:")
    // console.log(top5Row);

    let result = {
      ncols : numericCols,
      ccols: categCols,
      rowCount : rowCount,
      trainsetsize: train_size,
      testsetsize: test_size,
      top5data : top5Row
    }

    return result;
    


  } catch (error) {
    if (error instanceof TeradataExceptions.OperationalError) {
      console.log(error.message);
    } else {
      console.log(error);
    }
  }
};

let result =  init("CDMTDFMGR", "cellphone", "Churn");

console.log(JSON.stringify(result));