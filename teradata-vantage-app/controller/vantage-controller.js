var sanitize = require("mongo-sanitize");
var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { anIgnoreError, getConfig, getValueFromConfig } = require("../common/util");
var { upload } = require("../config/multer-config");
var fs = require("fs");
var appRoot = require('app-root-path');
var Errorcode = require("../common/error-code");
var QB = require("./question-bank");



//Test Teradata database
exports.testConnection = (req, res, next) => {
  winston.info("Checking Teradata Connection");
  let config = getConfig(req);
  if (!config) {
    res.status(503).send({ Success: false, error_code: "No_database_Session", message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
  if (connection) {
    res
      .status(200)
      .send({ Success: true, message: `Connnection Successful!` });
  } else {
    res
      .status(500)
      .send({ Success: false, message: `Connnection failed!` });
  }
  closeConnection(connection);
};

//Get Databases from DB Server
exports.getDatabases = (req, res, next) => {

  winston.info("Fetching list of Database");
  let config = getConfig(req);
  if (!config) {
    res.status(503).send({ Success: false, error_code: Errorcode.No_db_Session, message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
  //winston.info(connection);
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

//Get Tables from Database
exports.getTables = (req, res, next) => {
  winston.info("Retrieving tables");

  let database = req.params.database;
  if (!database) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }
  let config = getConfig(req);
  if (!config) {
    res.status(503).send({ Success: false, error_code: Errorcode.No_db_Session, message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
  if (connection) {
    DAO.findTables(connection, database, (err, data) => {
      closeConnection(connection);
      if (data) {
        res.status(200).send({ tables: data });
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

//Get columns from given a Database and Table
exports.getColumns = (req, res, next) => {
  let database = req.params.database;
  let table = req.params.table;

  if (!database || !table) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }

  let config = getConfig(req);
  if (!config) {
    res.status(503).send({ Success: false, error_code: Errorcode.No_db_Session, message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
  if (connection) {
    DAO.findColumns(connection, database, table, (err, data) => {
      closeConnection(connection);
      if (data) {
        res.status(200).send({ colums: data });
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

//Init Methods
exports.init = (req, res, next) => {
  let splitpct = 0;
  try {
    splitpct = getValueFromConfig("splitpct", res);
    splitpct = Number(splitpct);
    if (!(typeof splitpct === 'number' && !Number.isNaN(splitpct))) {
      throw new Error("Split percentage data is not a number. Please check and re-upload")
    }

  } catch (err) {
    winston.error(err);
    res
      .status(500)
      .send({ Success: false, error_code: Errorcode.Config_File_Incorrect_Format, message: Error.CONFIG_FILE_FORMAT_ERROR });
    return;
  }

  //console.log(splitpct);
  var initParams = sanitize(req.body);


  let db = initParams.db;
  let basetable = initParams.basetable;
  let col = initParams.col;

  if (!db || !basetable || !col) {
    winston.error(Error.MISSING_REQUIRED_INPUT);
    res
      .status(500)
      .send({ Success: false, error_code: Errorcode.Missing_Required_Input, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }

  let columnQuery = `SELECT trim(COLUMNNAME) from DBC.COLUMNSV where tablename='${basetable}' and databasename = '${db}'`;
  let columnTypeQuery = `SELECT trim(COLUMNNAME)||'|'||trim(COLUMNTYPE) from DBC.COLUMNSV where tablename='${basetable}' and databasename = '${db}' and COLUMNNAME <> '${col}'`;
  let rowCountQuery = `SELECT trim(count(*)) from ${db}.${basetable}`;
  let top5Query = `SELECT top 5 * from ${db}.${basetable}`;

  let columns = [];
  let columnNameTypes = [];
  let top5Row = [];
  let numericCols = [];
  let categCols = [];
  let rowCount = 0;
  let train_size = 0;
  let test_size = 0;

  winston.info("Fetching Basic info");
  let config = getConfig(req);

  //console.log(config);
  if (!config) {
    winston.error(Error.ERR_NO_AUTH);
    res.status(503).send({ Success: false, error_code: Errorcode.No_db_Session, message: Error.ERR_NO_AUTH });
    return;
  }
  let connection = getConnection(config);
  async.parallel(
    [
      //Find Column Names
      (callback) => {
        let cursor = connection.cursor();
        let columnNames = [];

        try {
          cursor.execute(columnQuery);
          columnNames = cursor.fetchall();
          //console.log( "columnNames ", columnNames);
          for (let i = 0; i < columnNames.length; i++) {
            columns.push(columnNames[i][0]);
          }
          callback();
        } catch (error) {
          winston.error(error);
          if (!anIgnoreError(error)) {
            callback(error);
          }
        }
      },

      //Finding ColumnTypes
      (callback) => {
        async.waterfall(
          [
            (waterfallCb) => {
              let cursor = connection.cursor();
              let columnTypes = [];

              try {
                cursor.execute(columnTypeQuery);
                columnTypes = cursor.fetchall();
                //console.log( "columnTypes ", columnTypes);
                for (i = 0; i < columnTypes.length; i++) {
                  columnNameTypes.push(columnTypes[i][0]);
                }

                waterfallCb(null, columnNameTypes);
              } catch (error) {
                winston.error(error);
                if (!anIgnoreError(error)) {
                  waterfallCb(true, error);
                }
              }
            },
            (columnNameTypes, waterfallCb) => {
              if (!columnNameTypes) {
                waterfallCb(true, new Error("No data found"));
              }

              for (i = 0; i < columnNameTypes.length; i++) {
                let colType = columnNameTypes[i].split("|")[1];
                let colName = columnNameTypes[i].split("|")[0];
                if (colType.startsWith("I") || colType === "D") {
                  numericCols.push(colName);
                } else {
                  categCols.push(colName);
                }
              }
              waterfallCb(null, null);
            },
          ],
          (error, result) => {
            if (error) {
              winston.error(error);
              callback(error);
            } else {
              callback();
            }
          }
        );
      },

      //Finding Total Record Count
      (callback) => {
        let cursor = connection.cursor();
        let records = [];

        try {
          cursor.execute(rowCountQuery);
          records = cursor.fetchall();
          //console.log("records ", records)
          for (i = 0; i < records.length; i++) {
            rowCount = records[i][0];
          }

          train_size = Math.ceil(rowCount * splitpct);
          test_size = rowCount - train_size;

          //console.log("rowCount ", rowCount)
          //console.log("train_size ", train_size)
          //console.log("test_size ", test_size)

          callback();
        } catch (error) {
          winston.error(error);
          if (!anIgnoreError(error)) {
            callback(error);
          }
        }
      },

      //Finding Top 5 Records
      (callback) => {
        let cursor = connection.cursor();
        let top5Data = [];

        try {
          //this.columns.map(col => col)
          let q2 = `SELECT top 5 ${columns} from ${db}.${basetable}`;
          //console.log(q2);
          cursor.execute(q2);
          top5Data = cursor.fetchall();
          //console.log("top5Data ", top5Data);
          for (i = 0; i < top5Data.length; i++) {
            let data = top5Data[i];
            top5Row.push(data);
          }
          callback();
        } catch (error) {
          winston.error(error);
          if (!anIgnoreError(error)) {
            callback(error);
          }
        }
      },
    ],
    (err, success) => {
      closeConnection(connection);
      if (err) {
        winston.error(err);
        return next({ message: Error.ERR_500, error_code: Errorcode.Error_500 });
      } else {
        let top5RowJson = [];
        for (let i = 0; i < top5Row.length; i++) {
          let obj = {};
          for (let j = 0; j < top5Row[i].length; j++) {
            obj[columns[j]] = top5Row[i][j];
          }
          top5RowJson.push(obj);
        }

        let result = {
          ncols: numericCols,
          ccols: categCols,
          rowCount: rowCount,
          trainsetsize: train_size,
          testsetsize: test_size,
          top5data: top5RowJson,
          question: {
            name: QB.removeAnyColumn,
            options: ["Y", "N"]
          }
        };

        //Setting up in the session object        
        winston.info("Fetching Basic info is completed");
        res.status(200).send({ success: true, message: result });
      }
    }
  );
};


exports.uploadConfig = (req, res, next) => {
  upload.single("config")(req, res, function (err) {
    if (err) {
      // ERROR occurred (here it can be occurred due
      // to uploading file of size greater than
      // 1MB or uploading different file type)      
      winston.error(err);
      res.status(500).send({ message: Error.ERR_500, error_code: Errorcode.Error_500 });
    }
    else {
      // SUCCESS, image successfully uploaded
      res.status(200).send({ success: true, message: "File uploded successfully" })
    }
  })
}