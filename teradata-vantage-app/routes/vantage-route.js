module.exports = (app) => {
  const vantageController = require("../controller/vantage-controller");
  app.post("/api/connection", vantageController.testConnection);  //Saving config in session
  app.post("/api/databases", vantageController.getDatabases); //Nothing has been saved into session
  app.post("/api/databases/:database/tables", vantageController.getTables); //Nothing has been saved into session
  app.post("/api/databases/:database/tables/:table/columns", vantageController.getColumns);//Saving list_of_all_columns in session
  app.post("/api/vantage/init", vantageController.init); //Nothing has been saved into session
  app.post("/api/uploadappconfig", vantageController.uploadConfig); //Nothing has been saved into session
};
