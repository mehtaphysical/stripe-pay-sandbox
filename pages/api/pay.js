import cors from "cors";
import { handleIntent } from "../../services/near";
import { storeContact } from "../../services/contacts";
import {
  cancelIntent,
  captureIntent,
  createIntent,
} from "../../services/stripe";

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
    intent = await createIntent({ accountId, paymentMethodId, amount });

    let outcome = null;
    if (intent.status === "requires_capture" && !intent.next_action) {
      outcome = await handleIntent({
        accountId,
        publicKey,
        amount,
        intentId: intent.id,
      });
      await captureIntent(intent);
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
      await cancelIntent(intent);
    }
    res.status(400).send(err);
  }
};
