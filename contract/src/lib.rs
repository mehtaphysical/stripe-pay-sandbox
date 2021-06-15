use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::FungibleToken;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, UnorderedMap};
use near_sdk::json_types::{ValidAccountId, U128};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, AccountId, Balance, BorshStorageKey, PanicOnDefault, PromiseOrValue,
};

near_sdk::setup_alloc!();

type StripeIntentId = String;

#[derive(BorshDeserialize, BorshSerialize, Deserialize, Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct StripeIntent {
    account_id: AccountId,
    intent_id: StripeIntentId,
    intent_balance: Balance,
    capture_amount: Option<Balance>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    burn_pending: bool,
    owner_id: AccountId,
    token: FungibleToken,
    intents: UnorderedMap<AccountId, Vec<StripeIntent>>,
    metadata: LazyOption<FungibleTokenMetadata>,
}

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    FT,
    Intents,
    Metadata,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new() -> Self {
        assert!(!env::state_exists(), "Already initialized");

        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "Hip Hop USD".to_string(),
            symbol: "hhUSD".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 2,
        };

        Self {
            burn_pending: false,
            owner_id: env::signer_account_id(),
            token: FungibleToken::new(StorageKey::FT),
            intents: UnorderedMap::new(StorageKey::Intents),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
        }
    }

    pub fn mint(&mut self, account_id: ValidAccountId, intent_id: String, intent_balance: U128) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can mint"
        );

        let mut stripe_intents = self
            .intents
            .get(&account_id.to_string())
            .unwrap_or(Vec::new());

        stripe_intents.push(StripeIntent {
            account_id: account_id.to_string(),
            intent_id,
            intent_balance: intent_balance.into(),
            capture_amount: None,
        });

        match self.token.accounts.get(&account_id.to_string()) {
            None => {
                self.token
                    .internal_register_account(&account_id.to_string());
            }
            _ => {}
        }

        self.token
            .internal_deposit(&account_id.to_string(), intent_balance.into());
        self.intents
            .insert(&account_id.to_string(), &stripe_intents);
    }

    pub fn start_burn(&mut self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can start burn"
        );
        self.burn_pending = true;
    }

    pub fn complete_burn(&mut self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can complete burn"
        );
        self.burn_pending = false;
    }

    pub fn capture_and_burn_for(&mut self, account_id: String) -> Vec<(String, U128)> {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can execute burn"
        );

        let intents = self
            .intents
            .get(&account_id.to_string())
            .unwrap_or(Vec::new());

        let mut balance = self
            .token
            .internal_unwrap_balance_of(&account_id.to_string());
        let execution_plan = intents
            .iter()
            .map(|intent| {
                let to_burn = if balance > intent.intent_balance {
                    intent.intent_balance
                } else {
                    balance
                };

                balance -= to_burn;

                StripeIntent {
                    account_id: intent.account_id.to_string(),
                    intent_id: intent.intent_id.to_string(),
                    intent_balance: intent.intent_balance,
                    capture_amount: Some(intent.intent_balance - to_burn),
                }
            })
            .collect();

        self.token
            .accounts
            .insert(&account_id.to_string(), &balance);
        self.intents.insert(&account_id.into(), &execution_plan);

        execution_plan
            .iter()
            .map(|intent| {
                (
                    intent.intent_id.to_string(),
                    U128(intent.capture_amount.unwrap_or(0)),
                )
            })
            .collect()
    }

    pub fn capture_and_burn_all(&mut self, limit: Option<u64>) -> Vec<(String, U128)> {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can execute burn"
        );
        assert!(self.burn_pending, "Burn hasn't started yet");

        let limit = limit.unwrap_or(10);

        let capturable_account_ids: Vec<String> = self
            .intents
            .iter()
            .filter(|(_, intents)| intents.iter().any(|intent| intent.capture_amount.is_none()))
            .map(|(account_id, _)| account_id)
            .take(limit as usize)
            .collect();

        let mut intents_to_capture = Vec::new();
        for account_id in capturable_account_ids {
            intents_to_capture.extend(self.capture_and_burn_for(account_id));
        }

        intents_to_capture
    }
}

near_contract_standards::impl_fungible_token_core!(Contract, token);
near_contract_standards::impl_fungible_token_storage!(Contract, token);

