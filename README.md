# Lambda Unsupported Runtimes Detector (lurd)

![Dependabot](https://img.shields.io/badge/dependabot-025E8C?style=for-the-badge&logo=dependabot&logoColor=white)
[![Licence](https://img.shields.io/github/license/Ileriayo/markdown-badges?style=for-the-badge)](./LICENSE)
[![cd](https://github.com/carlsim0n/lurd/actions/workflows/cd.yml/badge.svg?branch=main)](https://github.com/carlsim0n/lurd/actions/workflows/cd.yml)

Have you like many others started your cloud journey by producing loads of lambdas? As time goes by you might have lambdas with deprecated runtimes. Do you suspect you have deprecated ones? Then go ahead and use this tool to scan your AWS account. 

**But there's already a trusted advisor check that can list deprecated lambda runtimes?**  
Yes, but it requires business or enterprice support plans. Besides, Lambda Unsupported Runtimes Detector (lurd) lists the stacks that the function belongs to which reduces the amount of time spent on detective work.

#### Note
This tool **only** scans lambdas **created through AWS cloudformation**. The idea is that you should easliy be able to overlook a list of functions and which stack they belong to in order to take action.

## Getting started

1. Install the tool
```bash
npm install -g lambda-unsupported-runtimes-detector
```
2. Authenticate to your AWS account though CLI

### Commands

#### scan

```bash
Usage: lurd scan [options]

Performs the scanning on the stacks

Options:
  -r, --region [region]  region to scan
  -h, --help             display help for command
```

examples:

```bash
# Scan for stacks associated with deprecated functions in the eu-north-1 region
lurd scan --region eu-north-1
```

```bash
# Scan for stacks associated with deprecated functions in all regions enabled in the account
lurd scan
```

*Note: the result is stored locally in the `.stacks` folder. You should use the list command to query the result.*

#### list

```bash
Usage: lurd list [options]

List stacks with deprecated functions, requires the scan command to run first

Options:
  -t, --tag-key-value-filter <tagKeyFilter>  list of key values to search for in tags
  -r, --region [region]                      list stacks from region
  --broken-stacks                            if you only want to list broken stacks
  -h, --help                                 display help for command
```

examples:

```bash
# List all stacks and it's related deprecated functions mathing the tag "team: operations" in eu-north-1 region
lurd list --tag-key-value-filter team=operations --region eu-north-1
```

*Note, by providing the `--tag-key-value-filter` lurd first tries to match the provided key value tag on the cloudformation stack. If not found, lurd will look at the functions related to the stack*

```bash
# List all stacks and it's related deprecated functions in eu-north-1 region
lurd list --region eu-north-1
```

```bash
# List all stacks that for some reason cannot be evaluated. Most commonly is that there's a drift where the lambda has been deleted manually but the stack has not been updated.
lurd list --broken-stacks
```

```bash
# List all stacks and it's related deprecated functions
lurd list
```
