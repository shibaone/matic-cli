#!/bin/bash
set -e

echo "Starting the smoke tests for the local docker devnet..."

cd ./devnet
SCRIPT_ADDRESS=$(jq -r '.[0].address' signer-dump.json)
SCRIPT_PRIVATE_KEY=$(jq -r '.[0].priv_key' signer-dump.json)

cd ../code/pos-contracts
CONTRACT_ADDRESS=$(jq -r .root.tokens.MaticToken contractAddresses.json)

echo "Executing a deposit..."
export PATH="$HOME/.foundry/bin:$PATH"
forge script scripts/matic-cli-scripts/Deposit.s.sol:MaticDeposit --rpc-url http://localhost:9545 --private-key $SCRIPT_PRIVATE_KEY --broadcast --sig "run(address,address,uint256)" $SCRIPT_ADDRESS $CONTRACT_ADDRESS 100000000000000000000
echo "Deposit executed successfully! StateSync will kick in soon..."

balanceInit=$(docker exec bor0 bash -c "bor attach /var/lib/bor/data/bor.ipc -exec 'Math.round(web3.fromWei(eth.getBalance(eth.accounts[0])))'")

echo "Initial balance of first account: $balanceInit"

stateSyncFound="false"
checkpointFound="false"
SECONDS=0
start_time=$SECONDS

while true; do

    balance=$(docker exec bor0 bash -c "bor attach /var/lib/bor/data/bor.ipc -exec 'Math.round(web3.fromWei(eth.getBalance(eth.accounts[0])))'")

    if ! [[ "$balance" =~ ^[0-9]+$ ]]; then
        echo "Something is wrong! Can't find the balance of first account in bor network."
        exit 1
    fi

    if ((balance > balanceInit)); then
        if [ "$stateSyncFound" != "true" ]; then
            stateSyncTime=$((SECONDS - start_time))
            stateSyncFound="true"
            echo "State sync went through. Time taken: $(printf '%02dm:%02ds\n' $((stateSyncTime % 3600 / 60)) $((stateSyncTime % 60)))"
        fi
    fi

    checkpointID=$(curl -sL http://localhost:1317/checkpoints/latest | jq .result.id)

    if [ "$checkpointID" != "null" ]; then
        if [ "$checkpointFound" != "true" ]; then
            checkpointTime=$((SECONDS - start_time))
            checkpointFound="true"
            echo "Checkpoint went through. Time taken: $(printf '%02dm:%02ds\n' $((checkpointTime % 3600 / 60)) $((checkpointTime % 60)))"
        fi
    fi

    if [ "$stateSyncFound" == "true" ] && [ "$checkpointFound" == "true" ]; then
        break
    fi

done
echo "Both state sync and checkpoint went through. All tests have passed!"
echo "Time taken for state sync: $(printf '%02dm:%02ds\n' $((stateSyncTime % 3600 / 60)) $((stateSyncTime % 60)))"
echo "Time taken for checkpoint: $(printf '%02dm:%02ds\n' $((checkpointTime % 3600 / 60)) $((checkpointTime % 60)))"
