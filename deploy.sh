#!/bin/bash

echo "What is the contract account id?"
read CONTRACT_ID

echo "Should this account be created?"
read CREATE_ACCOUNT

if [[ $CREATE_ACCOUNT == "yes" ]]; then
  echo "What is the master account?"
  read MASTER_ACCOUNT

  echo "Whate is the initial balance?"
  read INITIAL_BALANCE
fi

echo "What is the marketplace contract id?"
read MARKETPLACE_ID

echo "CONTRACT_ID $CONTRACT_ID"

if [[ $CREATE_ACCOUNT == "yes" ]]; then
  echo "MASTER_ACCOUNT $MASTER_ACCOUNT"
  echo "INITIAL_BALANCE $INITIAL_BALANCE"
fi

echo "MARKETPLACE_ID $MARKETPLACE_ID"

echo "Is this correct?"
read CORRECT

if [[ $CORRECT != "yes" ]]; then
  exit 1
fi

# Build contract
cd contract
cargo build --all --target wasm32-unknown-unknown --release

# Create contract if necessary
if [[ $CREATE_ACCOUNT == "yes" ]]; then
  npx -p near-cli near create-account $CONTRACT_ID --masterAccount $MASTER_ACCOUNT --initialBalance $INITIAL_BALANCE
fi

# deploy contract
npx -p near-cli near deploy $CONTRACT_ID target/wasm32-unknown-unknown/release/contract.wasm

# initialize contract
npx -p near-cli near call $CONTRACT_ID new "{\"marketplace_id\":\"$MARKETPLACE_ID\"}" --accountId $CONTRACT_ID

# pay for marketplace storage
npx -p near-cli near call $CONTRACT_ID storage_deposit "{\"account_id\":\"$MARKETPLACE_ID\",\"registration_only\": true}" --accountId $CONTRACT_ID --amount 0.00125
