var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var sanitize = require("mongo-sanitize");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { getConfig, formatUnivariateStatsData, getValueFromConfig } = require("../common/util");
var QB = require("./question-bank");
var Errorcode = require("../common/error-code");
var createError = require("http-errors");

exports.getQuestion = (req, res, next) => {

  let questionID = req.params.id;
  let question;
  let availableOptions;

  if (!questionID) {
    return next({ status: 400, Success: false, message: Error.MISSING_REQUIRED_INPUT });
  }
  switch (parseInt(questionID)) {
    case 1:
      question = QB.removeAnyColumn;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 2:
      question = QB.convertNumericalToCategorical;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 3:
      question = QB.performAutomatedDataTransformation;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 4:
      question = QB.performManualDataTransformation;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 7:
      question = QB.basicNull;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 8:
      question = QB.performAutomaticClustered;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    case 9:
      question = QB.performOutlier;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions },
      });
      break;

    default:
      next({ status: 400, Success: false, message: Error.MISSING_REQUIRED_INPUT });
      return;
  }
};

exports.univariate = (req, res, next) => {
  try {
    winston.info("Exploratory Data Analysis started using Vantage MLE functions");
    let requestBody = sanitize(req.body);
    //console.log(requestBody);  
    let key = requestBody.key;
    let config = getConfig(req);
    let db = requestBody.db;
    let basetable = requestBody.basetable;
    let dep_col = requestBody.dep_col;
    let allCols = requestBody.allCols; //Contains all the columns from the original dataset
    let nCols = requestBody.nCols; //Numeric columns
    let remainingCols = requestBody.remainingCols; //contains remianing column including the dependent one

    if (!config) {
      return  next({
        status: 400,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });    
    }

    if (!db || !basetable || !dep_col || !allCols || !nCols || !remainingCols || !key) {
      return  next({
        status: 400,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });     
    }
   
    allCols = allCols.split(",");   
    nCols = nCols.split(",");
    let nColsSingleQuoted = nCols.map((col) => `'${col}'`);   
    remainingCols = remainingCols.split(",");

    let connection = getConnection(config);
    if (!connection) {
      return  next({
        status: 400,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });     
    }

    async.waterfall(
      [
        (callback) => {
          //Drop the existing base table (_work suffix)              
          let query = `DROP TABLE ${db}.${basetable}_work`;
          winston.info(query.substring(0, 50));
          DAO.dropTable(connection, query, (err, isDeleted) => {
            if (isDeleted) {
              callback(null, null);
            } else {
              //Just ignore the error if occured during table deletion
              callback(null, null);
            }
          });
        }, //End of droping work table

        //Create new Work Table
        (data, callback) => {
          if (key === 'Y') {
            winston.info(`Creating ${db}.${basetable}_work table`);
            let query = `create table ${db}.${basetable}_work as ( SELECT ${remainingCols} from ${db}.${basetable} ) WITH DATA`;
            winston.info(query.substring(0, 50));
            DAO.createTable(connection, query, (err, isCreated) => {
              if (isCreated) {
                winston.info(`Work Table ${db}.${basetable}_work created successfully`);
                basetable = `${basetable}_work`;
                callback(null, null);
              } else {
                winston.info(`Working Table is not created. Hence Exiting...`)
                callback(true, null);
              }
            });
          } else {
            basetable = `${basetable}`;
            callback(null, null);
          }
        }, //End of droping work table

        //Run Univariate Result
        (isWorkingTableCreated, callback) => {          
          async.waterfall([
            //DROP moments_ table if any
            innerCB => {
              let query = `DROP TABLE ${db}.moments_${basetable}`;
              winston.info(query.substring(0, 50));
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  innerCB(null, null);
                } else {
                  //Just ignore the error if occured during table deletion
                  innerCB(null, null);
                }
              });
            }, //End of droping moments_ table

            //DROP basic_ table if any
            (result, innerCB) => {
              let query = `DROP TABLE ${db}.basic_${basetable}`;
              winston.info(query.substring(0, 50));
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  innerCB(null, null);
                } else {
                  //Just ignore the error if occured during table deletion
                  innerCB(null, null);
                }
              });
            }, //End of droping basic_ table
            //DROP quantiles_ table if any
            (result, innerCB) => {
              let query = `DROP TABLE ${db}.quantiles_${basetable}`;
              winston.info(query.substring(0, 50));
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  innerCB(null, null);
                } else {
                  innerCB(null, null);
                }
              });
            }, //End of droping quantiles_ table

            //call UnivariateStatistics MLE
            (result, innerCB) => {
              let query = `SELECT * FROM UnivariateStatistics (
                    ON ${db}.${basetable} AS InputTable
                    OUT TABLE MomentsTableName(${db}.moments_${basetable})
                    OUT TABLE BasicTableName(${db}.basic_${basetable})
                    OUT TABLE QuantilesTableName(${db}.quantiles_${basetable})
                    USING
                    ExcludeColumns('${dep_col}')
                    ) AS dt `;

              winston.info(query.substring(0, 50));
              DAO.executeQuery(connection, query, (err, isExecutionDone) => {
                if (isExecutionDone) {
                  innerCB(null, null);
                } else {
                  innerCB(true, null);
                }
              });
            },// End of Performing UnivariateStatistics

            //Perform univariate_unpivot
            (result, innerCB) => {
              let query = `create volatile table univariate_unpivot as (
                SELECT * FROM Unpivoting (
                ON ${db}.basic_${basetable}
                USING
                TargetColumns (${nColsSingleQuoted})
                AttributeColumn ('attribute')
                ValueColumn ('value_col')
                InputTypes ('false')
                Accumulate ('stats')
                ) AS dt
                where stats in ('Median','Mean','Mode','Number of NULL values','Number of negative values','Number of unique values','Range')
                UNION ALL
                SELECT * FROM Unpivoting (
                ON ${db}.quantiles_${basetable}
                USING
                TargetColumns (${nColsSingleQuoted})
                AttributeColumn ('attribute')
                ValueColumn ('value_col')
                InputTypes ('false')
                Accumulate ('stats')
                ) AS dt
                where stats in ('Maximum','Minimum')
                ) with DATA
                on commit preserve rows;`;

              winston.info(query.substring(0, 50));

              DAO.executeQuery(connection, query, (err, isExecutionDone) => {
                if (isExecutionDone) {
                  innerCB(null, null);
                } else {
                  innerCB(true, null);
                }
              });
            },//End of univariate_unpivot

            //Extract of univariate_unpivot result
            (result, innerCB) => {
              let query = `select trim(attribute), trim(value_col_mean),trim(value_col_median),trim(value_col_mode),trim("value_col_number of null values"),trim("value_col_number of negative values"),trim("value_col_number of unique values"),trim(value_col_range),trim(value_col_minimum),trim(value_col_maximum) from Pivoting (
                ON univariate_unpivot PARTITION BY attribute
                USING
                PartitionColumns ('attribute')
                PivotKeys ('Median','Mean','Mode','Number of NULL values','Number of negative values','Number of unique values','Range','Maximum','Minimum')
                PivotColumn ('stats')
                TargetColumns ('value_col')
                ) AS dt;`;

              winston.info(query.substring(0, 50));

              DAO.fetchResult(connection, query, (err, data) => {
                if (data) {
                  let formattedData = formatUnivariateStatsData(data)
                  innerCB(null, formattedData);
                } else {
                  innerCB(true, null);
                }
              });
            }
            // End of univariate_unpivot result extraction
            //Need to write code

          ], (err, result) => {
            if (err) {
              callback(true, null);
            }
            else {
              callback(null, result);
            }
          })
        }
      ],
      (error, data) => {
        closeConnection(connection);
        if (error) {
          return  next({ status: 500, Success: false, error_code: Errorcode.Error_500, message: error });
        } else {

          let result = {
            output: data,
            basetable: basetable
          };
          winston.info("Exploratory Data Analysis using Vantage MLE functions completed")
          res.status(200).send({ success: true, message: result });
        }
      }
    )
  } catch (error) {
    return next(createError(500));
  }
};

