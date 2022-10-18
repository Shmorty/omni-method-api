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
      body: JSON.stringify({ error: "not found" }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(output.Item),
  };
};

export const addScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  const reqBody = JSON.parse(event.body as string);
  const assessmentId = reqBody.assessmentId;
  const today = new Date().toLocaleDateString(undefined, {});
  const newScore = {
    ...reqBody,
    scoreDate: today,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...newScore,
        PK: `USER#${id}`,
        SK: `SCORE#${assessmentId}#${today}`,
      },
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(newScore),
  };
};