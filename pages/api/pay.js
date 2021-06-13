import Stripe from "stripe";
import { Near, KeyPair } from "near-api-js";

const CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID;

const keyStore = {
  getKey() {
    return KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
  },
  setKey() {},
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

const near = new Near({
  keyStore,
  nodeUrl: process.env.NEXT_PUBLIC_NEAR_NODE_URL,
});

export default async (req, res) => {
  const { accountId, paymentMethodId, amount } = req.body;

  try {
    const account = await near.account(
      process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID
    );

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.HOST_NAME}/${accountId}/complete`,
    });

    let outcome = null;
    if (intent.status === "requires_capture" && !intent.next_action) {
      outcome = await account.functionCall({
        contractId: CONTRACT_ID,
        methodName: "mint",
        args: {
          account_id: accountId,
          intent_id: intent.id,
          intent_balance: intent.amount,
        },
      });
    }

    res.status(200).json({ intent, outcome });
  } catch (err) {
    res.status(400).json(err);
  }
};
