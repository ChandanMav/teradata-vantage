module.exports = {
    apps : [{
      name   : "ETL",
      script : "./bin/www",
      watch  : false,
      env: {
        ENV_CONFIG : "./../.env"
      },
      env_production: {
        ENV_CONFIG : "./../.env"
      }      
    }]
  }
  