exports.numericToCategoricalConversion = (req, res, next) => {
  try {
    winston.info("Conversion of continous/numerical column to categorical started using Vantage MLE function 'ConvertToCategorical' ...")
    let requestBody = sanitize(req.body);
    let config = getConfig(req);
    let db = requestBody.db;
    let basetable = requestBody.basetable;
    let new_basetable = requestBody.new_basetable;
    let cCols = requestBody.cCols; //New list of categorical columns

    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });      
    }

    if (!db || !basetable || !new_basetable || !cCols) {
      return next({
        status: 400,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });    
    }

    cCols = cCols.split(",");

    let connection = getConnection(config);
    if (!connection) {
      return  next({
        status: 401,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });      
    }

    async.waterfall(
      [
        (callback) => {
          let query = `DROP TABLE ${db}.${new_basetable}`;
          winston.info(query.substring(0, 50));
          DAO.dropTable(connection, query, (err, isDeleted) => {
            if (isDeleted) {
              callback(null, null);
            } else {
              //Ignore the error
              callback(null, null);
            }
          });
        }, //End of droping table

        //Create MULTISET TABLE
        (data, callback) => {
          let cColsSingleQuoted = cCols.map(col => `'${col}'`);

          let query = `CREATE MULTISET TABLE ${db}.${new_basetable} AS (
              SELECT * FROM ConvertToCategorical(
              ON ${db}.${basetable} PARTITION BY ANY
              USING
              TargetColumns(${cColsSingleQuoted})
              ) AS dt
              ) WITH DATA`;

          winston.info(query.substring(0, 50));
          DAO.createTable(connection, query, (err, isCreated) => {
            if (isCreated) {
              callback(null, null);
            } else {
              winston.error(`MULTISET Table is not created. Hence Exiting...`)
              callback(true, null);
            }
          });
        } //End
      ],
      (error, data) => {
        closeConnection(connection);
        if (error) {
          return next({ status: 500, Success: false, error_code: Errorcode.Error_500, message: error })
        } else {
          availableOptions = ["Y", "N"];
          let question = {
            name: QB.basicNull,
            options: availableOptions
          }
          winston.info(`Conversion of numerical column to categorical completed`)
          res.status(200).send({
            Success: true,
            message: { question }
          });
        }
      }
    )
  } catch (error) {
    return next(createError(500));
  }
}

