import cors from "cors";
import Stripe from "stripe";
import { handleIntent } from "../../services/near";
import { storeContact } from "../../services/contacts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

const corsPromise = (req, res) => {
  return new Promise((resolve, reject) => {
    cors()(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export default async (req, res) => {
  await corsPromise(req, res);
  const { accountId, publicKey, paymentMethodId, amount, email, phoneNumber } =
    req.body;

  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      description: `Mint tokens for ${accountId}`,
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.HOST_NAME}/${accountId}/success/process`,
    });

    let outcome = null;
    if (intent.status === "requires_capture" && !intent.next_action) {
      outcome = await handleIntent({
        accountId,
        publicKey,
        amount,
        intentId: intent.id,
      });
      await stripe.paymentIntents.capture(intent.id);
    }

    await storeContact({
      accountId,
      email,
      phoneNumber,
    });
    
    res.send({ intent, outcome });
  } catch (err) {
    console.log(err);
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
    res.status(400).json(err);
  }
};
