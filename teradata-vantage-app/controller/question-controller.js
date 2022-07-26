var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var sanitize = require("mongo-sanitize");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { anIgnoreError, getConfig } = require("../common/util");
var QB = require("./question-bank");
var Errorcode = require("../common/error-code");
var createError = require("http-errors");
var sample = require("../common/sample")

exports.getQuestion = (req, res, next) => {
  let questionID = req.params.id;
  let question;
  let availableOptions;
  if (!questionID) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
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
      res
        .status(500)
        .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
      return;
  }
};

exports.univariate = (req, res, next) => {
  try {
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
      res.status(503).send({
        Success: false,
        error_code: Errorcode.No_database_Session,
        message: Error.ERR_NO_AUTH,
      });
      return;
    }

    if (!db) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.MISSING_REQUIRED_INPUT,
      });
      return;
    }

    if (!basetable) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.MISSING_REQUIRED_INPUT,
      });
      return;
    }

    if (!dep_col) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.MISSING_REQUIRED_INPUT,
      });
      return;
    }


    if (!allCols) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }
    allCols = allCols.split(",");


    if (!nCols) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }
    nCols = nCols.split(",");
    let nColsSingleQuoted = nCols.map(col => `'${col}'`);
    console.log(nColsSingleQuoted);



    if (!remainingCols) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }
    remainingCols = remainingCols.split(",");

    let connection = getConnection(config);
    if (!connection) {
      res
        .status(500)
        .send({ Success: false, error_code: Errorcode.No_database_Session, message: `Teradata Connnection failed!` });
      return;
    }



    if (!key) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }

    async.waterfall(
      [
        (callback) => {
          //Drop the existing base table (_work suffix)              
          let query = `DROP TABLE ${db}.${basetable}_work`;
          winston.info(query);
          DAO.dropTable(connection, query, (err, isDeleted) => {
            if (isDeleted) {
              winston.info(`Table ${db}.${basetable}_work dropped`)
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
            let query = `create table ${db}.${basetable}_work as ( SELECT ${remainingCols} from ${db}.${basetable} ) WITH DATA`;
            winston.info(query)
            DAO.createTable(connection, query, (err, isCreated) => {
              if (isCreated) {
                basetable = `${basetable}_work`;
                winston.info(`Table created successfuly ${db}.${basetable}`)
                callback(null, null);
              } else {      
                winston.info(`Working Table is not created. Hence Exiting!`)      
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
          winston.info("Exploratory Data Analysis started using Vantage MLE functions 'UnivariateStatistics' and 'Unpivoting' ...");
          async.waterfall([
            //DROP moments_ table if any
            innerCB => {
              let query = `DROP TABLE ${db}.moments_${basetable}`;
              winston.info(query);
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  winston.info(`Table dropped successfuly ${db}.moments_${basetable}`)
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
              winston.info(query);
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  winston.info(`Table dropped successfuly ${db}.basic_${basetable}`)
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
              winston.info(query);
              DAO.dropTable(connection, query, (err, isDropped) => {
                if (isDropped) {
                  inston.info(`Table dropped successfuly ${db}.quantiles_${basetable}`)
                  innerCB(null, null);
                } else {
                  winston.error(err);
                  //Just ignore the error if occured during table deletion
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

              winston.info(query);
              DAO.executeQuery(connection, query, (err, isExecutionDone) => {
                if (isExecutionDone) {
                  winston.info(`UnivariateStatistics Query Execution is Done`);
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

              winston.info(query);

              DAO.executeQuery(connection, query, (err, isExecutionDone) => {
                if (isExecutionDone) {
                  winston.info(`Univariate Unpivot Query Execution is completed}`);
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

              console.log(query);

              DAO.fetchResult(connection, query, (err, data) => {
                if (data) {                 
                  innerCB(null, data);
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
      (error, result1) => {
        closeConnection(connection);
        if (error) {
          winston.error(error);
          res
            .status(500)
            .send({ Success: false, error_code: Errorcode.Error_500, message: error });
        } else {

          let result = {
            output: sample,
            question: {
              name: QB.performAutomatedDataTransformation,
              options: ["Y", "N"]
            },
            basetable: basetable
          };

          console.log("Final Result ", result)
          res.status(200).send({ success: true, message: result });
        }
      }
    )
  } catch (error) {
    return next(createError(500));
  }
};

exports.numericToCategoricalConversion = (req, res, next) => {
  availableOptions = ["Y", "N"];
  let question = {
    name: QB.basicNull,
    options: availableOptions
  }
  res.status(200).send({
    Success: true,
    message: { question }
  });
}


exports.basicNullValueImputing = (req, res, next) => {
  availableOptions = ["Y", "N"];
  let question = {
    name: QB.performAutomaticClustered,
    options: availableOptions
  }
  res.status(200).send({
    Success: true,
    message: { question }
  });
}

exports.clusterNullValueImputing = (req, res, next) => {
  availableOptions = ["Y", "N"];
  let question = {
    name: QB.performOutlier,
    options: availableOptions
  }
  res.status(200).send({
    Success: true,
    message: { question }
  });
}

exports.outlierHandling = (req, res, next) => {
  availableOptions = ["Y", "N"];
  let flows = this.getFlow();
  res.status(200).send({
    Success: true,
    message: { flows }
  });
}

exports.getAllAutomatedDTSteps = (req, res, next) => {

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
    "Please wait for the model scores...."
  ]
}