#[near_bindgen]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use near_contract_standards::fungible_token::core::FungibleTokenCore;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;
    use near_sdk::MockedBlockchain;

    use super::*;

    fn get_context(predecessor_account_id: ValidAccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_new() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let contract = Contract::new();
        testing_env!(context.is_view(true).build());
        assert_eq!(contract.owner_id, accounts(1).to_string());
    }

    #[test]
    #[should_panic(expected = "The contract is not initialized")]
    fn test_default() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let _contract = Contract::default();
    }

    #[test]
    fn test_mint() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = Contract::new();

        contract.mint(accounts(1), "intent-id".to_string(), 100.into());

        assert_eq!(
            contract
                .intents
                .get(&accounts(1).into())
                .unwrap()
                .first()
                .unwrap()
                .intent_balance,
            100
        );
        assert_eq!(contract.token.ft_balance_of(accounts(1)).0, 100);

        contract.mint(accounts(1), "intent-id-2".to_string(), 500.into());
        assert_eq!(
            contract
                .intents
                .get(&accounts(1).into())
                .unwrap()
                .get(1)
                .unwrap()
                .intent_balance,
            500
        );
        assert_eq!(contract.token.ft_balance_of(accounts(1)).0, 600);
    }

    #[test]
    fn test_ft_transfer() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = Contract::new();

        contract.mint(accounts(0), "intent-id".to_string(), 100.into());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(contract.storage_balance_bounds().min.into())
            .predecessor_account_id(accounts(1))
            .build());
        contract.storage_deposit(None, None);

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(1)
            .predecessor_account_id(accounts(0))
            .build());
        contract.ft_transfer(accounts(1), 50.into(), None);

        assert_eq!(contract.ft_balance_of(accounts(0)).0, 50);
        assert_eq!(contract.ft_balance_of(accounts(1)).0, 50);
    }

    #[test]
    fn test_capture_and_burn_all() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = Contract::new();

        contract.mint(accounts(0), "intent-id-0".to_string(), 10.into());

        contract.mint(accounts(1), "intent-id-1".to_string(), 10.into());
        contract.mint(accounts(1), "intent-id-2".to_string(), 20.into());
        contract.mint(accounts(1), "intent-id-3".to_string(), 20.into());
        contract.mint(accounts(1), "intent-id-4".to_string(), 20.into());

        contract.mint(accounts(2), "intent-id-5".to_string(), 50.into());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(1)
            .predecessor_account_id(accounts(1))
            .build());

        contract.ft_transfer(accounts(0), 45.into(), None);

        contract.burn_pending = true;

        assert_eq!(
            contract.capture_and_burn_for(accounts(2).to_string()),
            [("intent-id-5".to_string(), 0.into())]
        );

        assert_eq!(
            contract.capture_and_burn_all(None),
            [
                ("intent-id-0".to_string(), 0.into()),
                ("intent-id-1".to_string(), 0.into()),
                ("intent-id-2".to_string(), 5.into()),
                ("intent-id-3".to_string(), 20.into()),
                ("intent-id-4".to_string(), 20.into()),
            ]
        );
    }

    #[test]
    fn test_capture_and_burn_all_paged() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = Contract::new();

        contract.mint(accounts(0), "intent-id-0".to_string(), 10.into());

        contract.mint(accounts(1), "intent-id-1".to_string(), 10.into());
        contract.mint(accounts(1), "intent-id-2".to_string(), 20.into());
        contract.mint(accounts(1), "intent-id-3".to_string(), 20.into());
        contract.mint(accounts(1), "intent-id-4".to_string(), 20.into());

        contract.mint(accounts(2), "intent-id-5".to_string(), 50.into());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(1)
            .predecessor_account_id(accounts(1))
            .build());

        contract.ft_transfer(accounts(0), 45.into(), None);

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(1)
            .predecessor_account_id(accounts(2))
            .build());

        contract.ft_transfer(accounts(1), 5.into(), None);

        contract.burn_pending = true;

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(accounts(1))
            .build());

        assert_eq!(
            contract.capture_and_burn_all(Some(1)),
            [("intent-id-0".to_string(), 0.into()),]
        );

        assert_eq!(
            contract.capture_and_burn_all(Some(1)),
            [
                ("intent-id-1".to_string(), 0.into()),
                ("intent-id-2".to_string(), 0.into()),
                ("intent-id-3".to_string(), 20.into()),
                ("intent-id-4".to_string(), 20.into()),
            ]
        );

        assert_eq!(
            contract.capture_and_burn_all(Some(1)),
            [("intent-id-5".to_string(), 5.into())]
        );
    }
}
