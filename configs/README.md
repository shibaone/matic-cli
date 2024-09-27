# Configurations

`express-cli` and `matic-cli` use these config files to bootstrap the devnet.
In case of `express-cli`, these configs are dynamically changes based on the `.env` file.
For `mati-cli`, the configs are directly used to spin the network up.

## Usage

```bash
matic-cli setup devnet --config path/to/config.yaml
```

## Option details with examples

```yaml
# Default stake for each validator (in matic)
defaultStake: 10000

# Default amount of fee to topup heimdall validator
defaultFee: 2000

# ChainID of bor (leave empty to get a random one)
borChainId:

# ChainID of heimdall (leave empty to get a random one)
heimdallChainId:

# Sprint size (number of blocks for each bor sprint)
sprintSize:

# Block numbers (comma separated values defining the block heights of bor where sprint size must change)
sprintSizeBlockNumber:

# Block numbers (comma separated values defining the block heights of bor where block time must change)
blockNumber:

# Block times (comma separated values defining the block times for the relative blockNumber(s))
blockTime:

# Number of validators to create
numOfValidators: 2

# Number of non-validators (sentry nodes) to create
numOfNonValidators: 0

# Devnet type, choose from [docker, remote]
devnetType: remote

# URL to Ethereum RPC
ethURL: http://ganache:9545

# Remote user for Ethereum RPC. Only effective when devnetType is `remote`.
ethHostUser: ubuntu

# IPs of hosts where bor will run. Only effective when devnetType is `remote`.
devnetBorHosts:
  - 172.20.1.100
  - 172.20.1.101

# IPs of hosts where heimdall will run. Only effective when devnetType is `remote`. It's recommended to run bor and heimdall on same VMs, hence devnetBorHosts===devnetHeimdallHosts
devnetHeimdallHosts:
  - 172.20.1.100
  - 172.20.1.101

# Users of hosts where bor will run. Only effective when devnetType is `remote`.
devnetBorUsers:
  - ubuntu
  - ubuntu

# Users where heimdall will run. Only effective when devnetType is `remote`.
devnetHeimdallUsers:
  - ubuntu
  - ubuntu

# Branch of bor to use. Repository: https://github.com/shibaone/bor
borBranch: c5569e4da9ebe0ce4e63aec571966c71234f7cfc # todo change to develop once https://polygon.atlassian.net/browse/POS-979 is solved

# Branch of Heimdall to use. Repository: https://github.com/shibaone/heimdall
heimdallBranch: v1.0.7-bone-candidate

# Branch of contract to use. Repository: https://github.com/shibaone/contracts
contractsBranch: mardizzone/node-upgrade # todo change to master once contracts team merges the PR

# Branch of contract to use. Repository: https://github.com/shibaone/genesis-contracts
genesisContractsBranch: mardizzone/node-upgrade # todo change to master once contracts team merges the PR

# Docker build context for bor. Used in docker setup. When specified, borBranch will be ignored.
borDockerBuildContext: 'https://github.com/shibaone/bor.git#v1.3.7-bone-candidate' # todo change to develop once https://polygon.atlassian.net/browse/POS-979 is solved"

# Docker build context for heimdall. Used in docker setup. When specified, heimdallBranch will be ignored.
heimdallDockerBuildContext: 'https://github.com/shibaone/heimdall.git#v1.0.7-bone-candidate'

# Datadog api key required to setup datadog traces and metrics for the node.
DD_API_KEY: <DATADOG API KEY> # Datadog API key
```
