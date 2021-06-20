import { Near, KeyPair, utils } from "near-api-js";
import BN from "bn.js";

const MIN_BALANCE = new BN(utils.format.parseNearAmount("0.01"));
const FILL_AMOUNT = new BN(utils.format.parseNearAmount("0.05"));

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

export const handleIntent = async ({ accountId, intentId, amount }) => {
  if (await needsRefill(accountId)) await refill(accountId);
  return mintTokens({ accountId, intentId, amount });
};
