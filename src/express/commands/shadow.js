import Web3 from 'web3'
import { loadDevnetConfig, splitToArray } from '../common/config-utils'
import { maxRetries, runSshCommand } from '../common/remote-worker'
import { stopServices } from './cleanup'
const fs = require('fs')

async function initWeb3(provider) {
  return new Web3(provider)
}

function isValidBlockNum(targetBlock) {
  return (
    targetBlock !== undefined &&
    targetBlock !== null &&
    targetBlock !== '' &&
    parseInt(targetBlock, 10) > 0
  )
}

export async function shadow(targetBlock) {
  if (!isValidBlockNum(targetBlock)) {
    console.log('❌ Invalid [blockNumber] parameter! Exiting ...')
    process.exit(1)
  }
  require('dotenv').config({ path: `${process.cwd()}/.env` })
  const doc = await loadDevnetConfig('remote')
  const borUsers = splitToArray(doc.devnetBorUsers.toString())
  const providerToNodeIp = new Map()
  let ip
  let shadowBorChainId
  let latestBlock
  let provider
  const providers = []

  for (let i = 0; i < doc.devnetBorHosts.length; i++) {
    ip = `${borUsers[i]}@${doc.devnetBorHosts[i]}`
    provider = await initWeb3(`ws://${doc.devnetBorHosts[i]}:8546`)
    latestBlock = await provider.eth.getBlock('latest')
    if (latestBlock.number > targetBlock) {
      console.log(
        `📍Latest block already past ${targetBlock} on machine ${ip}! Skipping machine ...`
      )
      continue
    }
    providers.push(provider)
    providerToNodeIp.set(provider, ip)
  }

  if (providers.length === 0) {
    console.log('❌ All the machines are past the target block! Exiting ...')
    process.exit(1)
  }
  const shadowGenesisLocation = '~/.bor/shadow-genesis.json'
  const startScriptLocation = '~/node/bor-start.sh'
  const launchFolder =
    process.env.NETWORK === 'mainnet' ? 'mainnet-v1' : 'testnet-v4'
  const genesisCmd = `curl -o ${shadowGenesisLocation} https://raw.githubusercontent.com/maticnetwork/launch/master/${launchFolder}/sentry/validator/bor/genesis.json`

  shadowBorChainId = process.env.SHADOW_CHAIN_ID
  if (!shadowBorChainId) {
    shadowBorChainId = Math.floor(Math.random() * 10000 + 1000)
  }

  // eslint-disable-next-line
  const updateGenesisChainIdCmd = `sed -i '/\"chainId\"/c\   \   "chainId\": ${shadowBorChainId},' ${shadowGenesisLocation}`
  // eslint-disable-next-line
  const updateBorStartScriptCmd = `sed -i "s|${process.env.NETWORK}|\\$BOR_HOME/shadow-genesis.json|g" ${startScriptLocation}`
  // eslint-disable-next-line
  const addFlagsCmd = `sed -i 's/--mine$/--mine \\\\\\\n  --bor.withoutheimdall \\\\\\\n  --bor.devfakeauthor \\\\\\\n  --rpc.allow-unprotected-txs \\\\/' ${startScriptLocation}`
  const restartBorCmd = 'sudo service bor restart'

  const shadowTasks = providers.map(async (p) => {
    while (true) {
      const currentBlock = await p.eth.getBlock('latest')
      // eslint-disable-next-line
      if (currentBlock.number === Number(targetBlock)) {
        break
      }
    }
    await stopServices(doc)

    console.log('📍Downloading and modifying genesis on machines ... ')
    await runSshCommand(providerToNodeIp.get(p), genesisCmd, maxRetries)
    await runSshCommand(
      providerToNodeIp.get(p),
      updateGenesisChainIdCmd,
      maxRetries
    )

    console.log('📍Updating start script on machines ... ')
    await runSshCommand(
      providerToNodeIp.get(p),
      updateBorStartScriptCmd,
      maxRetries
    )
    await runSshCommand(providerToNodeIp.get(p), addFlagsCmd, maxRetries)

    console.log('📍Restarting bor on machines ... ')
    await runSshCommand(providerToNodeIp.get(p), restartBorCmd, maxRetries)
  })

  await Promise.all(shadowTasks)

  try {
    const blockData = JSON.stringify({
      blockNumber: targetBlock
    })
    if (!fs.existsSync('shadowData')) {
      fs.mkdirSync('shadowData')
    }
    fs.writeFileSync('./shadowData/blockData.json', blockData, 'utf-8')
  } catch (error) {
    console.error(`Error occured while writing block number to file: ${error}`)
    process.exit(1)
  }
}
