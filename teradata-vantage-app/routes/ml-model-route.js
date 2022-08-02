const autoMLController = require("../controller/automl-controller");
module.exports = (app) => {
  app.get("/api/vantage/question/:id", autoMLController.getQuestion);
  app.post("/api/vantage/univariate", autoMLController.univariate);
  app.post("/api/vantage/numuric/conversion", autoMLController.numericToCategoricalConversion);
  app.post("/api/vantage/outlier", autoMLController.outlierHandling);
  app.post("/api/vantage/clusternullvalue", autoMLController.clusterNullValueImputing);
  app.post("/api/vantage/basicnullvalue", autoMLController.basicNullValueImputing);
  app.get("/api/vantage/automateddt/steps", autoMLController.getAllAutomatedDTSteps);
  app.get("/api/vantage/flows", autoMLController.getModelBuildFlow);
  app.post("/api/vantage/buildmodel", autoMLController.buildModel);
};
