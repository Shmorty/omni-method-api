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
  // const userId = ulid();
  const userId = reqBody.id;
  const newUser = {
    ...reqBody,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: {
        ...newUser,
        type: "user",
        PK: `USER#${userId}`,
        SK: `#METADATA#${userId}`,
      },
      // ConditionExpression: "attribute_not_exists(PK)",
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(newUser),
  };
};

export const getUsers = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const output = await docClient
    .scan({
      TableName: tableName,
      FilterExpression: "#T = :userType",
      ExpressionAttributeNames: {
        "#T": "type",
      },
      ExpressionAttributeValues: {
        ":userType": { S: "user" },
      },
    })
    .promise();

  if (!output) {
    return {
      statusCode: 404,
      body: JSON.stringify({ id: `users`, error: "not found" }),
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
  // format date
  let d = new Date(reqBody.scoreDate);
  let ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
  let mo = new Intl.DateTimeFormat("en", { month: "2-digit" }).format(d);
  let da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
  const scoreDate = `${ye}-${mo}-${da}`;
  let newScore = {};

  // console.log("addScore for user " + id);
  // console.log(reqBody);
  await calcScore(reqBody).then(async (score) => {
    // console.log("got calculated score " + score.toString());
    newScore = {
      ...reqBody,
      calculatedScore: score,
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
  });

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

export const deleteScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  const reqBody = JSON.parse(event.body as string);
  const aid = reqBody.aid;
  const scoreDate = reqBody.scoreDate;
  console.log("deleteScore uid: " + id + " aid: " + aid + ", scoreDate: " + scoreDate);

  await docClient
    .delete({
      TableName: tableName,
      Key: {
        PK: `USER#${id}`,
        SK: `SCORE#${aid}#${scoreDate}`,
      },
    })
    .promise();

  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "OPTIONS,PUT",
    },
    body: "",
  };
};

interface Score {
  uid: string;
  aid: string;
  scoreDate: string;
  rawScore: number;
  calculatedScore?: number;
  notes?: string;
}
const wrValues = {
  DLFT: 939,
  BKSQ: 800,
  WTPU: 500,
  BNCH: 600,
  SQTS: 150,
  PSHU: 150,
  PLUP: 49,
  STLJ: 147,
  PSHP: 495,
  PWCL: 400,
  PSPR: 9.58,
  PIKE: 0,
  BKBN: 0,
  STRD: 0,
  TWOMDST: 0.5,
  ONEHRDST: 13.25,
  STAPN: 11.5,
  AGLTY: 13,
  BLNC: 10,
  COORD: 47,
};
const WR = new Map(Object.entries(wrValues));

async function getBodyWeight(id: string): Promise<number> {
  let weight = 0;
  var params = {
    TableName: tableName,
    Key: {
      PK: `USER#${id}`,
      SK: `#METADATA#${id}`,
    },
  };

  const output = await docClient.get(params).promise();

  if (output.Item) {
    weight = output.Item.weight;
  }

  return weight;
}

async function calcScore(req: Score): Promise<number> {
  let wr = WR.get(req.aid) || 0;
  let result = req.rawScore;
  switch (req.aid) {
    case "DLFT": // Deadlift
    case "BKSQ": // Squat
    case "BNCH": // Bench
    case "SQTS": // Squats
    case "PSHU": // Pushups
    case "PLUP": // Pullups
    case "STLJ": // Standing Long Jump
    case "PSHP": // Push Press
    case "PWCL": // Clean
    case "STAPN": // Static Apnea
      // result = Math.round((req.rawScore / wr) * 100000) / 100;
      result = Math.round((req.rawScore / wr) * 1000);
      break;
    case "WTPU": // Weighted Pull-up
      await getBodyWeight(req.uid).then((bodyWeight) => {
        console.log("rawScore " + req.rawScore.toString());
        console.log("got body weight: " + bodyWeight.toString());
        console.log("world record " + wr.toString());
        result = ((req.rawScore + Number(bodyWeight)) / wr) * 1000;
        console.log("set result " + result.toString());
      });
      break;
    case "PIKE": // Pike
    case "BKBN": // Backbend
    case "STRD": // Straddle
    case "BLNC": // Balance
    case "COORD": // Coordination
      result = req.rawScore * 100;
      break;
    case "PSPR": // 100 meter sprint
      // result = Math.round((Math.sqrt((req.rawScore - wr) / 0.125) * -1 + 10) * 10000) / 100;
      result = Math.round((Math.sqrt((req.rawScore - wr) / 0.125) * -1 + 10) * 100);
      break;
    case "TWOMDST": // 2 minute distance
      // result = Math.round((Math.sqrt((wr - req.rawScore) / 0.005) * -1 + 10) * 10000) / 100;
      result = Math.round((Math.sqrt((wr - req.rawScore) / 0.005) * -1 + 10) * 100);
      break;
    case "ONEHRDST": // 1 hour distance
      // result = Math.round((Math.sqrt((wr - req.rawScore) / 0.1325) * -1 + 10) * 10000) / 100;
      result = Math.round((Math.sqrt((wr - req.rawScore) / 0.1325) * -1 + 10) * 100);
      break;
    case "AGLTY": // Agility
      // result = Math.round((Math.sqrt((req.rawScore - wr) / 0.25) * -1 + 10) * 10000) / 100;
      result = Math.round((Math.sqrt((req.rawScore - wr) / 0.25) * -1 + 10) * 100);
      break;
    default:
      // if falls through jusr return raw score
      break;
  }
  return Promise.resolve(result);
}
