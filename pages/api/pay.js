import cors from "cors";
import Stripe from "stripe";
import { handleIntent } from "../../services/near";
import { storeContact } from "../../services/contacts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  cors()(req, res, async () => {
    const { accountId, paymentMethodId, amount, email, phoneNumber } = req.body;

    try {
      const intent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        description: `Mint tokens for ${accountId}`,
        payment_method_types: ["card"],
        capture_method: "automatic",
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${process.env.HOST_NAME}/${accountId}/success/process`,
      });

      let outcome = null;
      if (intent.status === "succeeded" && !intent.next_action) {
        outcome = await handleIntent({
          accountId,
          amount,
          intentId: intent.id,
        });
      }

      await storeContact({
        accountId,
        email,
        phoneNumber,
      });

      res.status(200).json({ intent, outcome });
    } catch (err) {
      console.log(err);
      res.status(400).json(err);
    }
  });
};
