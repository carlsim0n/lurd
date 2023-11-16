#!/usr/bin/env node

const package = require("./package.json");
const { program } = require('commander');
const scan = require(`./commands/scan`).scan;
const list = require(`./commands/list`).list;

program.version(package.version, "-v, --vers", "output the current version");

program
  .command('list')
  .option('-t, --tag-key-value-filter <tagKeyFilter>', 'list of key values to search for in tags')
  .option('-r, --region [region]', 'list stacks from region')
  .option('--broken-stacks', 'if you only want to list broken stacks')
  .description('List stacks with deprecated functions, requires the scan command to run first')
  .action(list);

program
  .command('scan')
  .option('-r, --region [region]', 'region to scan')
  .description('Performs the scanning on the stacks')
  .action(scan);

program.parse();
