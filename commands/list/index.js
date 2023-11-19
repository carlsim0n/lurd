/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */

const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');
const utils = require('../../shared/utils');

function createTagKeyValueObject(tagKeyValueFilter) {
  const keyValues = tagKeyValueFilter || '';

  const [key, value] = keyValues.split('=');
  if (key && value) {
    return { key, value };
  }
  return {};
}

async function readStacksFile(filePath) {
  const yamlContent = await fs.readFile(filePath, 'utf8');
  return yaml.load(yamlContent);
}

function filterOnTag(stacks, tagKeyInput, tagValueInput) {
  const filteredStacks = [];

  if (!tagKeyInput || !tagValueInput) {
    return stacks;
  }

  const tagKeyToFind = tagKeyInput.toLowerCase();
  const tagValueToFind = tagValueInput.toLowerCase();

  for (const stack of stacks) {
    // Search tags in stack
    let foundStack = false;
    const stackTags = stack.tags || [];
    for (const tag of stackTags) {
      const tagKey = tag.Key.toLowerCase();
      const tagValue = tag.Value.toLowerCase();

      if (tagKey === tagKeyToFind && tagValue === tagValueToFind) {
        filteredStacks.push(stack);
        foundStack = true;
        break;
      }
    }

    if (!foundStack) {
      // Search tags in functions
      const functions = stack.functions || [];
      for (const func of functions) {
        const funcTags = func.tags || {};
        if (funcTags[tagKeyToFind] === tagValueToFind) {
          filteredStacks.push(stack);
          break;
        }
      }
    }
  }

  return filteredStacks;
}

function filterOnRegion(filteredStacks, region) {
  return filteredStacks.filter((s) => s.region === region);
}

function printResult(stacks) {
  const output = stacks.flatMap((stack) => stack.functions.map((func) => ({
    region: stack.region,
    stack: stack.name,
    function: func.name,
    runtime: func.runtime,
  })));

  console.table(output);
}

async function validScanFilesExists(filePath, region, days = 7) {
  const fileExists = await fs.exists(filePath);
  if (!fileExists) {
    console.log(`Unable to find the file ${filePath}. Have you scanned the region ${region} yet?`);
    return false;
  }
  const stats = await fs.stat(filePath);
  if (stats.mtime) {
    const today = new Date();
    const timeDifference = today.getTime() - stats.mtime.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

    if (daysDifference >= 7) {
      console.log(`It looks like the scan was last ran ${days} days ago. Consider running the scan command again to refresh your local state.`);
    }
  }
  return true;
}

async function list(options) {
  let listOptions = {};

  try {
    listOptions = await utils.setup(options);
  } catch (e) {
    console.log(e.message);
  }

  const tagKeyValue = createTagKeyValueObject(options.tagKeyValueFilter);
  if (Object.keys(tagKeyValue).length === 0) {
    console.log('No tag key values provided. Will not filter on tags.');
  } else {
    console.log(`Listing stacks and functions matching the key '${tagKeyValue.key}' and value '${tagKeyValue.value}'`);
  }

  if (listOptions.regions.length > 1) {
    console.log(`No region provided. Performing list command on all regions: \n${listOptions.regions.join('\n')}`);
  }

  let stacksResult = [];
  let validScanFileExists = false;
  for await (const region of listOptions.regions) {
    const filePath = path.join(
      listOptions.baseDir,
      listOptions.accountId,
      region,
      listOptions.stacksFileName,
    );
    validScanFileExists = await validScanFilesExists(filePath, region, 7);
    if (validScanFileExists) {
      const content = await readStacksFile(filePath);
      const stacks = options.brokenStacks ? content.brokenStacks : content.stacks;
      const filteredStacksOnTag = filterOnTag(stacks, tagKeyValue.key, tagKeyValue.value);
      const filteredStacksOnTagAndRegion = filterOnRegion(filteredStacksOnTag, region);
      stacksResult = stacksResult.concat(filteredStacksOnTagAndRegion);
    }
  }

  if (stacksResult.length === 0) {
    console.log('Found no matching stacks...');
  } else {
    printResult(stacksResult);
  }
}

module.exports = {
  list,
};
