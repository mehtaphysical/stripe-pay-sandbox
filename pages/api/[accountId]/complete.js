import Stripe from "stripe";
import { handleIntent } from "../../../services/near";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  const { accountId, paymentIntentId, paymentIntentSecret } = req.body;

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.client_secret !== paymentIntentSecret)
      throw new Error("Secrets do not match");
    if (intent.description !== `Mint tokens for ${accountId}`)
      throw new Error("PaymentIntent not for accountId");

    const outcome = await handleIntent({
      accountId,
      intentId: intent.id,
      amount: intent.amount.toString(),
    });

    res.send(outcome);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
};
