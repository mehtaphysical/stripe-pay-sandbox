import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

export default async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "usd",
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method: req.body.paymentMethodId,
      confirm: true,
      return_url: process.env.STRIPE_RETURN_URL,
    });

    res.status(200).json({ intent });
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
};
