import cors from "cors";
import Stripe from "stripe";
import { MongoClient } from "mongodb";
import { mintTokens } from "../../services/near";

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
        outcome = await mintTokens({
          accountId,
          amount,
          intentId: intent.id,
        });
      }

      if (email || phoneNumber) {
        const client = new MongoClient(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        await client.connect();
        await client.db().collection("contacts").update(
          {
            accountId,
          },
          { $set: { accountId, email, phoneNumber } },
          { upsert: true }
        );
      }

      res.status(200).json({ intent, outcome });
    } catch (err) {
      res.status(400).json(err);
    }
  });
};
