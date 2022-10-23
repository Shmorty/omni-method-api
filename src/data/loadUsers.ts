"use strict";

const fs = require("fs");

// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
// Set the region
AWS.config.update({ region: "us-east-1" });

let rawdata = fs.readFileSync("./users.json");
let data = JSON.parse(rawdata);
console.log("users: " + data.users.length);
// console.log(data);

// Create DynamoDB document client
var docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

data.users.forEach((u) => {
  let params = {
    TableName: "OmniMethodTable",
    Item: {
      ...u,
      PK: `USER#${u.id}`,
      SK: `#METADATA#${u.id}`,
    },
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
  //   console.log("user " + c.firstName);
});
