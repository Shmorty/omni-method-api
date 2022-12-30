// to use alternate credentials
// export AWS_PROFILE=admin
// will use [admin] from ~/.aws/credentials

var AWS = require("aws-sdk");

AWS.config.getCredentials(function (err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log("Access key:", AWS.config.credentials.accessKeyId);
  }
});