exports.basicNullValueImputing = (req, res, next) => {
  try {
    let requestBody = sanitize(req.body);
    let config = getConfig(req);
    let db = requestBody.db;
    let basetable = requestBody.basetable;
    let basicnullcolval = requestBody.basicnullcolval;

    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });     
    }

    if (!db || !basetable || !basicnullcolval) {
      return  next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
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

    async.waterfall(
      [
        (callback) => {
          let queryList = [];
          for (let i = 0; i < basicnullcolval.length; i++) {
            let query = `UPDATE ${db}.${basetable} SET ${basicnullcolval[i].name}=${Number(basicnullcolval[i].value)} where ${basicnullcolval[i].name} IS NULL`
            queryList.push(query);
          }
          callback(null, queryList);
        },
        (queryList, callback) => {
          if (queryList.length > 0) {
            for (let k = 0; k < queryList.length; k++) {
              let query = queryList[k];
              winston.info(query.substring(0, 50));
              DAO.executeQuery(connection, query, (err, isDone) => {
                if (!isDone) {
                  callback(true, null)
                  return;
                }
              });
            }
            callback(null, null)
          } else {
            callback(null, null);
          }
        }
      ],
      (error, data) => {
        closeConnection(connection);
        if (error) {
          return next({
            status: 500,
            Success: false,
            message: error,
            error_code: Errorcode.No_database_Session,
          });
        } else {
          availableOptions = ["Y", "N"];
          let question = {
            name: QB.performAutomaticClustered,
            options: availableOptions
          }
          winston.info("Basic null value imputing done");
          res.status(200).send({
            Success: true,
            message: { question }
          });
        }
      }
    )
  } catch (error) {
    return next(createError(500));
  }
}

