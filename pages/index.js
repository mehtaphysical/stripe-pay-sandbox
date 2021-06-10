import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import styles from "../styles/Home.module.css";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY, {
  stripeAccount: process.env.NEXT_PUBLIC_STRIPE_ACCOUNT_ID,
});

function Checkout() {
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const card = elements.getElement(CardElement);

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });
      if (error) throw error;

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount: Number(`${amount}00`),
        }),
      });

      const json = await res.json();
      if (res.status !== 200) throw json;

      if (json.intent.next_action) {
        window.location.assign(json.intent.next_action.redirect_to_url.url);
      }

      // card.clear();
      // setAmount("");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && error.message}
      <input
        type="number"
        step="1"
        value={amount}
        onChange={({ target }) => setAmount(target.value)}
      />
      <CardElement />
      <button disabled={loading}>pay</button>
    </form>
  );
}

export default function Home() {
  return (
    <section className={styles.Home}>
      <Elements stripe={stripePromise}>
        <Checkout />
      </Elements>
    </section>
  );
}
