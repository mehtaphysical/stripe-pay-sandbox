import { handleIntent } from "../../../services/near";
import {
  cancelIntent,
  captureIntent,
  getIntent,
} from "../../../services/stripe";

export default async (req, res) => {
  const { accountId, paymentIntentId, paymentIntentSecret } = req.body;

  let intent;
  try {
    intent = await getIntent(paymentIntentId);
    if (intent.client_secret !== paymentIntentSecret) {
      throw {
        type: "STRIPE_CLIENT_SECRET_ERROR",
        message: "Secrets do not match",
      };
    }

    if (intent.description !== `Mint tokens for ${accountId}`) {
      throw {
        type: "STRIPE_CLIENT_SECRET_ERROR",
        message: "PaymentIntent not for accountId",
      };
    }

    let outcome;
    if (intent.status === "requires_capture") {
      outcome = await handleIntent({
        accountId,
        intentId: intent.id,
        amount: intent.amount.toString(),
      });
      await captureIntent(intent);
    } else {
      await cancelIntent(intent);
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
      await cancelIntent(intent);
    }
    res.status(400).send(err);
  }
};
