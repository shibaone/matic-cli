import { Listr } from 'listr2'
import chalk from 'chalk'
import path from 'path'
import execa from 'execa'
import fs from 'fs-extra'

import { loadConfig } from '../config.js'
import {
  processTemplateFiles,
  createAccountsFromMnemonics
} from '../../lib/utils.js'
import { getDefaultBranch } from '../helper.js'
import { Contracts } from '../contracts/index.js'
import { getRemoteStdio } from '../../express/common/remote-worker.js'

export class Anvil {
  constructor(config, options = {}) {
    this.config = config
    this.mnemonic = config.mnemonic
    this.deployerAccount = createAccountsFromMnemonics(this.mnemonic, 1)
    this.deployerPrivateKey = this.deployerAccount[0].privateKey

    this.dbName = options.dbName || 'anvil-db'
    this.serverPort = options.serverPort || 9545

    // Contracts setup
    this.contracts = new Contracts(config, {
      repositoryBranch: options.contractsBranch
    })
  }

  get name() {
    return 'anvil'
  }

  get taskTitle() {
    return 'Setup contracts on Anvil'
  }

  get dbDir() {
    return path.join(this.config.dataDir, this.dbName)
  }

  async print() {
    console.log(
      chalk.gray('Anvil db path') + ': ' + chalk.bold.green(this.dbDir)
    )
  }

  async getStakeTasks() {
    return new Listr(
      [
        {
          title: 'Stake',
          task: () =>
            execa('bash', ['anvil-stake.sh'], {
              cwd: this.config.targetDirectory,
              stdio: getRemoteStdio(),
              env: {
                ...process.env,

                PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH}`
              }
            })
        }
      ],
      { exitOnError: true }
    )
  }

  async getContractDeploymentTasks() {
    let server = null

    return new Listr(
      [
        {
          title: 'Reset Anvil',
          task: () => fs.remove(this.dbDir)
        },
        {
          title: 'Start Anvil',
          task: () => {
            server = execa(
              'anvil',
              [
                '--port',
                `${this.serverPort}`,
                '--balance',
                '1000000000000000',
                '--gas-limit',
                '1000000000000',
                '--gas-price',
                '1',
                '--accounts',
                '10',
                '--mnemonic',
                `${this.mnemonic}`,
                '--code-size-limit',
                '10000000000',
                '--verbosity',
                '--state',
                `${this.dbDir}`
              ],
              {
                stdio: 'inherit',
                env: {
                  ...process.env,
                  PATH: `${process.env.HOME}/.foundry/bin:${process.env.PATH}`
                }
              }
            )
          }
        },
        {
          title: 'Deploy dependencies',
          task: () =>
            execa('bash', ['anvil-deploy-dependencies.sh'], {
              cwd: this.config.targetDirectory,
              stdio: getRemoteStdio()
            })
        },
        {
          title: 'Deploy contracts on Main chain',
          task: () =>
            execa('bash', ['anvil-deployment.sh'], {
              cwd: this.config.targetDirectory,
              stdio: getRemoteStdio()
            })
        },
        {
          title: 'Setup validators',
          task: () => this.getStakeTasks()
        },
        {
          title: 'Stop Anvil',
          task: () => server?.kill('SIGINT')
        }
      ],
      { exitOnError: true }
    )
  }

  async getTasks() {
    return new Listr(
      [
        ...this.contracts.cloneRepositoryTasks(),
        ...this.contracts.compileTasks(),
        {
          title: 'Process scripts',
          task: async () => {
            const templateDir = path.resolve(
              new URL(import.meta.url).pathname,
              '../templates'
            )

            await fs.copy(templateDir, this.config.targetDirectory)
            await processTemplateFiles(this.config.targetDirectory, {
              obj: this
            })
          }
        },
        {
          title: 'Deploy contracts Anvil.....',
          task: () => this.getContractDeploymentTasks()
        },
        ...this.contracts.prepareContractAddressesTasks()
      ],
      { exitOnError: true }
    )
  }
}

async function setupAnvil(config) {
  const anvil = new Anvil(config, {
    contractsBranch: config.contractsBranch
  })

  const tasks = await anvil.getTasks()
  await tasks.run()

  console.log('%s Anvil snapshot is ready', chalk.green.bold('DONE'))

  await config.print()
  await anvil.print()
}

export default async function (command) {
  const config = await loadConfig({
    targetDirectory: command.parent.directory,
    fileName: command.parent.config,
    interactive: command.parent.interactive
  })

  await config.loadChainIds()
  await config.loadAccounts()

  const answers = await getDefaultBranch(config)
  config.set(answers)

  await setupAnvil(config)
}