exports.clusterNullValueImputing = (req, res, next) => {
  try {
    winston.info("Clustered null value imputing started");
    let requestBody = sanitize(req.body);
    //console.log("requestBody ", requestBody);
    let config = getConfig(req);
    let db = requestBody.db;
    let basetable = requestBody.basetable;
    let columnPairs = requestBody.pairs;


    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });
    }

    if (!db || !basetable || !columnPairs) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
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

    availableOptions = ["Y", "N"];
    let question = {
      name: QB.performOutlier,
      options: availableOptions
    }

    if (!_.isEmpty(columnPairs)) {
      async.each(columnPairs, (pair, callback) => {
        if (!_.isEmpty(pair)) {
          let col1 = pair[0];
          let col2 = pair[1];
          let query = `select trim(cast(${col1} as varchar(1000))), trim(median(${col2})) from ${db}.${basetable} group by cast(${col1} as varchar(1000))`;
          winston.info(query.substring(0, 50));
          async.waterfall([
            //Find Median
            waterfall_cb => {
              DAO.fetchResult(connection, query, (err, data) => {
                if (!data) {
                  waterfall_cb(true, null);
                  return;
                } else {
                  waterfall_cb(null, data);
                }
              })
            },
            (data, waterfall_cb) => {
              if (!data) {
                waterfall_cb(true, null)
                return;
              }
              async.each(data, (record, innerAsyncEach) => {
                let filterValue = record[0];
                let assignmentValue = record[1];

                if (_.isNull(filterValue) || _.isNull(assignmentValue)) {
                  innerAsyncEach(null);
                }
                else {
                  let updateQuery = `UPDATE ${db}.${basetable} SET ${col2}= ${assignmentValue} where ${col2} IS NULL and ${col1}='${filterValue}'`;
                  winston.info(updateQuery.substring(0, 50));
                  DAO.executeQuery(connection, updateQuery, (err, executionDone) => {
                    if (executionDone) {
                      innerAsyncEach(null);
                    } else {
                      innerAsyncEach(true);
                    }
                  });
                }
              }, e => {
                if (e) {
                  waterfall_cb(true, null)
                } else {
                  waterfall_cb(null, null)
                }
              }) //end of Inner Asynch each
            } //End of second waterfall function
          ], (error, result) => {
            if (error) {
              callback(error)
            } else {
              callback(null)
            }
          })
        } else {
          callback(null);
        }
      }, (error) => {
        if (error) {
          return next({
            status: 500,
            Success: false,
            message: error,
            error_code: Errorcode.Error_500,
          });
        }
        else {
          winston.info("Clustered null value imputing done")
          res.status(200).send({
            Success: true,
            message: { question }
          });
        }
      })

    } else {
      winston.info("Clustered null value imputing done")
      res.status(200).send({
        Success: true,
        message: { question }
      });
    }

  } catch (error) {
    return next(createError(500));
  }
}

//Outlier Handling
exports.outlierHandling = (req, res, next) => {
  try {
    winston.info("Outlier Handling started using Vantage MLE function 'OutlierFilter' ...")
    let requestBody = sanitize(req.body);
    let config = getConfig(req);
    let db = requestBody.db;
    let originalbasetable = requestBody.selectedtable;
    let basetable = requestBody.basetable;
    let numericCols = requestBody.numericCols;

    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });    
    }

    if (!db || !basetable || !originalbasetable || !numericCols) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });      
    }

    numericCols = numericCols.split(",");
    let nColsSingleQuoted = numericCols.map(col => `'${col}'`);

    let connection = getConnection(config);

    if (!connection) {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });      
    }

    async.waterfall(
      [
        (callback) => {
          //Config Parameters - Value will be read from the config file
          let OutlierMethod = null;
          let PercentileThreshold = null;
          let RemoveTail = null;
          let ReplacementValue = null;

          try {
            OutlierMethod = getValueFromConfig("OutlierMethod", res);
            PercentileThreshold = getValueFromConfig("PercentileThreshold", res);
            RemoveTail = getValueFromConfig("RemoveTail", res);
            ReplacementValue = getValueFromConfig("ReplacementValue", res);
            callback(null, { OutlierMethod, PercentileThreshold, RemoveTail, ReplacementValue });
          } catch (error) {
            winston.error("Error - Reading Config File");
            winston.error(error);
            callback(true, null);
          }

        },
        //Drop Table
        (config, callback) => {
          if (!config) {
            callback(true, null);
          }

          let query = `DROP TABLE ${db}.of_${originalbasetable}`;
          winston.info(query.substring(0, 50));

          DAO.dropTable(connection, query, (error, isDrop) => {
            if (isDrop) {
              callback(null, config);
            } else {
              //Ignore the error
              callback(null, config);
            }
          })
        },
        //Outlier Method
        (config, callback) => {
          winston.info(config);
          let query = `SELECT * FROM OutlierFilter (
            ON ${db}.${basetable} AS InputTable
            OUT TABLE OutputTable (${db}.of_${originalbasetable})
            USING
            TargetColumns (${nColsSingleQuoted})
            OutlierMethod (${config.OutlierMethod})
            PercentileThreshold (${config.PercentileThreshold})
            RemoveTail (${config.RemoveTail})
            ReplacementValue (${config.ReplacementValue})
            ) AS dt`;

          winston.info(query.substring(0, 50));

          DAO.executeQuery(connection, query, (err, executionDone) => {
            if (executionDone) {
              callback(null, null);
            } else {
              callback(true, null);
            }
          });
        }
      ], (error, data) => {
        if (error) {
          return next({ status: 500, Success: false, error_code: Errorcode.Error_500, message: error });
        } else {
          winston.info("Outlier Handling Completed")
          availableOptions = ["Y", "N"];
          let flows = this.getFlow();
          res.status(200).send({
            Success: true,
            message: { flows }
          });
        }
      });
  } catch (error) {
    return next(createError(500));
  }
}

