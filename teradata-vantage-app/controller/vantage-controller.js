var sanitize = require("mongo-sanitize");
var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { anIgnoreError, getConfig, getValueFromConfig } = require("../common/util");
var { upload } = require("../config/multer-config");
var Errorcode = require("../common/error-code");
var QB = require("./question-bank");
var createError = require("http-errors");

//Test Teradata database
exports.testConnection = (req, res, next) => {
  try {
    winston.info("Checking Teradata Connection");
    let config = getConfig(req);
    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });    
    }
    let connection = getConnection(config);

    if (connection) {
      res
        .status(200)
        .send({ Success: true, message: `Connnection Successful!` });
    } else {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });
    }
    closeConnection(connection);
    winston.info("Teradata Connection Success ");
  } catch (error) {
    return next(createError(500));
  }
};

//Get Databases from DB Server
exports.getDatabases = (req, res, next) => {
  try {
    winston.info("Fetching Databases");
    let config = getConfig(req);
    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });     
    }

    let connection = getConnection(config);

    if (connection) {
      DAO.findDatabases(connection, (err, data) => {
        closeConnection(connection);
        if (data) {
          winston.info("Fetching Databases Completed");
          res.status(200).send({ databases: data });
        } else {
          return next({
            status: 500,
            Success: false,
            message: err
          });         
        }
      });
    } else {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });      
    }
  } catch (error) {
    return next(createError(500));
  }
};

//Get Tables from Database
exports.getTables = (req, res, next) => {
  try {
    winston.info("Fetching Tables");
    let database = req.params.database;
    if (!database) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });      
    }
    let config = getConfig(req);
    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });    
    }

    let connection = getConnection(config);

    if (connection) {
      DAO.findTables(connection, database, (err, data) => {
        closeConnection(connection);
        if (data) {
          winston.info("Fetching Tables Completed");
          res.status(200).send({ tables: data });
        } else {
          return next({
            status: 500,
            Success: false,
            message: err
          });         
        }
      });
    } else {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });      
    }
  } catch (error) {
    return next(createError(500));
  }
};

//Get columns from given a Database and Table
exports.getColumns = (req, res, next) => {
  try {
    winston.info("Fetching Columns")
    let database = req.params.database;
    let table = req.params.table;

    if (!database || !table) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });     
    }

    let config = getConfig(req);
    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });      
    }

    let connection = getConnection(config);
    if (connection) {
      DAO.findColumns(connection, database, table, (err, data) => {
        closeConnection(connection);
        if (data) {
          winston.info("Fetching Completed")
          res.status(200).send({ colums: data });
        } else {
          return next({
            status: 500,
            Success: false,
            message: err
          });        
        }
      });
    } else {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });    
    }
  } catch (error) {
    return next(createError(500));
  }
}

//Init Methods
exports.init = (req, res, next) => {
  try {
    winston.info("Fetching Basic Information")
    let splitpct = 0;
    try {
      splitpct = getValueFromConfig("splitpct", res);
      splitpct = Number(splitpct);
      if (!(typeof splitpct === 'number' && !Number.isNaN(splitpct))) {
        return next({
          status: 500,
          Success: false,
          message: "Split percentage data is not a number. Please check and re-upload"
        });       
      }

    } catch (err) {
      return next({
        status: 401,
        Success: false,
        message: Error.CONFIG_FILE_FORMAT_ERROR,
        error_code: Errorcode.Config_File_Incorrect_Format,
      });     
    }

    //console.log(splitpct);
    var initParams = sanitize(req.body);


    let db = initParams.db;
    let basetable = initParams.basetable;
    let col = initParams.col;

    if (!db || !basetable || !col) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });     
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

    let config = getConfig(req);

    //console.log(config);
    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });     
    }
    let connection = getConnection(config);

    if (!connection) {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });      
    }
    async.parallel(
      [
        //Find Column Names
        (callback) => {
          let cursor = connection.cursor();
          let columnNames = [];

          try {
            winston.info(columnQuery.substring(0, 50));
            cursor.execute(columnQuery);
            columnNames = cursor.fetchall();
            //console.log( "columnNames ", columnNames);
            for (let i = 0; i < columnNames.length; i++) {
              columns.push(columnNames[i][0]);
            }
            callback();
          } catch (error) {
            if (!anIgnoreError(error)) {
              return next({
                status: 500,
                Success: false,
                message: error
              });             
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
                  winston.info(columnTypeQuery.substring(0, 50));
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
            winston.info(rowCountQuery.substring(0, 50));
            cursor.execute(rowCountQuery);
            records = cursor.fetchall();

            for (i = 0; i < records.length; i++) {
              rowCount = records[i][0];
            }

            train_size = Math.ceil(rowCount * splitpct);
            test_size = rowCount - train_size;

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
            let q2 = `SELECT top 5 ${columns} from ${db}.${basetable}`;
            winston.info(q2.substring(0, 50));
            cursor.execute(q2);
            top5Data = cursor.fetchall();
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
          return next({
            status: 500,
            Success: false,
            message: err          
          });
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
        
          winston.info("Fetching Basic Information Completed");
          res.status(200).send({ success: true, message: result });
        }
      }
    );
  } catch (error) {
    return next(createError(500));
  }
}


exports.uploadConfig = (req, res, next) => {
  try {
    winston.info("File uploading Started")
    upload.single("config")(req, res, function (err) {
      if (err) {
        // ERROR occurred (here it can be occurred due
        // to uploading file of size greater than
        // 1MB or uploading different file type)     
        return next({
          status: 500,
          Success: false,
          message: Error.ERR_500,
          error_code: Errorcode.Error_500,
        });      
      }
      else {
        winston.info("File uploading successfully")
        res.status(200).send({ success: true, message: "File uploded successfully" })
      }
    })
  } catch (error) {
    return next(createError(500));
  }
}