var TeradataExceptions = require("teradata-nodejs-driver/teradata-exceptions");
var sanitize = require("mongo-sanitize");
var _ = require("lodash");

exports.getTimeStamp = () => {
  const dateObject = new Date();
  // current date
  // adjust 0 before single digit date
  const date = `0 ${dateObject.getDate()}`.slice(-2);

  // current month
  const month = `0 ${dateObject.getMonth() + 1}`.slice(-2);

  // current year
  const year = dateObject.getFullYear();

  // current hours
  const hours = dateObject.getHours();

  // current minutes
  const minutes = dateObject.getMinutes();

  // current seconds
  const seconds = dateObject.getSeconds();

  return `${month}${date}${year}_${hours}${minutes}${seconds}`;
};

exports.cleanupTempFile = (BASE_TABLE) => {
  console.log("Cleaning up of temp files are done!");
};

/*
 * Extract error code from the Teradata Operation Exception error message
 */
exports.getErrorCode = (msg) => {
  var regex = /\[Error (\d+)\]/;
  var found = msg.match(regex);
  var errorCode = "";
  if (found && found.length > 0) {
    errorCode = found[1];
  }
  return parseInt(errorCode, 10);
};

exports.anIgnoreError = (error) => {
  var ignoreErrorCodes = [
    3526, // The specified index does not exist.
    3802, // Database '%VSTR' does not exist.
    3807, // Object '%VSTR' does not exist.
    3824, // Macro '%VSTR' does not exist.
    3913, // The specified check does not exist.
    4322, // Schema %VSTR does not exist # DR176193
    5322, // The specified constraint name '%VSTR' does not exist.
    5495, // Stored Procedure "%VSTR" does not exist.
    5589, // Function "%VSTR" does not exist.
    5620, // Role '%VSTR' does not exist.
    5623, // User or role '%VSTR' does not exist.
    5653, // Profile '%VSTR' does not exist.
    5901, // Replication Group '%VSTR' does not exist.
    6808, // Ordering is not defined for UDT '%TVMID'.
    6831, // UDT "%VSTR" does not exist.
    6834, // Method "%VSTR" does not exist.
    6849, // The UDT (%VSTR) does not have Transform, or does not have the specified Transform Group.
    6863, // Cast with specified source and target does not exist
    6934, // External Stored Procedure "%VSTR" does not exist.
    6938, // Authorization "%VSTR" does not exist.
    7972, // JAVA Stored Procedure "%VSTR" does not exist.
    9213, // Connect Through privilege for %VSTR not found
    9403, // Specified constraint name "%VSTR" does not exist
  ];

  if (error instanceof TeradataExceptions.OperationalError) {
    if (ignoreErrorCodes.includes(this.getErrorCode(error.message))) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};



exports.getConfig = (req) => {
  var serverInfo = sanitize(req.body);
  if (!serverInfo || _.isEmpty(serverInfo)) {
    return null;
  }
  let host = serverInfo.host;
  let password = serverInfo.password;
  let user = serverInfo.user;

  let config = {
    host,
    log: "0",
    password,
    user,
  };

  return config;
}


exports.formatUnivariateStatsData = (data) => {
  if (!data) {
    return [];
  }

  let fdata = [];
    for(let d = 0; d<data.length; d++){

    let obj = {};
    let item = data[d];

    obj.Attribute = item[0];
    obj.Mean = Number(item[1]).toFixed(2);
    obj.Median = Number(item[2]).toFixed(2);
    obj.Mode = Number(item[3]).toFixed(2);
    obj['Null Values Count'] = parseInt(item[4]);
    obj['Negative Values Count'] = parseInt(item[5]);
    obj['Unique values Count'] = parseInt(item[6]);
    obj.Range = Number(item[7]).toFixed(2);
    obj.Minimum = Number(item[8]).toFixed(2);
    obj.Maximum = Number(item[9]).toFixed(2);

    fdata.push(obj);
  
    }
  return fdata;
}