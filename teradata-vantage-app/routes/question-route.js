module.exports = (app) => {
    const questionController = require("../controller/question-controller");
  
    app.get("/api/vantage/question/:id", questionController.getQuestion);
    app.post("/api/vantage/univariate", questionController.univariate);
    app.post("/api/vantage/numuric/conversion", questionController.numericToCategoricalConversion);
    app.post("/api/vantage/outlier", questionController.outlierHandling);
    app.post("/api/vantage/clusternullvalue", questionController.clusterNullValueImputing);
    app.post("/api/vantage/basicnullvalue", questionController.basicNullValueImputing);
    app.get("/api/vantage/automateddt/steps", questionController.getAllAutomatedDTSteps);
    app.get("/api/vantage/flows", questionController.getModelBuildFlow);
    app.post("/api/vantage/buildmodel", questionController.buildModel);
    
    
  };
  