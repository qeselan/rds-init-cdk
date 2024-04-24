import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import * as lambda from "aws-lambda";
import * as pg from "pg";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

interface SecretValue {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

enum Status {
  Success = "SUCCESS",
  Failed = "FAILED",
}

interface AggregateError {
  errors?: any[];
}

export const handler = async (
  event: lambda.CloudFormationCustomResourceEvent
) => {
  console.log("EVENT RECEIVED:" + JSON.stringify(event));
  try {
    switch (event.RequestType) {
      case "Create":
        await onCreate(event as lambda.CloudFormationCustomResourceCreateEvent);
        break;
      case "Delete":
        await onDelete(event as lambda.CloudFormationCustomResourceDeleteEvent);
        break;
      default:
        console.log("NO MATCHING REQUEST TYPE");
    }
    return getResponse(Status.Success, event);
  } catch (error) {
    console.log("ERROR: " + error);
    throw Error("Something went wrong");
  }
};

export const onDelete = async (
  event: lambda.CloudFormationCustomResourceDeleteEvent
) => {
  const data = JSON.stringify(getResponse(Status.Success, event));
  await submitResponse(event.ResponseURL, data);
};

export const onCreate = async (
  event: lambda.CloudFormationCustomResourceCreateEvent
) => {
  const res = await executeScript(event, "script.sql");
  console.log("QUERY RESULT: ", JSON.stringify(res));
};

const executeScript = async (
  event: lambda.CloudFormationCustomResourceEvent,
  fileName: string
) => {
  const secret = await getSecretValue(
    event.ResourceProperties.config.CredsSecretName
  );
  const client = await getDatabaseClient(secret);
  const sqlScript = fs.readFileSync(path.join(__dirname, fileName)).toString();
  const res = await client.query(sqlScript);
  await client.end();
  return res;
};

export const submitResponse = async (url: string, data: string) => {
  let retry = 5;
  let responseReceived = false;
  while (!responseReceived) {
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      console.log("SUBMITTING RESPONSE: " + url + "\n" + data);
      const res = await axios.put(url, data);
      console.log("RESPONSE TO AXIOS POST: " + JSON.stringify(res));
      responseReceived = true;
      console.log("RESPONSE RECEIVED");
    } catch (error) {
      console.log("ERROR: " + error);
      if ((error as AggregateError).errors) {
        console.log("ERRORS: ", (error as AggregateError).errors);
      }
      if (retry == 0) break;
      console.log("SUBMIT RESPONSE FAILED RETRYING: " + retry);
      // throw Error("Something went wrong");
    }
    retry--;
  }
};

export const getSecretValue = async (secretName: string) => {
  const client = new SecretsManagerClient();
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    })
  );
  console.log("SECRET: ", response.SecretString);
  const secret = JSON.parse(response.SecretString as string) as SecretValue;
  return secret;
};

const getDatabaseClient = async ({
  password,
  username,
  host,
  dbname,
}: SecretValue) => {
  const client: pg.Client = new pg.Client({
    database: dbname,
    host,
    user: username,
    password,
  });
  await client.connect();
  console.log("CONNECTED TO: ", host, " DATABASE: ", dbname);
  return client;
};

const getResponse = (
  status: Status,
  event: lambda.CloudFormationCustomResourceEvent & {
    PhysicalResourceId?: string;
  }
) => {
  return {
    Status: status,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    PhysicalResourceId: event.PhysicalResourceId || "",
  };
};

exports.handler = handler;
