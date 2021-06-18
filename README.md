# Setup the contract

use the deploy script `./deploy.sh`

It will do the following:

* build the contract with `cargo build --all --target wasm32-unknown-unknown --release`
* create the contract account `near create-account $CONTRACT_ID --masterAccount SOME_MASTER_ACCOUNT --initialBalance INITIAL_BALANCE`
* then deploy the contract `near deploy $CONTRACT_ID target/wasm32-unknown-unknown/release/contract.wasm`
* setup the contract so only transfers are allowed to the marketplace `near call $CONTRACT_ID new '{"marketplace_id":"MARKETPLACE_ID"}' --accountId $CONTRACT_ID`
* pay for marketplace storage `near call $CONTRACT_ID storage_deposit "{\"account_id\":\"$MARKETPLACE_ID\",\"registration_only\": true}" --accountId $CONTRACT_ID --amount 0.00125`
