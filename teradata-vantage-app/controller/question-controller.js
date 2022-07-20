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

    default:
      res
        .status(500)
        .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
      return;
  }
};

exports.questionAnswer = (req, res, next) => {
  try {
    let questionID = req.params.id;
    let requestBody = sanitize(req.body);
    //console.log(requestBody);

    if (!questionID) {
      res
        .status(500)
        .send({ Success: false, error_code: Errorcode.Missing_Required_Input, message: Error.MISSING_REQUIRED_INPUT });
      return;
    }


    let config = getConfig(req);

    if (!config) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.No_database_Session,
        message: Error.ERR_NO_AUTH,
      });
      return;
    }

    let db = requestBody.db;
    let basetable = requestBody.basetable;
    let dep_col = requestBody.dep_col;


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

    let allCols = requestBody.allCols;
    if (!allCols) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }

    allCols = allCols.split(",");

    let nCols = requestBody.nCols;
    if (!nCols) {
      res.status(503).send({
        Success: false,
        error_code: Errorcode.Missing_Required_Input,
        message: Error.NO_SESSION,
      });
      return;
    }
    nCols = nCols.split(",");

    // let cCols = requestBody.cCols;
    // console.log(requestBody.cCols);
    // if (!cCols) {
    //   res.status(503).send({
    //     Success: false,
    //     error_code: Errorcode.Missing_Required_Input,
    //     message: Error.NO_SESSION,
    //   });
    //   return;
    // }
    // cCols = cCols.split(",");

    switch (parseInt(questionID)) {
      case 1:
        let remainingCols = requestBody.remainingCols;
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

        let key = requestBody.key;

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
              DAO.dropTable(connection, query, (err, data) => {
                if (data) {
                  callback(null, data);
                } else {
                  callback(true, err);
                }
              });
            }, //End of droping work table

            //Create new Work Table
            (data, callback) => {
              if (key === 'Y') {
                let query = `create table ${db}.${basetable}_work as ( SELECT ${remainingCols} from ${db}.${basetable} ) WITH DATA`;
                DAO.createTable(connection, query, (err, data) => {
                  if (data) {
                    basetable = `${basetable}_work`;
                    callback(null, data);
                  } else {
                    callback(true, err);
                  }
                });
              } else {
                basetable = `${basetable}`;
                callback(null, data);
              }
            }, //End of droping work table

            //Run Univariate Result
            (data, callback) => {
              winston.info("Exploratory Data Analysis started using Vantage MLE functions 'UnivariateStatistics' and 'Unpivoting' ...");
              async.waterfall([
                //DROP moments_ table if any
                innerCB => {
                  winston.info("Droping moments_ table if any")
                  let query = `DROP TABLE ${db}.moments_${basetable}`;
                  DAO.dropTable(connection, query, (err, data) => {
                    if (data) {
                      innerCB(null, true);
                    } else {
                      winston.error(err);
                      innerCB(null, false);
                    }
                  });
                }, //End of droping moments_ table

                //DROP basic_ table if any
                (result, innerCB) => {
                  if (!result) {
                    innerCB(null, false);
                    return;
                  }

                  winston.info("Droping basic_ table if any")
                  let query = `DROP TABLE ${db}.basic_${basetable}`;
                  DAO.dropTable(connection, query, (err, data) => {
                    if (data) {
                      innerCB(null, true);
                    } else {
                      winston.error(err);
                      innerCB(null, false);
                    }
                  });
                }, //End of droping basic_ table
                //DROP quantiles_ table if any
                (result, innerCB) => {
                  if (!result) {
                    innerCB(null, false);
                    return;
                  }

                  winston.info("Droping quantiles_ table if any")
                  let query = `DROP TABLE ${db}.quantiles_${basetable}`;
                  DAO.dropTable(connection, query, (err, data) => {
                    if (data) {
                      innerCB(null, true);
                    } else {
                      winston.error(err);
                      innerCB(null, false);
                    }
                  });
                }, //End of droping quantiles_ table

                //Perform UnivariateStatistics
                (result, innerCB) => {
                  if (!result) {
                    innerCB(null, false);
                    return;
                  }
                  let query = `SELECT * FROM UnivariateStatistics (
                    ON ${basetable} AS InputTable
                    OUT TABLE MomentsTableName(${db}.moments_${basetable})
                    OUT TABLE BasicTableName(${db}.basic_${basetable})
                    OUT TABLE QuantilesTableName(${db}.quantiles_${basetable})
                    USING
                    ExcludeColumns('${dep_col}')
                    ) AS dt `;

                  //console.log(query);

                  DAO.executeQuery(connection, query, (err, data) => {
                    if (data) {
                      innerCB(null, true);
                    } else {
                      winston.error(err);
                      innerCB(null, false);
                    }
                  });
                }// End of Performing UnivariateStatistics

                //Perform univariate_unpivot

                //Partitioning univariate_unpivot
                //Need to write code

              ], (err, result) => {
                winston.error(err);
                callback(null, null);
              })
            }
          ],
          (error, result) => {
            if (error) {
              winston.error(error);
              res
                .status(500)
                .send({ Success: false, error_code: Errorcode.Error_500, message: error });
            } else {

              let result = {
                output: sample.data,
                question: {
                  name: QB.performAutomatedDataTransformation,
                  options: ["Y", "N"]
                },
                basetable: basetable
              };

              res.status(200).send({ success: true, message: result });
            }
          }
        );
        break;
      default:
        res
          .status(500)
          .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
        return;
    }
  } catch (error) {
    return next(createError(500));
  }
};
