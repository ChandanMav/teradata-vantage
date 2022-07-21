module.exports = (app) => {
    const questionController = require("../controller/question-controller");
  
    app.get("/api/vantage/question/:id", questionController.getQuestion);
    app.post("/api/vantage/question/:id", questionController.questionAnswer);
    app.post("/api/vantage/numuric/conversion", questionController.numericToCategoricalConversion);
    app.get("/api/vantage/outlier", questionController.outlierHandling);
    app.get("/api/vantage/clusternullvalue", questionController.clusterNullValueImputing);
    app.get("/api/vantage/basicnullvalue", questionController.basicNullValueImputing);
    app.get("/api/vantage/automateddt/steps", questionController.getAllAutomatedDTSteps);
    
    
  };
  