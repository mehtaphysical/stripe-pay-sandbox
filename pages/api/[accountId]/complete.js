import Stripe from "stripe";
import { handleIntent } from "../../../services/near";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  const { accountId, paymentIntentId, paymentIntentSecret } = req.body;

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.client_secret !== paymentIntentSecret)
      throw new Error("Secrets do not match");
    if (intent.description !== `Mint tokens for ${accountId}`)
      throw new Error("PaymentIntent not for accountId");

    let outcome;
    if (intent.status === "requires_capture") {
      outcome = await handleIntent({
        accountId,
        intentId: intent.id,
        amount: intent.amount.toString(),
      });
      await stripe.paymentIntents.capture(intent.id);
    } else {
      await stripe.paymentIntents.cancel(intent.id);
    }

    res.send(outcome);
  } catch (err) {
    if (
      intent &&
      !(
        err.kind &&
        err.kind.ExecutionError.includes(
          "Mint already occurred with that intent"
        )
      )
    ) {
      await stripe.paymentIntents.cancel(intent.id);
    }
    res.status(400).send({ error: err.message });
  }
};