exports.buildModel = (req, res, next) => {
  try {
    winston.info("Model build started");
    let requestBody = sanitize(req.body);
    //console.log("requestBody ", requestBody);
    let config = getConfig(req);
    let DB = requestBody.DB;
    let BASE_TABLE = requestBody.BASE_TABLE;
    let train_size = requestBody.train_size
    let test_size = requestBody.test_size;
    let selectCols = requestBody.selectCols;
    let DEP_COL = requestBody.DEP_COL;
    let numericColsfull = requestBody.numericColsfull;
    let categColsfull = requestBody.categColsfull;

    if (!config) {
      return next({
        status: 401,
        Success: false,
        message: Error.ERR_NO_AUTH,
        error_code: Errorcode.No_database_Session,
      });     
    }


    if (!DB || !BASE_TABLE || !train_size || !test_size || !selectCols || !DEP_COL || !numericColsfull || !categColsfull) {
      return next({
        status: 401,
        Success: false,
        message: Error.MISSING_REQUIRED_INPUT,
        error_code: Errorcode.Missing_Required_Input,
      });     
    }

    selectCols = selectCols.split(",");
    //selectCols = selectCols.map(col => `'${col}'`);
    numericColsfull = numericColsfull.split(",");
    numericColsfull = numericColsfull.map(col => `'${col}'`);
    categColsfull = categColsfull.split(",");
    categColsfull = categColsfull.map(col => `'${col}'`);

    let connection = getConnection(config);
    if (!connection) {
      return next({
        status: 500,
        Success: false,
        message: Error.TERADATA_CONNECTION_ERROR_MSG,
        error_code: Errorcode.No_database_Session,
      });     
    }

    async.waterfall([
      //Read config file
      callback => {
        winston.info("Fetching Config Paramaters")
        //Config Parameters
        //Value will be read from the config file
        let MaxDepth = null;
        let MinNodeSize = null;
        let NumTrees = null;
        let Variance = null;
        let Mtry = null;
        let MtrySeed = null;
        let Seed = null;
        let IDColumn = null;
        let Detailed = null;

        try {
          MaxDepth = getValueFromConfig("MaxDepth", res);
          MinNodeSize = getValueFromConfig("MinNodeSize", res);
          NumTrees = getValueFromConfig("NumTrees", res);
          Variance = getValueFromConfig("Variance", res);
          Mtry = getValueFromConfig("Mtry", res);
          MtrySeed = getValueFromConfig("MtrySeed", res);
          Seed = getValueFromConfig("Seed", res);
          IDColumn = getValueFromConfig("IDColumn", res);
          Detailed = getValueFromConfig("Detailed", res);

          winston.info("Fetching Config done")
          callback(null, { MaxDepth, MinNodeSize, NumTrees, Variance, Mtry, MtrySeed, Seed, IDColumn, Detailed });

        } catch (error) {
          winston.error("Error - Fetching Config Paramaters");
          winston.error(error);
          callback(true, null);
        }
      }, //Read config End

      //Create train, test Table
      (config, callback) => {
        winston.info("Train, Test table module started");
        winston.info(config);
        async.waterfall([
          //Drop Train_Test_Split, Train, Test table
          tt_w_cb => {
            async.parallel([
              //Drop Train_Test_Split Table
              tt_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_train_test_split`;
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  tt_p_cb(null);
                })
              },//Drop Train_Test_Split Table End

              //Drop Train Table
              tt_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_train`;
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  tt_p_cb(null);
                })
              },//Drop Train Table End

              //Drop Test Table
              tt_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_test`;
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  tt_p_cb(null);
                })
              }//Drop Test Table End
            ], tt_p_err => {
              if (tt_p_err) {
                winston.error("Error - Drop Train_Test_Split, Train, Test table")
                tt_w_cb(true);
              } else {
                tt_w_cb(null);
              }
            })
          },//Drop Train_Test_Split, Train, Test table End

          //Create Train_Test_Split
          tt_w_cb => {
            let query = `
            create multiset table ${DB}.of_${BASE_TABLE}_train_test_split as (
              SELECT * FROM RandomSample(
              ON ${DB}.of_${BASE_TABLE} AS InputTable
              USING
              SamplingMode ('basic')
              NumSample(${train_size},${test_size})
              ) AS dt
              ) with data`;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                tt_w_cb(null);
              }
              else {
                tt_w_cb(true);
              }
            })

          },//Create Train_Test_Split End

          //Create Train, _Test Table
          tt_w_cb => {
            async.parallel([
              //Create Train Table
              tt_p_cb => {
                let query = `create multiset table ${DB}.of_${BASE_TABLE}_train as (
                  select * from ${DB}.of_${BASE_TABLE}_train_test_split
                  where set_id=0
                  )
                  with data
                  no primary index`;
                winston.info(query.substring(0, 50));
                DAO.executeQuery(connection, query, (d, isDone) => {
                  if (isDone) {
                    tt_p_cb(null);
                  }
                  else {
                    tt_p_cb(null);
                  }
                })

              },//Create Train Table End 

              //Create Test Table
              tt_p_cb => {
                let query = `create multiset table ${DB}.of_${BASE_TABLE}_test as (
                  select sum(1) over(rows unbounded preceding) as sn,${selectCols} from ${DB}.of_${BASE_TABLE}_train_test_split
                  where set_id=1
                  )
                  with data
                  no primary index`;
                winston.info(query.substring(0, 50));
                DAO.executeQuery(connection, query, (d, isDone) => {
                  if (isDone) {
                    tt_p_cb(null);
                  }
                  else {
                    tt_p_cb(null);
                  }
                })
              }//Create Test Table End               
            ], tt_p_err => {
              if (tt_p_err) {
                winston.error("Error - Create Train, Test Table")
                tt_w_cb(true);
              } else {
                tt_w_cb(null);
              }
            })
          },//Create Train, _Test Table End

          //Drop Set ID from Train table
          tt_w_cb => {
            let query = `alter table ${DB}.of_${BASE_TABLE}_train drop set_id`;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                tt_w_cb(null);
              }
              else {
                tt_w_cb(true);
              }
            })

          }//Drop Set ID from Train End


        ], (w_error) => {
          if (w_error) {
            winston.error("Error - Train, Test table module")
            callback(true, null);
          } else {
            winston.info("Train, Test table module Finished")
            callback(null, config);
          }
        })

      },//Create train, test Table End    

      //DecisionForest
      (config, callback) => {
        winston.info("Decision Forest module Started")
        async.waterfall([
          df_w_cb => {
            //Drop _model and _monitor Table
            async.parallel([
              //Drop _model table
              df_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_model`
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  df_p_cb(null);
                })
              },
              //Drop _monitor Table
              df_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_monitorTable`
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  df_p_cb(null);
                })
              }
            ], df_p_err => {
              if (df_p_err) {
                winston.error("Error - Drop _model and _monitor Table | Decision Forest ");
                df_w_cb(true);
              } else {
                df_w_cb(null);
              }
            });
          },
          //DecisionForest
          df_w_cb => {
            let query = `SELECT * FROM DecisionForest (
              ON ${DB}.of_${BASE_TABLE}_train AS InputTable
              OUT TABLE OutputTable (${DB}.of_${BASE_TABLE}_model)
              OUT TABLE OutputMessageTable (${DB}.of_${BASE_TABLE}_monitorTable)
              USING
              TreeType ('classification')
              ResponseColumn ('${DEP_COL}')
              NumericInputs(${numericColsfull})
              CategoricalInputs(${categColsfull})
              MaxDepth (${config.MaxDepth})
              MinNodeSize (${config.MinNodeSize})
              NumTrees (${config.NumTrees})
              Variance (${config.Variance})
              Mtry (${config.Mtry})
              MtrySeed (${config.MtrySeed})
              Seed (${config.Seed})
              ) AS dt`;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                df_w_cb(null);
              }
              else {
                df_w_cb(true);
              }
            })
          }

        ], (df_err) => {
          if (df_err) {
            winston.error("Error - Decision Forest Module");
            callback(true, null);
          } else {
            winston.info("Decision Forest Module Completed");
            callback(null, config);
          }

        })
      }, //DecisionForest End

      //Predict Module
      (config, callback) => {
        winston.info("Predict Module Started")
        async.waterfall([
          //Drop Predict Table
          p_w_cb => {
            let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_predict`;
            winston.info(query.substring(0, 50));
            DAO.dropTable(connection, query, (d, isDrop) => {
              p_w_cb(null);
            })
          },//Drop Predict Table End

          //Create Predict Table
          p_w_cb => {
            let query = `CREATE MULTISET TABLE ${DB}.of_${BASE_TABLE}_predict AS (
              SELECT * FROM DecisionForestPredict_MLE (
              ON ${DB}.of_${BASE_TABLE}_test PARTITION BY ANY
              ON ${DB}.of_${BASE_TABLE}_model AS Model DIMENSION
              USING
              NumericInputs(${numericColsfull})
              CategoricalInputs(${categColsfull})
              IDColumn ('${config.IDColumn}')
              Accumulate ('${DEP_COL}')
              Detailed ('${config.Detailed}')
              ) AS dt
              ) WITH DATA`;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                p_w_cb(null);
              }
              else {
                p_w_cb(true);
              }
            })
          } //Create Predict Table End

        ], p_error => {
          if (p_error) {
            winston.error("Error - Predict Module");
            callback(true, null)
          } else {
            winston.info("Predict Module Finished")
            callback(null, config);
          }
        })

      },//Predict Module End

      //Scoring Module
      (config, callback) => {
        winston.info("Scoring Module Started")
        async.waterfall([
          //Drop Scoring Table
          s_w_cb => {
            let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_scoring`;
            winston.info(query.substring(0, 50));
            DAO.dropTable(connection, query, (d, isDrop) => {
              s_w_cb(null);
            })
          },//Drop Scoring Table End

          //Create Scoring Table
          s_w_cb => {
            let query = `CREATE TABLE ${DB}.of_${BASE_TABLE}_scoring AS (
              SELECT sn,${DEP_COL} as original,null as predicted FROM ${DB}.of_${BASE_TABLE}_test
              ) WITH DATA             
             `;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                s_w_cb(null);
              }
              else {
                s_w_cb(true);
              }
            })
          }, //Create Scoring Table End

          //Update Score Table
          s_w_cb => {
            let query = `UPDATE ${DB}.of_${BASE_TABLE}_scoring 
            FROM  ${DB}.of_${BASE_TABLE}_predict SRC
            SET predicted = SRC.prediction
            WHERE ${DB}.of_${BASE_TABLE}_scoring.sn = SRC.sn`;
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                s_w_cb(null);
              }
              else {
                s_w_cb(true);
              }
            })

          } //Update Score Table End



        ], s_error => {
          if (s_error) {
            winston.error("Error - Scoring Module");
            callback(true, null)
          } else {
            winston.info("Scoring Module Finished")
            callback(null, config);
          }
        })

      },//Scoring Module End

      //Confusion Matrix Module
      (config, callback) => {
        winston.info("Confusion Matrix Module Started")
        async.waterfall([
          //Drop confusionMatrix table
          cm_w_cb => {
            async.parallel([
              //Drop confusionMatrix Count Table
              cm_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_confusionMatrix_count_output`
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  cm_p_cb(null);
                })

              },//Drop confusionMatrix Count Table End

              //Drop confusionMatrix Stat Table
              cm_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_confusionMatrix_stat_output`
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  cm_p_cb(null);
                })
              },//Drop confusionMatrix Stat Table End

              //Drop confusionMatrix Acc Table
              cm_p_cb => {
                let query = `DROP TABLE ${DB}.of_${BASE_TABLE}_confusionMatrix_acc_output`
                winston.info(query.substring(0, 50));
                DAO.dropTable(connection, query, (d, isDrop) => {
                  cm_p_cb(null);
                })
              }//Drop confusionMatrix Acc Table End

            ], cm_p_err => {
              cm_w_cb(null)
            })

          },//Drop confusionMatrix table End

          //Create confusionMatrix
          cm_w_cb => {

            let query = `SELECT * FROM ConfusionMatrix(
              ON ${DB}.of_${BASE_TABLE}_scoring PARTITION BY 1
              OUT TABLE CountTable(${DB}.of_${BASE_TABLE}_confusionMatrix_count_output)
              OUT TABLE StatTable(${DB}.of_${BASE_TABLE}_confusionMatrix_stat_output)
              OUT TABLE AccuracyTable(${DB}.of_${BASE_TABLE}_confusionMatrix_acc_output)
              USING
              ObservationColumn('original')
              PredictColumn('predicted')
              ) AS dt`
            winston.info(query.substring(0, 50));
            DAO.executeQuery(connection, query, (d, isDone) => {
              if (isDone) {
                cm_w_cb(null)
              }
              else {
                cm_w_cb(true)
              }
            })
          }, //Create confusionMatrix End

          //Fetch confusionMatrix Data
          cm_w_cb => {
            //console.log("Hello")
            let query = `select trim("key"), trim("value") from ${DB}.of_${BASE_TABLE}_confusionMatrix_stat_output
                          union all
                        select trim(measure), trim("1") from ${DB}.of_${BASE_TABLE}_confusionMatrix_acc_output`;
            winston.info(query.substring(0, 50));
            DAO.fetchResult(connection, query, (e, data) => {
              if (data) {
                cm_w_cb(null, data)
              } else {
                cm_w_cb(true, null)
              }

            });


          }//Fetch confusionMatrix Data End

        ], (cm_error, data) => {
          if (cm_error) {
            winston.error("Error - Confusion Matrix Module");
            callback(true, null)
          } else {
            winston.info("Confusion Matrix Module Finished")
            callback(null, data);
          }
        })
      },//Confusion Matrix Module End
    ], (error, data) => {
      closeConnection(connection);
      if (error) {
        winston.error('Error - Model build Finished with Error');
        return next({
          status: 500,
          Success: false,
          message: error,
          error_code: Errorcode.No_database_Session,
        });
      }
      else {
        winston.info("Model build Finished");
        res.status(200).send({
          Success: true,
          message: _.sortBy(this.formatModelOutput(data), o => o.name)
        });
      }
    })
  } catch (error) {
    return next(createError(500));
  }
}

exports.getAllAutomatedDTSteps = (req, res, next) => {
  winston.info("Data Transformation Steps")
  let questions = [
    { name: "Conversion any Numeric Column to Categorical", fn: "ConvertToCategorical" },
    { name: "Basic null value imputing using Median for Numeric columns and Mode for Categorical Columns", fn: "MedianMode" },
    { name: "Automated clustered null value imputing", fn: "Grouping" },
    { name: "Outlier Handling", fn: "OutlierFilter" }
  ]

  res.status(200).send({
    Success: true,
    message: { questions }
  });
}

exports.getModelBuildFlow = (req, res, next) => {
  winston.info("Model Flow")
  let flows = this.getFlow();
  res.status(200).send({
    Success: true,
    message: { flows }
  });
}

exports.getFlow = () => {
  return [
    "Final Model Creation Started using below flow..",
    "1) Train-Test split using Vantage MLE function 'RandomSample'",
    "2) Classification ML model created using Vantage MLE function 'DecisionForest'",
    "3) Prediction on unknown test dataset usinng the Classification ML model using Vantage MLE function 'DecisionForestPredict_MLE'",
    "4) Work table created for model scoring by placing the original values adjacent to the predicted values",
    "5) Final scoring metrics generated on the DecisionForest model using Vantage MLE function 'ConfusionMatrix'",
  ]
}

exports.formatModelOutput = (data) => {
  let output = [];
  if (!data) {
    return [];
  }
  _.forEach(data, arr => {
    let temp = {}
    temp.name = arr[0];
    temp.value = arr[1];
    output.push(temp);
  })
  return output;
}


