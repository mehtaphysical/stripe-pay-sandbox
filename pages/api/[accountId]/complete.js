import Stripe from "stripe";
import { mintTokens } from "../../../services/near";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  const { accountId, payment_intent: paymentIntentId } = req.query;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "requires_capture" && !intent.next_action) {
    const outcome = await mintTokens({
      accountId,
      intentId: intent.id,
      amount: intent.amount.toString(),
    });
    res.redirect(`/${accountId}/success/${outcome.transaction.hash}`);
  } else {
    res.redirect("/");
  }
};
