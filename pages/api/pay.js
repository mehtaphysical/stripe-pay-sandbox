import Stripe from "stripe";
import { Near, KeyPair } from "near-api-js";

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
  nodeUrl: process.env.NEAR_NODE_URL,
});

export default async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "usd",
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: req.body.paymentMethodId,
      confirm: true,
      return_url: process.env.STRIPE_RETURN_URL,
    });

    let outcome = null;
    if (intent.status === "requires_capture" && !intent.next_action) {
      outcome = await (
        await near.account(process.env.NEAR_CONTRACT_ID)
      ).functionCall({
        contractId: process.env.NEAR_CONTRACT_ID,
        methodName: "mint",
        args: {
          account_id: "rnm.testnet",
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