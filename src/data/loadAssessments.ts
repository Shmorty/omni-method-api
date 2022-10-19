"use strict";

const fs = require("fs");

// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
// Set the region
AWS.config.update({ region: "us-east-1" });

let rawdata = fs.readFileSync("./assessments.json");
let data = JSON.parse(rawdata);
console.log("categories: " + data.categories.length);
console.log("assessments: " + data.assessments.length);
// console.log(data);

// Create DynamoDB document client
var docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

data.categories.forEach((c) => {
  let params = {
    TableName: "OmniMethodTable",
    Item: {
      ...c,
      PK: "META",
      SK: `CAT#${c.cid}`,
    },
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
  //   console.log("category " + c.label);
});

data.assessments.forEach((a) => {
  let params = {
    TableName: "OmniMethodTable",
    Item: {
      ...a,
      PK: "META",
      SK: `ASMT#${a.aid}`,
    },
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
  //   console.log("assessment " + assessment.label);
});
