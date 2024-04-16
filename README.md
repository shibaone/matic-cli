# Testing Toolkit

🏗 A set of CLIs, tools and tests to set up, manage and operate Polygon devnets.

The **Testing Toolkit** is built on top of `express-cli`, an extension of `matic-cli` which uses `terraform` to deploy,
test and monitor any devnet on AWS stacks from any local system.

It currently supports **only** devnets running `v0.3.x` stacks.

The `express-cli` interacts with `terraform` to create a fully working setup on AWS.
This setup is composed by a set of `EC2 VM` instances running a specific `ubuntu 22.04 ami`, mounted with `gp3 disks` ,
and a `public-subnet` with its `VPC`.
In case the infrastructure already exists, `matic-cli` can be used as a standalone tool to deploy Polygon stacks on
pre-configured VMs.

Please, refer to the section of this file you are more interested in (`express-cli` or `matic-cli`)

## Table of contents

- [`express-cli`](#express-cli)
- [`matic-cli`](#matic-cli)

## `express-cli`

### Requirements

To use the `express-cli` you have to execute the following steps.

- [install aws cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) or [install gcloud tool](https://cloud.google.com/sdk/docs/install)
- [install terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli) on your local machine
- use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to switch to the proper `node` version, `v16.17.1`,
  by running `nvm use` from the root folder
- install `express-cli` and `matic-cli` locally with command `npm i`
- generate a keypair on AWS EC2 (in the same region being used, currently `eu-west-1` by default and download its certificate locally (`.pem` file). If you are on GCP, you can use your existing keypair or use `ssh-keygen` to generate. Check the [GCP guide](./docs/gcp_dev_guide.md).
- copy `secret.tfvars.example` to `secret.tfvar` with command `cp secret.tfvars.example secret.tfvars` and check the commented file for details
- **If you are a Polygon employee**, connect to the company VPN
- modify `secret.tfvar` with addresses of the allowed IPs (as specified in `secret.tfvars.example` file)
- copy `.env.example` to `.env` with command `cp .env.example .env` and check the heavily commented file for details. If you're using GCP, you can ignore AWS specific terraform variables and vice versa.
- make sure `PEM_FILE_PATH` points to a correct AWS key certificate, the one you downloaded in the previous steps
- define the number of nodes (`TF_VAR_VALIDATOR_COUNT` and `TF_VAR_SENTRY_COUNT`) and adjust the `DEVNET_BOR_USERS`
  accordingly
- use `TF_VAR_DOCKERZIED=no` to have one VM per node, otherwise the stack will run on one VM only in a dockerized environment
- (optional) replace `TF_VAR_VM_NAME` with your own identifier (it can be any string, default is "polygon-user")
- (optional) replace `TF_VAR_DISK_SIZE_GB` with your preferred disk size in GB (default is 100 GB)
- `VERBOSE=true` prints logs from the remote machines. If set to `false`, only `express-cli` and `matic-cli` logs will
  be shown
- **If you are a Polygon employee**, please refer to [this page](https://www.notion.so/polygontechnology/Testing-Toolkit-d47e098641d14c80b2e9a90b3b1b88d9) for more info

In case you plan to utilize express-cli for Google Cloud, you will need to make few modifications like SSH keys. It's important to note that express-cli is not fully tested yet on GCP, and not all features are accessible. Check the [GCP dev guide](./docs/gcp_dev_guide.md).

### Auth Configuration

As a prerequisite, you need to configure authentication on `aws`
This will create the folder `~/.aws` in your system
To do so, please run

```bash
aws configure sso
```

This command will interactively ask for some configs
**If you are a Polygon employee**, please use the following

- SSO session name: leave empty
- SSO start URL: https://polygon-technology.awsapps.com/start#/
- SSO region: us-east-1

The browser will open and authorize your request. Please allow it.

In case there are multiple accounts available to you, please select

> posv1-devnet

Then, the command will ask for other configs, please use

- CLI default client Region: eu-west-1
- CLI default output format: json
- CLI profile name: default

Note that it's **mandatory** to use `CLI profile name: default`, as used by `terraform` in `express-cli` (for more context see [this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs))

Here an output example

```bash
SSO session name (Recommended):
WARNING: Configuring using legacy format (e.g. without an SSO session).
Consider re-running "configure sso" command and providing a session name.
SSO start URL [None]: https://polygon-technology.awsapps.com/start#/
SSO region [None]: us-east-1
Attempting to automatically open the SSO authorization page in your default browser.
If the browser does not open or you wish to use a different device to authorize this request, open the following URL:

https://device.sso.us-east-1.amazonaws.com/

Then enter the code:

<CODE-HERE>

There are 2 AWS accounts available to you.

Using the account ID <ACCOUNT_ID>
The only role available to you is: <AWSRole> (<AWS_ROLE_ID>)
Using the role name "<AWS_ROLE>"
CLI default client Region [None]: eu-west-1
CLI default output format [None]: json
CLI profile name [<PROFILE_NAME_AND_ID>]: default

To use this profile, specify the profile name using --profile, as shown:

aws s3 ls --profile default
```

Now you can log into aws by running the following command. It needs to be executed every time the token expires.

```bash
aws sso login
```

Congrats! You're all set to use `express-cli` commands.

If you are using Google cloud platform, you need to configure authentication on `gcloud`.

If you have downloaded the service account credentials, you can use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to provide the location of that credential JSON file.

```bash
gcloud auth application-default login

# OR

export GOOGLE_APPLICATION_CREDENTIALS='/absolute/path/to/sa/creds.json'
```

### Commands

Instructions to run `express-cli`.
For the list of commands, please run `express-cli --help`
First off, you need to `--init` terraform on your local machine, by executing the following command.

- `./bin/express-cli.js --init <aws|gcp>`

  - Initializes a new devnet folder with terraform and creates some git-ignored files locally. This step is mandatory
    before running any other command. The new devnet folder created will be `devnet-<id>` where `id` is a monotonically
    increasing count for the devnets. Once created, you can `cd deployments/devnet-<id>` and run the other commands.
    This allows you to work with multiple devnets at once.
    Then, a remote devnet can be created with the `--start` command, as follows.
  - You should specify the cloud provider. Currently the supported values are `aws` and `gcp`.

- `../../bin/express-cli.js --start`

  - Creates the desired remote setup, based on the preferences defined in the `.env.devnet<id>` file
  - `--start` command can be used also to target an existing AWS setup. If changes to `.env.devnet<id>` file are detected, the
    previous devnet will be destroyed and a new one created, reusing the same AWS VMs
    To destroy the remote devnet, you can execute the `--destroy` command.

- `../../bin/express-cli.js --destroy`

  - Destroys the remote setup and delete the dedicated VMs

The `express-cli` also comes with additional utility commands, listed below. Some of them are only available for non-dockerized devnets.

- `../../bin/express-cli.js --update-all [index]`

  - Fetches `heimdall`,`bor` and `erigon` branches defined as `HEIMDALL_BRANCH`, `BOR_BRANCH` and `ERIGON_BRANCH` in `.env. devnet<id>` file, pulls relative changes and restarts those services on the remote machines. If an integer `index` is used, the job will be performed only on the VM corresponding to that index. For example if the devnet consists of 2 bor and erigon nodes, then the indices for bor machines would be 0 and 1 and for erigon it'll be 2 and 3.

- `../../bin/express-cli.js --update-bor [index]`

  - Fetches `bor` branch defined as `BOR_BRANCH` in `.env.devnet<id>` file, pulls relative changes and restarts it on
    the remote machines. If an integer `index` is used, the job will be performed only on the VM corresponding to that index.

- `../../bin/express-cli.js --update-erigon [index]`

  - Fetches `erigon` branch defined as `ERIGON_BRANCH` in `.env.devnet<id>` file, pulls relative changes and restarts it on
    the remote machines. If an integer `index` is used, the job will be performed only on the VM corresponding to that index. For example if the devnet consists of 2 bor and erigon nodes and you wanted to target the first erigon node, `index` will be 2.

- `../../bin/express-cli.js --update-heimdall [index]`

  - Fetches `heimdall` branch defined as `HEIMDALL_BRANCH` in `.env.devnet<id>` file, pulls relative changes and restarts it on
    the remote machines. If an integer `index` is used, the job will be performed only on the VM corresponding to that
    index. For example if the devnet consists of 2 bor and erigon nodes, then the indices for bor machines would be 0 and 1 and for erigon it'll be 2 and 3.

- `../../bin/express-cli.js --restart-all [index]`

  - Restarts `bor`, `erigon` and `heimdall` on all the remote machines. If an integer `index` is used, the job will be performed
    only on the VM corresponding to that index. For example if the devnet consists of 2 bor and erigon nodes, then the indices for bor machines would be 0 and 1 and for erigon it'll be 2 and 3.

- `../../bin/express-cli.js --restart-bor [index]`

  - Restarts `bor` on all the remote machines. If an integer `index` is used, the job will be performed only on the VM
    corresponding to that index.

- `../../bin/express-cli.js --restart-erigon [index]`

  - Restarts `erigon` on all the remote machines. If an integer `index` is used, the job will be performed only on the VM
    corresponding to that index. For example if the devnet consists of 2 bor and erigon nodes and you wanted to target the first erigon node, `index` will be 2.

- `../../bin/express-cli.js --restart-heimdall [index]`

  - Restarts `heimdall` on all the remote machines. If an integer `index` is used, the job will be performed only on
    the VM corresponding to that index. For example if the devnet consists of 2 bor and erigon nodes, then the indices for bor machines would be 0 and 1 and for erigon it'll be 2 and 3.

- `../../bin/express-cli.js --cleanup`

  - Cleans up `ganache`, `bor`, `heimdall` and `bridge`, redeploys all the contracts and restarts all the services
    The `express-cli` also provides additional testing commands, listed here.

- `../../bin/express-cli.js --send-state-sync`

  - Create a `state-sync` transaction on the remote network

- `../../bin/express-cli.js --send-staked-event [validatorID]`

  - Create a `Staked` transaction on the remote network and adds a new validator.

- `../../bin/express-cli.js --send-stakeupdate-event [validatorID]`

  - Create a `StakeUpdate` transaction on the remote network and increase stake of 1st validator by 100 MATIC.

- `../../bin/express-cli.js --send-signerchange-event [validatorID]`

  - Create a `SignerChange` transaction on the remote network and changes the signer of the 1st validator.

- `../../bin/express-cli.js --send-topupfee-event [validatorID]`

  - Create a `TopUpFee` transaction on the remote network and adds balance/heimdallFee for the first validator on Heimdall.

- `../../bin/express-cli.js --send-unstakeinit-event [validatorID]`

  - Create a `UnstakeInit` transaction on the remote network and removes the validator from validator-set. `validatorID` can be used to specify the validator to be removed. If not specified, the first validator will be removed.

- ` ../../bin/express-cli.js --monitor [exit]`

  - Monitors the reception of state-syncs and checkpoints to make sure the whole network is in a healthy state.
    If `--send-state-sync` hasn't been used before, only checkpoints will be detected. Monitor the setup.
    If `exit` string is passed the process terminates when at least one `stateSync` and one `checkpoint` are detected.

- ` ../../bin/express-cli.js --instances-stop`

  - Stop the cloud VM instances associated with the deployed devnet.

- ` ../../bin/express-cli.js --instances-start`

  - Start the (previously stopped) VM instances associated with the deployed devnet. Also, it starts all services, such as ganache, heimdall, and bor

- `../../bin/express-cli.js --stress [fund]`

  - Runs the stress tests on remote nodes. The string `fund` is needed when stress tests are ran for the first time,
    to fund the accounts

- `../../bin/express-cli.js --setup-datadog`

  - Sets up datadog on the nodes and gets them ready to send metrics to Datadog Dashboard. `DD_API_KEY` env var is required for this.

- `../../bin/express-cli.js --setup-ethstats`

  - Sets up ethstats on the nodes and gets them ready to send metrics to Ethstats Backend which can be queried from Hasura Console and displayed on Reorgs Frontend.

- `../../bin/express-cli.js --chaos [intensity]`

  - Adds dedicated chaos(de-peering) to the network. The `intensity` parameter is optional and can be set from `1` to `10`. If not set, `5` is used.

- `../../bin/express-cli.js --rewind [numberOfBlocks]`

  - Rewinds the chain by a defined number of blocks (not greater than `128`). Default `numberOfBlocks` value is `100`.

- `../../bin/express-cli.js --eip-1559-test [index]`

  - Executes a test to send EIP 1559 tx. In case of a non-dockerized devnet, if an integer [index] is specified, it will use
    that VM to send the tx. Otherwise, it will target the first VM.

- `../../bin/express-cli.js --ssh-key-add`

  - Generates an additional ssh key-pair remotely and stores it locally in the devnet folder. The public key is added to the ssh authorized keys of the devnet's machines. The key can be shared - on a secure channel! - with other devs to grant them access to the remote devnet.

- `../../bin/express-cli.js --ssh-key-des [keyName]`

  - Destroys an ssh key-pair given its `keyName`. The key gets deleted remotely from `aws` or `gcp`, cancelled from the authorized ssh keys of the devnet's machines and removed from local devnet folder.

- `../../bin/express-cli.js --reorg-start [split]`

  - Reorg the chain by creating two clusters in the network, where [split] param represents the number of nodes that one of the clusters will have (with other being [total number of nodes - split])

- `../../bin/express-cli.js --reorg-stop`

  - Stops the reorg previously created by reconnecting all the nodes

- `../../bin/express-cli.js --shadow-fork [blockNumber]`

  - Run (mumbai/mainnet) nodes in shadow mode. Please note that there might be an offset of ~3-4 blocks from [block] number
    specified when restarting the (shadow) node. Currently only works with remote setup (no docker support).

- `../../bin/express-cli.js --rpc-test`

  - Executes RPC methods against the provided test data and verifies the response data's compatibility and correctness.
    Since the `tests/rpc-tests/RPC-testdata` is a [submodule](https://github.com/maticnetwork/RPC-testdata) , do the following
    to initialize and fetch the testdata:

    ```bash
    git submodule init
    git submodule update
    ```

- `../../bin/express-cli.js --relay`

  - Relay transactions from testnet or mainnet to shadow node running in the devnet.

- `../../bin/express-cli.js --fund-ganache-accounts`
  - Transfers 10 eth to all the ganache accounts.

## `Milestone tests`

The `express-cli` can also be used to perform few simulation based tests for the upcoming milestone feature. Please refer to the steps and requirements mentioned over [here](./docs/milestones.md) for running the tests.

## `matic-cli`

`matic-cli` has to be installed on a `ubuntu` VM (_host_) and - through a config file - it will point to
other VMs' IPs (_remotes_).

- Host machine will run a Polygon node (`bor` and `heimdall`) and a layer 1 node (`ganache`)
- Remote machines will only run a Polygon node each

### Requirements

Please, make sure to install the following software/packages on the VMs.

- Build Essentials (_host_ and _remotes_)

  ```bash
  sudo apt update --yes && sudo apt install --yes build-essential
  ```

- Go 1.18+ (_host_ and _remotes_)

  ```bash
  wget https://raw.githubusercontent.com/maticnetwork/node-ansible/master/go-install.sh \
    && bash go-install.sh --remove \
    && bash go-install.sh
  ```

- Rabbitmq (_host_ and _remotes_)

  ```bash
  sudo apt install --yes rabbitmq-server
  ```

- Docker (_host_ and _remotes_, only needed in case of a docker setup)

  - https://docs.docker.com/engine/install/ubuntu/
  - https://docs.docker.com/engine/install/linux-postinstall/)

- Node v16.17.1 (only _host_)

  ```bash
  curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash \
    && source /home/ubuntu/.bashrc \
    && nvm install 20.12.0 \
    && node --version
  ```

- Npm (only _host_)

  ```bash
  sudo apt update --yes && sudo apt install --yes npm
  ```

- Python 2 (only _host_)

  ```bash
  sudo apt install python2 --yes && alias python="/usr/bin/python2"
  ```

- Solc v0.5.16 (only _host_)

  ```bash
  sudo snap install solc
  ```

- Ganache CLI (only _host_)

  ```bash
  npm install --global ganache
  ```

### Usage

On the _host_ machine, please run

```bash
cd \
  && git clone https://github.com/shibaone/matic-cli.git \
  && cd matic-cli \
  && npm install
```

#### Local dockerized network

Adjust the [docker configs](configs/devnet/docker-setup-config.yaml) and run

```bash
mkdir devnet \
  && cd devnet \
  && ../bin/matic-cli.js setup devnet --config ../configs/devnet/docker-setup-config.yaml | tee setup.log
...
DONE Devnet is ready
```

Once the setup is done, follow these steps for local docker deployment

- Start ganache

  ```bash
  bash docker-ganache-start.sh
  ```

- Start `heimdall` instances (it will run all services - rabbitmq, heimdall, bridge, server)

  ```bash
  bash docker-heimdall-start-all.sh
  ```

- Setup `bor`

  ```bash
  bash docker-bor-setup.sh
  ```

- Start bor

  ```bash
  bash docker-bor-start-all.sh
  ```

- Deploy contracts on Child chain

  ```bash
  bash ganache-deployment-bor.sh
  ```

- Sync contract addresses to Main chain
  ```bash
  bash ganache-deployment-sync.sh
  ```

Logs will be stored under `logs/` folder

Note: in case of docker setup, we have provided [some additional scripts](src/setup/devnet/templates/docker/README.md) which might be helpful.

#### Remote network

Adjust the [remote configs](configs/devnet/remote-setup-config.yaml) and run

```bash
../bin/matic-cli.js setup devnet --config ../configs/devnet/remote-setup-config.yaml
```

Alternatively, this step can be executed interactively with

```bash
../bin/matic-cli.js setup devnet --interactive
```

Once the setup is done, follow these steps for remote deployment
In this case, the stack is already running, you would just need to deploy/sync some contracts, as follows:

- Move to devnet folder
  ```bash
  cd matic-cli/devnet
  ```
- Deploy contracts on Child chain

  ```bash
  bash ganache-deployment-bor.sh
  ```

- Sync contract addresses to Main chain
  ```bash
  bash ganache-deployment-sync.sh
  ```

#### Clean setup

Stop al services, remove the `matic-cli/devnet` folder, and you can start the process once again

#### Notes

1. The ganache URL hostname will be used for ganache `http://<host-machine-ip>:9545`
2. Make sure that the _host_ machine has access to remote machines for transferring the data
   To persist ssh key for remote access, please run:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add `<.pem file>`
   ```
3. We have provided the default config values [here](configs/devnet) to ensure smooth functioning of the process
   Please check the relative [README](configs/README.md) for more accurate description of such configs
   These files are used as templates and dynamically modified by `express-cli`, hence they should not be deleted nor any modification remotely pushed
   Therefore, they are under `.gitignore`, and in case you do not want those changes to be reflected in your local `git`,
   you can use the commands

```bash
git update-index --assume-unchanged configs/devnet/remote-setup-config.yaml
git update-index --assume-unchanged configs/devnet/docker-setup-config.yaml
```

to undo, please use

```bash
  git update-index --no-assume-unchanged configs/devnet/remote-setup-config.yaml
  git update-index --no-assume-unchanged configs/devnet/docker-setup-config.yaml
```

## License

MIT
