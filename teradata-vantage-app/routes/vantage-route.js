module.exports = (app) => {
  const vantageController = require("../controller/vantage-controller");

  app.post("/api/connection", vantageController.testConnection);
  app.get("/api/databases", vantageController.getDatabases);
  app.get("/api/databases/:database/tables", vantageController.getTables);
  app.get("/api/databases/:database/tables/:table/columns", vantageController.getColumns);

  app.post("/api/vantage/init", vantageController.init);
};
