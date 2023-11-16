const inquirer = require('inquirer');
const aws = require('./aws');

async function setup(options) {
  const availableRegions = await aws.getRegions();

  if (options.region && !availableRegions.includes(options.region)) {
    throw new Error(`Region ${options.region} is not a valid region in this account. Available regions are:\n${availableRegions.join('\n')}`);
  }

  const accountId = await aws.getAccountId();
  const regions = options.region ? [options.region] : availableRegions;
  const baseDir = '.stacks';
  const stacksFileName = 'stacks.yaml';

  return {
    accountId,
    regions,
    baseDir,
    stacksFileName,
  };
}

async function prompt(message, defaultValue) {
  return (
    await inquirer.prompt({
      type: 'confirm',
      name: 'choice',
      default: defaultValue || true,
      message,
    })
  ).choice;
}

module.exports = {
  setup,
  prompt,
};
