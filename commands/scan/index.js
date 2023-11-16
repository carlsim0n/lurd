/* eslint-disable no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */

const yaml = require('js-yaml');
const cliProgress = require('cli-progress');
const fs = require('fs-extra');
const utils = require('../../shared/utils');
const aws = require('../../shared/aws');
const deprecatedRuntimes = require('../../shared/deprecatedRuntimes');

function printResult(content) {
  const totalStacks = content.stacks.length;
  const totalStackFunctions = content.stacks
    .reduce((total, stack) => total + stack.functions.length, 0);
  const totalBrokenStacks = content.brokenStacks.length;
  const totalBrokenStackFunctions = content.brokenStacks
    .reduce((total, stack) => total + stack.functions.length, 0);
  const output = [{
    TotalStacks: totalStacks,
    TotalStackFunctions: totalStackFunctions,
    TotalBrokenStacks: totalBrokenStacks,
    TotalBrokenStackFunctions: totalBrokenStackFunctions,
  }];

  console.log('Scan complete:');
  console.table(output);
}

async function saveToFile(dirPath, fileName, content) {
  const dirExists = fs.existsSync(dirPath);
  if (!dirExists) {
    fs.mkdirSync(dirPath, { recursive: true }, (err) => err && console.error(err));
  }

  const yamlString = yaml.dump(content);
  await fs.writeFile(`${dirPath}/${fileName}`, yamlString);
}

async function startClean(dirPath) {
  await fs.remove(dirPath);
}

async function filterStacksContainingResourceTypeLambda(region, stacks) {
  console.log('Filtering stacks containing lambda functions...');
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(stacks.length, 0);
  const filteredStacks = [];
  for await (const stack of stacks) {
    const stackResourceSummaries = await aws.listStackResourceSummaries(region, stack.StackName);
    stack.LambdaResourceSummaries = [];
    stack.LambdaResourceSummaries = stackResourceSummaries.filter((resource) => resource.ResourceType === 'AWS::Lambda::Function');

    if (stack.LambdaResourceSummaries.length !== 0) {
      filteredStacks.push(stack);
    }

    progressBar.increment(1);
  }

  progressBar.stop();
  return filteredStacks;
}

async function storeStacksWithDeprecatedLambdaRuntimes(
  region,
  account,
  filteredStacks,
  baseDir,
  stacksFileName,
  runtimes,
  delay = 500,
) {
  const content = {
    stacks: [],
    brokenStacks: [],
  };
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(filteredStacks.length, 0);

  for await (const stack of filteredStacks) {
    let isBroken = false;
    const stackContent = {
      name: stack.StackName,
      region,
      tags: stack.Tags,
      functions: [],
    };

    for await (const lambdaResource of stack.LambdaResourceSummaries) {
      await new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const functionLogicalName = `arn:aws:lambda:${region}:${account}:function:${lambdaResource.PhysicalResourceId}`;
            const response = await aws.getFunction(region, functionLogicalName);
            if (runtimes.includes(response.Configuration.Runtime)) {
              stackContent.functions.push({
                name: response.Configuration.FunctionName,
                runtime: response.Configuration.Runtime,
                tags: response.Tags,
              });
            }
          } catch (e) {
            isBroken = true;
            stackContent.functions.push({
              name: lambdaResource.PhysicalResourceId,
              runtime: null,
              tags: null,
            });
          }
          resolve();
        }, delay); // To avoid AWS throttling
      });
    }

    if (stackContent.functions.length !== 0) {
      if (isBroken) {
        content.brokenStacks.push(stackContent);
      } else {
        content.stacks.push(stackContent);
      }
    }

    progressBar.increment(1);
  }

  const dirPath = `${baseDir}/${account}/${region}`;
  const fileName = stacksFileName;
  await saveToFile(dirPath, fileName, content);
  printResult(content);
  progressBar.stop();
}

async function fileExists(filePath) {
  const exists = await fs.exists(filePath);
  if (!exists) {
    return false;
  }
  return true;
}

async function scan(options) {
  const scanOptions = await utils.setup(options);
  const runtimes = deprecatedRuntimes.get();

  if (scanOptions.regions.length > 1) {
    console.log(`No region provided. Performing scan command on all regions: \n${scanOptions.regions.join('\n')}`);
  }

  for await (const region of scanOptions.regions) {
    console.log(`Fetching stacks from ${region}...`);

    const directoryToClean = `${scanOptions.baseDir}/${scanOptions.accountId}/${region}`;
    const filePath = `${scanOptions.baseDir}/${scanOptions.accountId}/${region}/stacks.yaml`;
    const stackFileExists = await fileExists(filePath);

    if (stackFileExists) {
      const answer = await utils.prompt(`This will delete the current locally stored state of scanned stacks in ${region}. Are you sure you want to continue?`, true);
      if (answer) {
        await startClean(directoryToClean);
      }
    }

    const stacks = await aws.describeCloudformationStacks(region);
    const filteredStacks = await filterStacksContainingResourceTypeLambda(region, stacks);

    console.log(`Found ${filteredStacks.length} stacks containing lambda functions...`);

    if (filteredStacks.length !== 0) {
      console.log('Scanning stacks for deprecated functions...');
      await storeStacksWithDeprecatedLambdaRuntimes(
        region,
        scanOptions.accountId,
        filteredStacks,
        scanOptions.baseDir,
        scanOptions.stacksFileName,
        runtimes,
        500,
      );
    }
  }
}

module.exports = {
  scan,
};
