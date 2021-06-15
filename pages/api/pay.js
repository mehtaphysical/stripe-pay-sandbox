import Stripe from "stripe";
import { mintTokens } from "../../services/near";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  const { accountId, paymentMethodId, amount } = req.body;
  console.log(amount);

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.HOST_NAME}/api/${accountId}/complete`,
    });

    let outcome = null;
    if (intent.status === "requires_capture" && !intent.next_action) {
      outcome = await mintTokens({
        accountId,
        amount,
        intentId: intent.id,
      });
    }

    res.status(200).json({ intent, outcome });
  } catch (err) {
    res.status(400).json(err);
  }
};
