/* eslint-disable no-await-in-loop */

const { LambdaClient, GetFunctionCommand } = require('@aws-sdk/client-lambda');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { CloudFormationClient, DescribeStacksCommand, ListStackResourcesCommand } = require('@aws-sdk/client-cloudformation');
const { AccountClient, ListRegionsCommand } = require('@aws-sdk/client-account');

async function getRegions() {
  // region is required but does not matter as we just a list of regions enabled in one account
  const accountClient = new AccountClient({ region: 'eu-west-1' });
  let nextToken = null;
  let regions = [];

  do {
    const input = {
      NextToken: nextToken,
      RegionOptStatusContains: [
        'ENABLING',
        'ENABLED_BY_DEFAULT',
      ],
    };

    const command = new ListRegionsCommand(input);
    const response = await accountClient.send(command);
    regions = regions.concat(response.Regions.map((region) => region.RegionName));
    nextToken = response.NextToken;
  } while (nextToken);

  return regions;
}

async function getAccountId() {
  // region is required but does not matter as we just want the account number
  const stsClient = new STSClient({ region: 'eu-west-1' });
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);
  return response.Account;
}

async function describeCloudformationStacks(region) {
  const client = new CloudFormationClient({ region });
  let nextToken = null;
  let stacks = [];

  do {
    const input = {
      NextToken: nextToken,
    };
    const command = new DescribeStacksCommand(input);
    const response = await client.send(command);

    const existingStacks = response.Stacks.filter((s) => s.StackStatus !== 'DELETE_COMPLETE'); // Don't include deleted stacks
    stacks = stacks.concat(existingStacks);
    nextToken = response.NextToken;
  } while (nextToken);

  return stacks;
}

async function listStackResourceSummaries(region, stackName) {
  const client = new CloudFormationClient({ region });
  let nextToken = null;
  let stackResourceSummaries = [];
  do {
    const input = {
      StackName: stackName,
      NextToken: nextToken,
    };
    const command = new ListStackResourcesCommand(input);
    const response = await client.send(command);
    stackResourceSummaries = stackResourceSummaries.concat(response.StackResourceSummaries);
    nextToken = response.NextToken;
  } while (nextToken);

  return stackResourceSummaries;
}

async function getFunction(region, functionName) {
  const client = new LambdaClient({ region });
  const input = {
    FunctionName: functionName,
  };
  const command = new GetFunctionCommand(input);
  return client.send(command);
}

module.exports = {
  getRegions,
  getAccountId,
  describeCloudformationStacks,
  listStackResourceSummaries,
  getFunction,
};
