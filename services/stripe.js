import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export const createIntent = async ({ accountId, paymentMethodId, amount }) => {
  try {
    return await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      description: `Mint tokens for ${accountId}`,
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.HOST_NAME}/${accountId}/success/process`,
    });
  } catch (err) {
    throw { type: "STRIPE_CHARGE_ERROR", message: err.message };
  }
};

export const captureIntent = async (intent) => {
  try {
    await stripe.paymentIntents.capture(intent.id);
  } catch (err) {
    throw { type: "STRIPE_CAPTURE_ERROR", message: err.message };
  }
};

export const cancelIntent = async (intent) => {
  try {
    await stripe.paymentIntents.cancel(intent.id);
  } catch (err) {
    throw { type: "STRIPE_CANCEL_ERROR", message: err.message };
  }
};

export const getIntent = async (id) => {
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (err) {
    throw { type: "STRIPE_GET_INTENT_ERROR", message: err.message };
  }
};
