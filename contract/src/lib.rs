use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC
};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, UnorderedMap};
use near_sdk::json_types::{ValidAccountId};
use near_sdk::{env, AccountId, Balance, PanicOnDefault, near_bindgen};

near_sdk::setup_alloc!();

#[derive(BorshDeserialize, BorshSerialize)]
pub struct IntentBalance {
    intent_id: String,
    current_balance: Balance,
    intent_balance: Balance
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    owner_id: AccountId,
    balances: UnorderedMap<AccountId, IntentBalance>,
    metadata: LazyOption<FungibleTokenMetadata>,
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
            decimals: 2
        };

        Self {
            owner_id: env::signer_account_id(),
            balances: UnorderedMap::new(b"b".to_vec()),
            metadata: LazyOption::new(b"m".to_vec(), Some(&metadata)),
        }
    }

    pub fn mint(&mut self, account_id: ValidAccountId, intent_id: String, intent_balance: Balance) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can mint");
        
        let current_intent_balance = self.balances.get(&account_id.to_string());

        let balance_spent = current_intent_balance.map_or_else(
            || 0,
            |b| b.intent_balance - b.current_balance
        );

        self.balances.insert(&account_id.to_string(), &IntentBalance {
            intent_id,
            intent_balance,
            current_balance: intent_balance - balance_spent
        });
    }
}

#[near_bindgen]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, Balance};

    use super::*;

    const TOTAL_SUPPLY: Balance = 1_000_000_000_000_000;

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

    // #[test]
    // fn test_transfer() {
    //     let mut context = get_context(accounts(2));
    //     testing_env!(context.build());
    //     let mut contract = Contract::new_default_meta(accounts(2).into(), TOTAL_SUPPLY.into());
    //     testing_env!(context
    //         .storage_usage(env::storage_usage())
    //         .attached_deposit(contract.storage_balance_bounds().min.into())
    //         .predecessor_account_id(accounts(1))
    //         .build());
    //     // Paying for account registration, aka storage deposit
    //     contract.storage_deposit(None, None);

    //     testing_env!(context
    //         .storage_usage(env::storage_usage())
    //         .attached_deposit(1)
    //         .predecessor_account_id(accounts(2))
    //         .build());
    //     let transfer_amount = TOTAL_SUPPLY / 3;
    //     contract.ft_transfer(accounts(1), transfer_amount.into(), None);

    //     testing_env!(context
    //         .storage_usage(env::storage_usage())
    //         .account_balance(env::account_balance())
    //         .is_view(true)
    //         .attached_deposit(0)
    //         .build());
    //     assert_eq!(contract.ft_balance_of(accounts(2)).0, (TOTAL_SUPPLY - transfer_amount));
    //     assert_eq!(contract.ft_balance_of(accounts(1)).0, transfer_amount);
    // }
}
