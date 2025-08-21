import { loadDevnetConfig } from '../common/config-utils.js'
import Web3 from 'web3'
import { getSignedTx } from '../common/tx-utils.js'
import { timer } from '../common/time-utils.js'
import { checkValidatorsLength } from './send-staked-event.js'
import { isValidatorIdCorrect } from '../common/validators-utils.js'

import { runScpCommand, maxRetries } from '../common/remote-worker.js'

import dotenv from 'dotenv'
import fs from 'fs-extra'

import stakeManagerABI from '../../abi/StakeManagerABI.json' assert { type: 'json' }

export async function sendUnstakeInitEvent(validatorID) {
  dotenv.config({ path: `${process.cwd()}/.env` })
  const devnetType =
    process.env.TF_VAR_DOCKERIZED === 'yes' ? 'docker' : 'remote'

  const doc = await loadDevnetConfig(devnetType)
  let machine0

  if (
    !isValidatorIdCorrect(
      validatorID,
      doc.numOfBorValidators + doc.numOfErigonValidators
    )
  ) {
    console.log(
      '📍Invalid validatorID used, please try with a valid argument! Exiting...'
    )
    process.exit(1)
  }
  if (doc.numOfBorValidators > 0) {
    machine0 = doc.devnetBorHosts[0]
    console.log('📍Monitoring the first node', doc.devnetBorHosts[0])
    console.log('📍Unstaking Validator : ', validatorID)
  } else if (devnetType === 'remote') {
    machine0 = doc.devnetErigonHosts[0]
    console.log('📍Monitoring the first node', doc.devnetErigonHosts[0])
    console.log('📍Unstaking Validator : ', validatorID)
  } else {
    console.log('📍No nodes to monitor, please check your configs! Exiting...')
    process.exit(1)
  }

  validatorID = Number(validatorID)
  const rootChainWeb3 = new Web3(`http://${machine0}:9545`)

  let src = `${doc.ethHostUser}@${machine0}:~/matic-cli/devnet/devnet/signer-dump.json`
  let dest = './signer-dump.json'
  await runScpCommand(src, dest, maxRetries)

  src = `${doc.ethHostUser}@${machine0}:~/matic-cli/devnet/code/contracts/contractAddresses.json`
  dest = './contractAddresses.json'
  await runScpCommand(src, dest, maxRetries)

  const contractAddresses = JSON.parse(
    fs.readFileSync(`${process.cwd()}/contractAddresses.json`, 'utf8')
  )

  const StakeManagerProxyAddress = contractAddresses.root.StakeManagerProxy

  const signerDump = JSON.parse(
    fs.readFileSync(`${process.cwd()}/signer-dump.json`, 'utf8')
  )
  const pkey = signerDump[validatorID - 1].priv_key
  const validatorAccount = signerDump[validatorID - 1].address
  const validatorIDForTest = validatorID.toString()

  const stakeManagerContract = new rootChainWeb3.eth.Contract(
    stakeManagerABI,
    StakeManagerProxyAddress
  )

  const tx = stakeManagerContract.methods.unstake(validatorIDForTest)
  const signedTx = await getSignedTx(
    rootChainWeb3,
    StakeManagerProxyAddress,
    tx,
    validatorAccount,
    pkey
  )

  const oldValidatorsCount = await checkValidatorsLength(doc, machine0)
  console.log('oldValidatorsCount : ', oldValidatorsCount)

  const Receipt = await rootChainWeb3.eth.sendSignedTransaction(
    signedTx.rawTransaction
  )
  console.log('Unstake Receipt', Receipt.transactionHash)

  let newValidatorsCount = await checkValidatorsLength(doc, machine0)

  while (parseInt(newValidatorsCount) !== parseInt(oldValidatorsCount) - 1) {
    console.log('Waiting 3 secs for validator to be removed')
    await timer(3000) // waiting 3 secs
    newValidatorsCount = await checkValidatorsLength(doc, machine0)
    console.log('newValidatorsCount : ', newValidatorsCount)
  }

  console.log('✅ Validator Unstake Done')
  console.log(
    '✅ UnstakeInit Event Sent from Rootchain and Received and processed on Heimdall'
  )
}
