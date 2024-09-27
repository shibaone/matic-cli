// noinspection JSUnresolvedFunction

import path from 'path'
import execa from 'execa'
import fs from 'fs-extra'

import { cloneRepository } from '../../lib/utils.js'
import { getRemoteStdio } from '../../express/common/remote-worker.js'

export class Contracts {
  constructor(config, options = {}) {
    this.config = config

    this.repositoryName = 'contracts'
    this.repositoryUrl =
      options.repositoryUrl || 'https://github.com/shibaone/contracts'
    this.repositoryBranch = options.repositoryBranch || 'master'
  }

  get name() {
    return this.repositoryName
  }

  get repositoryDir() {
    return path.join(this.config.codeDir, this.repositoryName)
  }

  get localContractAddressesPath() {
    return path.join(this.repositoryDir, 'contractAddresses.json')
  }

  get contractAddressesPath() {
    return path.join(this.config.configDir, 'contractAddresses.json')
  }

  get contractAddresses() {
    const data = fs.readFileSync(this.contractAddressesPath, 'utf8')
    return JSON.parse(data)
  }

  print() {}

  cloneRepositoryTasks() {
    return [
      {
        title: 'Clone matic contracts repository',
        task: () =>
          cloneRepository(
            this.repositoryName,
            this.repositoryBranch,
            this.repositoryUrl,
            this.config.codeDir
          )
      }
    ]
  }

  compileTasks() {
    return [
      {
        title: 'Install dependencies for matic contracts',
        task: () =>
          execa('npm', ['install', '--omit=dev'], {
            cwd: this.repositoryDir,
            stdio: getRemoteStdio()
          })
      },
      {
        title: 'Process templates',
        task: () =>
          execa(
            'npm',
            [
              'run',
              'template:process',
              '--',
              '--bor-chain-id',
              this.config.borChainId
            ],
            {
              cwd: this.repositoryDir,
              stdio: getRemoteStdio()
            }
          )
      },
      {
        title: 'Compile matic contracts',
        task: () =>
          execa('npm', ['run', 'truffle:compile'], {
            cwd: this.repositoryDir,
            stdio: getRemoteStdio()
          })
      }
    ]
  }

  prepareContractAddressesTasks() {
    return [
      {
        title: 'Prepare contract addresses',
        task: async () => {
          // copy local contract address json file to config folder
          if (fs.existsSync(this.localContractAddressesPath)) {
            await execa(
              'cp',
              [this.localContractAddressesPath, this.contractAddressesPath],
              { stdio: getRemoteStdio() }
            )
          }
        }
      },
      {
        title: 'Load contract addresses',
        task: () => {
          this.config.contractAddresses = this.contractAddresses
        }
      }
    ]
  }
}
