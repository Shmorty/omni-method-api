// import { DynamoDB } from "aws-sdk";
// import { ulid } from "ulid";
// import { Item } from "./base";
// import { getClient } from "./client";

// export class User extends Item {
//   userId: string;
//   email: string;

//   constructor(email: string, userId: string = ulid()) {
//     super();
//     this.email = email;
//     this.userId = userId;
//   }

//   static fromItem(item?: DynamoDB.AttributeMap): User {
//     if (!item) throw new Error("No item!");
//     return new User(item.email.S!, item.userId.S);
//   }

//   get pk(): string {
//     return `USER#${this.userId}`;
//   }

//   get sk(): string {
//     return `#METADATA#${this.userId}`;
//   }

//   toItem(): Record<string, unknown> {
//     return {
//       ...this.keys(),
//       userId: { S: this.userId },
//       email: { S: this.email },
//     };
//   }
// }

// export const addUser = async (user: User): Promise<User> => {
//   const client = getClient();

//   try {
//     await client
//       .putItem({
//         TableName: process.env.TABLE_NAME,
//         Item: user.toItem(),
//         ConditionExpression: "attribute_not_exists(PK)",
//       })
//       .promise();
//     return user;
//   } catch (error) {
//     console.log(error);
//     throw error;
//   }
// };
