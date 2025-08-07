// noinspection JSCheckFunctionSignatures,JSUnresolvedFunction,JSUnresolvedVariable

import { loadDevnetConfig } from '../common/config-utils.js'
import { timer } from '../common/time-utils.js'

import fetch from 'node-fetch'
import Web3 from 'web3'
import dotenv from 'dotenv'
import fs from 'fs-extra'

import { runScpCommand, maxRetries } from '../common/remote-worker.js'

const lastStateIdABI = [
  {
    constant: true,
    inputs: [],
    name: 'lastStateId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]

const currentHeaderBlockABI = [
  {
    constant: true,
    inputs: [],
    name: 'currentHeaderBlock',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]

const stateReceiverAddress = '0x0000000000000000000000000000000000001001'

async function checkCheckpoint(ip) {
  const url = `http://${ip}:1317/checkpoints/count`
  const response = await fetch(url)
  const responseJson = await response.json()
  if (responseJson.result) {
    if (responseJson.result.result) {
      return responseJson.result.result
    }
  }

  return 0
}

export async function checkLatestMilestone(ip) {
  const url = `http://${ip}:1317/milestone/latest`
  const response = await fetch(url)
  return await response.json()
}

async function checkStateSyncTx(ip, id) {
  const url = `http://${ip}:1317/clerk/event-record/${id}`
  const response = await fetch(url)
  const responseJson = await response.json()
  if (responseJson.error) {
    return undefined
  } else {
    if (responseJson.result) {
      return responseJson.result
    }
  }

  return undefined
}

async function getStateSyncTxList(ip, startTime, endTime) {
  const url = `http://${ip}:1317/clerk/event-record/list?from-time=${startTime}&to-time=${endTime}&page=1&limit=200`
  const response = await fetch(url)
  const responseJson = await response.json()
  if (responseJson.error) {
    return undefined
  } else {
    if (responseJson.result) {
      return responseJson.result
    }
  }

  return undefined
}

async function lastStateIdFromBor(ip) {
  const web3 = new Web3(`http://${ip}:8545`)

  const StateReceiverContract = new web3.eth.Contract(
    lastStateIdABI,
    stateReceiverAddress
  )
  return await StateReceiverContract.methods.lastStateId().call()
}

async function getLatestCheckpointFromRootChain(ip, rootChainProxyAddress) {
  const web3 = new Web3(`http://${ip}:9545`)

  const RootChainContract = new web3.eth.Contract(
    currentHeaderBlockABI,
    rootChainProxyAddress
  )
  const currentHeaderBlock = await RootChainContract.methods
    .currentHeaderBlock()
    .call()
  return currentHeaderBlock.toString().slice(0, -4)
}

export async function monitor(exitWhenDone) {
  dotenv.config({ path: `${process.cwd()}/.env` })
  const devnetType =
    process.env.TF_VAR_DOCKERIZED === 'yes' ? 'docker' : 'remote'

  const doc = await loadDevnetConfig(devnetType)
  let machine0
  if (doc.numOfBorValidators > 0) {
    machine0 = doc.devnetBorHosts[0]
    console.log('📍Monitoring the first node', doc.devnetBorHosts[0])
  } else if (devnetType === 'remote') {
    machine0 = doc.devnetErigonHosts[0]
    console.log('📍Monitoring the first node', doc.devnetErigonHosts[0])
  } else {
    console.log('📍No nodes to monitor, please check your configs! Exiting...')
    process.exit(1)
  }

  console.log('📍Checking for StateSyncs && Checkpoints')

  const src = `${doc.ethHostUser}@${machine0}:~/matic-cli/devnet/code/pos-contracts/contractAddresses.json`
  const dest = './contractAddresses.json'
  await runScpCommand(src, dest, maxRetries)

  const contractAddresses = JSON.parse(
    fs.readFileSync(`${process.cwd()}/contractAddresses.json`, 'utf8')
  )

  const rootChainProxyAddress = contractAddresses.root.RootChainProxy

  // noinspection InfiniteLoopJS
  while (true) {
    await timer(5000)
    console.log()

    const checkpointCount = await checkCheckpoint(machine0)
    if (checkpointCount > 0) {
      console.log('📍Checkpoint found on Heimdall ✅; Count:', checkpointCount)
    } else {
      console.log('📍Awaiting Checkpoint on Heimdall 🚌')
    }

    const checkpointCountFromRootChain = await getLatestCheckpointFromRootChain(
      machine0,
      rootChainProxyAddress
    )
    if (checkpointCountFromRootChain > 0) {
      console.log(
        '📍Checkpoint found on Root chain ✅; Count:',
        checkpointCountFromRootChain
      )
    } else {
      console.log('📍Awaiting Checkpoint on Root chain 🚌')
    }

    const firstStateSyncTx = await checkStateSyncTx(machine0, 1)
    let stateSyncTxList
    let lastStateSyncTxID
    if (firstStateSyncTx) {
      const timeOfFirstStateSyncTx = firstStateSyncTx.record_time
      const firstEpochTime = parseInt(
        new Date(timeOfFirstStateSyncTx).getTime() / 1000
      )
      const currentEpochTime = parseInt(new Date().getTime() / 1000)
      stateSyncTxList = await getStateSyncTxList(
        machine0,
        firstEpochTime,
        currentEpochTime
      )
      if (stateSyncTxList) {
        lastStateSyncTxID = stateSyncTxList.length
        const lastStateSyncTxHash =
          stateSyncTxList[lastStateSyncTxID - 1].tx_hash
        console.log(
          '📍StateSyncs found on Heimdall ✅; Count:',
          lastStateSyncTxID,
          '; Last Tx Hash:',
          lastStateSyncTxHash
        )
      }
    } else {
      console.log('📍Awaiting StateSync 🚌')
    }

    const lastStateIDFromBor = await lastStateIdFromBor(machine0)
    if (lastStateIDFromBor) {
      console.log('📍LastStateId on Bor:', lastStateIDFromBor)
    } else {
      console.log('📍Unable to fetch LastStateId')
    }

    if (
      exitWhenDone === true &&
      checkpointCount > 0 &&
      checkpointCountFromRootChain > 0 &&
      lastStateSyncTxID > 0 &&
      lastStateIDFromBor > 0
    ) {
      console.log('📍All checks executed successfully')
      process.exit(0)
    }
  }
}
