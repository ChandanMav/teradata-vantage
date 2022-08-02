module.exports = {
    apps : [{
      name   : "Teradata Vantage",
      script : "./bin/www",
      watch  : false,
      env: {
        ENV_CONFIG : "./../local.env"
      },
      env_production: {
        ENV_CONFIG : "./../prod.env"
      }      
    }]
  }
  