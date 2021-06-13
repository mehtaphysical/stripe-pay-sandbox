import { Near, KeyPair } from "near-api-js";

const keyStore = {
  getKey() {
    return KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
  },
  setKey() {},
};

const near = new Near({
  keyStore,
  nodeUrl: process.env.NEAR_NODE_URL,
});

export default async (req, res) => {
  const { accountId } = req.params;

  const outcome = await (
    await near.account(process.env.NEAR_CONTRACT_ID)
  ).functionCall({
    contractId: process.env.NEAR_CONTRACT_ID,
    methodName: "mint",
    args: {
      account_id: accountId,
      intent_id: intent.id,
      intent_balance: intent.amount,
    },
  });

  res.redirect(`/${accountId}/success/${outcome.transaction.hash}`);
};
