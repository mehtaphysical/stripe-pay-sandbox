import { Near, KeyPair, utils } from "near-api-js";
import BN from "bn.js";

const MIN_BALANCE = new BN(utils.format.parseNearAmount("0.02"));
const FILL_AMOUNT = new BN(utils.format.parseNearAmount("0.1"));

const CREATE_ACCOUNT_CONTRACT_ID = process.env.CREATE_ACCOUNT_CONTRACT_ID;
const CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID;

const keyStore = {
  getKey() {
    return KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
  },
  setKey() {},
};

const near = new Near({
  keyStore,
  nodeUrl: process.env.NEXT_PUBLIC_NEAR_NODE_URL,
});

const needsRefill = async (accountId) => {
  const account = await near.account(accountId);

  const { available } = await account.getAccountBalance();

  return new BN(available).lt(MIN_BALANCE);
};

const refill = async (accountId) => {
  const account = await near.account(CONTRACT_ID);
  return account.sendMoney(accountId, FILL_AMOUNT);
};

const needsAccountCreation = async (accountId) => {
  try {
    const account = await near.account(accountId);
    await account.state();
    return false;
  } catch (error) {
    const errorString = error.toString().toLowerCase();
    const nonexistentAccountErrors = [
      "does not exist while viewing",
      `account id ${accountId.toLowerCase()} is invalid`,
    ];

    if (
      nonexistentAccountErrors.some((errorStringPart) =>
        errorString.includes(errorStringPart)
      )
    ) {
      return true;
    }
    throw error;
  }
};

const createAccount = async ({ accountId, publicKey }) => {
  const account = await near.account(CONTRACT_ID);
  return account.functionCall({
    contractId: CREATE_ACCOUNT_CONTRACT_ID,
    methodName: "create_account",
    args: { new_account_id: accountId, new_public_key: publicKey },
    gas: "200000000000000",
    attachedDeposit: FILL_AMOUNT.toString(),
  });
};

const mintTokens = async ({ accountId, intentId, amount }) => {
  const account = await near.account(CONTRACT_ID);

  return account.functionCall({
    contractId: CONTRACT_ID,
    methodName: "mint",
    args: {
      account_id: accountId,
      intent_id: intentId,
      intent_balance: amount,
    },
  });
};

export const handleIntent = async ({
  accountId,
  publicKey,
  intentId,
  amount,
}) => {
  if (publicKey && (await needsAccountCreation(accountId))) {
    await createAccount({ accountId, publicKey });
  }

  if (await needsRefill(accountId)) {
    await refill(accountId);
  }

  return mintTokens({ accountId, intentId, amount });
};
