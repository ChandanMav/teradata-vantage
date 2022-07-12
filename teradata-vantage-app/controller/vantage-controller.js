var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var sanitize = require("mongo-sanitize");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { anIgnoreError } = require("../common/util");

//Test Teradata database
exports.testConnection = (req, res, next) => {
  winston.info("***********Checking Teradata Connection");

  var connectionInfo = sanitize(req.body);
  if (!connectionInfo || _.isEmpty(connectionInfo)) {
    return next({ status: 400, message: Error.MISSING_REQUIRED_INPUT });
  } else {
    let host = connectionInfo.host;
    let password = connectionInfo.password;
    let user = connectionInfo.user;

    let config = {
      host,
      log: "0",
      password,
      user,
    };

    let connection = getConnection(config);

    if (connection) {
      let sessData = req.session;
      sessData.config = config;
      res
        .status(200)
        .send({ Success: true, message: `Teradata Connnection Successful!` });
    } else {
      res
        .status(500)
        .send({ Success: false, message: `Teradata Connnection failed!` });
    }

    closeConnection(connection);
  }
};

//Get Databases from DB Server
exports.getDatabases = (req, res, next) => {
  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
    return;
  }

  let connection = getConnection(config);
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
  let database = req.params.database;

  if (!database) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }

  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
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

  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
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
  var initParams = sanitize(req.body);
  let splitpct = 0.8;

  let db = initParams.db;
  let basetable = initParams.basetable;
  let col = initParams.col;

  // console.log(db);
  // console.log(basetable);
  // console.log(col);

  if (!db || !basetable || !col) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }

  let sessData = req.session;
  config = sessData.config;

  if (!config) {
    res.status(503).send({ Success: false, message: Error.ERR_NO_AUTH });
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

  winston.info("***********Process Started");
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
          for (let i = 0; i < columnNames.length; i++) {
            columns.push(columnNames[i][0]);
          }
          callback();
        } catch (error) {
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
                for (i = 0; i < columnTypes.length; i++) {
                  columnNameTypes.push(columnTypes[i][0]);
                }

                waterfallCb(null, columnNameTypes);
              } catch (error) {
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
          for (i = 0; i < records.length; i++) {
            rowCount = records[i][0];
          }

          train_size = Math.ceil(rowCount * splitpct);
          test_size = rowCount - train_size;

          callback();
        } catch (error) {
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
          cursor.execute(top5Query);
          top5Data = cursor.fetchall();
          for (i = 0; i < top5Data.length; i++) {
            let data = top5Data[i];
            top5Row.push(data);
          }
          callback();
        } catch (error) {
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
        return next({ message: Error.ERR_500 });
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
        };
        winston.info("Init process completed successfully!");
        res.status(200).send({ success: true, message: result });
      }
    }
  );
};
