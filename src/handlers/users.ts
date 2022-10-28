import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { ulid } from "ulid";

// export const main: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
//   const reqBody = JSON.parse(event.body as string);
//   const newUser = {
//     ...reqBody,
//   };
//   await addUser(newUser);
//   return {
//     statusCode: 201,
//     body: JSON.stringify(newUser),
//   };
// };

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "OmniMethodTable";

export const addUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const reqBody = JSON.parse(event.body as string);
  const userId = ulid();
  const newUser = {
    ...reqBody,
    id: userId,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...newUser,
        PK: `USER#${userId}`,
        SK: `#METADATA#${userId}`,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(newUser),
  };
};

export const getUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const output = await docClient
    .get({
      TableName: tableName,
      Key: {
        PK: `USER#${id}`,
        SK: `#METADATA#${id}`,
      },
    })
    .promise();

  if (!output.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ id: `${id}`, error: "not found" }),
    };
  }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(output.Item),
  };
};

export const getScores = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const output = await docClient
    .query({
      TableName: tableName,
      ConsistentRead: false,
      KeyConditionExpression: "PK = :key and begins_with (SK, :prefix)",
      ExpressionAttributeValues: {
        ":key": `USER#${id}`,
        ":prefix": "SCORE#",
      },
    })
    .promise();

  if (!output) {
    return {
      statusCode: 404,
      body: JSON.stringify({ id: `${id}`, error: "not found" }),
    };
  }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(output),
  };
};

export const getUserScores = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  // read database
  const output = await docClient
    .query({
      TableName: tableName,
      ConsistentRead: false,
      KeyConditionExpression: "PK = :key",
      ExpressionAttributeValues: {
        ":key": `USER#${id}`,
      },
    })
    .promise();

  if (!output) {
    return {
      statusCode: 404,
      body: JSON.stringify({ id: `${id}`, error: "not found" }),
    };
  }
  // build response
  var user = {};
  var scores = new Array();
  output.Items?.forEach((element) => {
    delete element["PK"];
    delete element["SK"];
    if (element.type == "user") {
      delete element["type"];
      user = element;
    } else if (element.type === "score") {
      delete element["type"];
      scores.unshift(element);
    }
  });
  // send response
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ user: user, scores: scores }),
  };
};

export const addScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  const reqBody = JSON.parse(event.body as string);
  const aid = reqBody.aid;
  const scoreDate = reqBody.scoreDate;
  const newScore = {
    ...reqBody,
    calculatedScore: reqBody.rawScore * 2,
    // scoreDate: today,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...newScore,
        type: "score",
        PK: `USER#${id}`,
        SK: `SCORE#${aid}#${scoreDate}`,
      },
    })
    .promise();

  return {
    statusCode: 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "OPTIONS,PUT",
    },
    body: JSON.stringify(newScore),
  };
};
