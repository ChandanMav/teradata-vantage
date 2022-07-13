var _ = require("lodash");
var async = require("async");
var winston = require("./../config/winston");
var sanitize = require("mongo-sanitize");
var Error = require("../common/app.err.messages");
var { getConnection, closeConnection } = require("../teradata-connection");
var DAO = require("../dao/teradata-dao");
var { anIgnoreError } = require("../common/util");
var QB = require("./question-bank");
var Errorcode = require("../common/error-code");

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

  let session = req.session;
  let columns = session.list_of_all_columns;

  if (!columns) {
    res.status(503).send({
      Success: false,
      error_code: Errorcode.No_columns_Session,
      message: Error.NO_SESSION,
    });
    return;
  }

  switch (parseInt(questionID)) {
    case 1:
      question = QB.removeAnyColumn;
      availableOptions = ["Y", "N"];
      res.status(200).send({
        Success: true,
        message: { question, option: availableOptions, columns },
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
  let questionID = req.params.id;
  let requestBody = sanitize(req.body);
  //console.log(requestBody);

  if (!questionID) {
    res
      .status(500)
      .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
    return;
  }

  let session = req.session;
  let config = session.config;
  let allCols = session.list_of_all_columns;

  let db = requestBody.db;
  let basetable = requestBody.basetable;
  let dep_col = requestBody.dep_col;

  //console.log(config);
  //console.log(allCols);

  if (!config) {
    res.status(503).send({
      Success: false,
      error_code: Errorcode.No_database_Session,
      message: Error.ERR_NO_AUTH,
    });
    return;
  }

  if (!allCols) {
    res.status(503).send({
      Success: false,
      error_code: Errorcode.No_columns_Session,
      message: Error.NO_SESSION,
    });
    return;
  }

  if (!db) {
    res.status(503).send({
      Success: false,
      message: Error.MISSING_REQUIRED_INPUT,
    });
    return;
  }

  if (!basetable) {
    res.status(503).send({
      Success: false,
      message: Error.MISSING_REQUIRED_INPUT,
    });
    return;
  }

  if (!dep_col) {
    res.status(503).send({
      Success: false,
      message: Error.MISSING_REQUIRED_INPUT,
    });
    return;
  }


  switch (parseInt(questionID)) {
    case 1:
      let key = requestBody.key;
      if (key === "Y") {
        let connection = getConnection(config);

        if (!connection) {
          res
            .status(500)
            .send({ Success: false, message: `Teradata Connnection failed!` });
          return;
        }

        let cols = requestBody.columns;
        let deletedCols = cols.split(",");

        //console.log(deletedCols);
        //console.log(allCols);

        _.remove(allCols, (col) => {
          return _.indexOf(deletedCols, col) !== -1;
        });

        //console.log(allCols);
        session.list_of_all_columns = allCols;

        async.waterfall(
          [
            (callback) => {
              //Drop the table
              let query = `DROP TABLE ${db}.${basetable}_work`;
              DAO.dropTable(connection, query, (err, data) => {
                if (data) {
                  callback(null, data);
                } else {
                  callback(true, err);
                }
              });
            },

            //Create Work Table
            (data, callback) => {
              let query = `create table ${db}.${basetable}_work as ( SELECT ${allCols} from ${db}.${basetable} ) WITH DATA`;
              DAO.createTable(connection, query, (err, data) => {
                if (data) {
                  callback(null, data);
                } else {
                  callback(true, err);
                }
              });
            },
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
                },
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
                },
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
                },
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
                }
                //Perform univariate_unpivot

                //Partitioning univariate_unpivot
              ], (err, result) => {
                console.log(err);
                console.log(result)
                callback(null, data);
              })

            },
          ],
          (error, result) => {
            if (error) {
              winston.error(error);
              res.status(500).send({ message: error });
            } else {
              res.status(200).send({ message: result });
            }
          }
        );
      } else {
        res.status(200).send({ action: "No" });
      }
      break;
    default:
      res
        .status(500)
        .send({ Success: false, message: Error.MISSING_REQUIRED_INPUT });
      return;
  }
};
