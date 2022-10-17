import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { ulid } from "ulid";

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "OmniMethodTable";

export const addCategory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const reqBody = JSON.parse(event.body as string);
  const categoryId = ulid();
  const category = {
    ...reqBody,
    id: categoryId,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...category,
        PK: `CAT#${categoryId}`,
        SK: `#METADATA#${categoryId}`,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(category),
  };
};

export const addAssessment = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const reqBody = JSON.parse(event.body as string);
  let categoryId = reqBody.categoryId;
  const assessmentId = ulid();
  const assessment = {
    ...reqBody,
    id: assessmentId,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...assessment,
        PK: `CAT#${categoryId}`,
        SK: `ASMT#${assessmentId}`,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(assessment),
  };
};

export const getAssessments = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const output = await docClient
    .scan({
      TableName: tableName,
      ConsistentRead: false,
      FilterExpression: "begins_with (PK, :prefix)",
      ExpressionAttributeValues: {
        ":prefix": "CAT#",
      },
    })
    .promise();

  if (!output) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "not found" }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(output),
  };
};
