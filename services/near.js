import { Near, KeyPair } from "near-api-js";

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

export const mintTokens = async({ accountId, intentId, amount }) => {
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
}
