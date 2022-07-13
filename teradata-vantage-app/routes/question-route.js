module.exports = (app) => {
    const questionController = require("../controller/question-controller");
  
    app.get("/api/vantage/question/:id", questionController.getQuestion);
    app.post("/api/vantage/question/:id", questionController.questionAnswer);

  };
  