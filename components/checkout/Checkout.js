import { useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "next/router";
import styles from "./Checkout.module.css";
import { KeyPair } from "near-api-js";

const parseAmount = (amount) => {
  const [whole, decimal = "00"] = amount.split(".");
  return `${whole}${decimal.slice(0, 2)}`;
};

export default function Checkout({ accountId }) {
  const stripe = useStripe();
  const elements = useElements();

  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState();
  const [phoneNumber, setPhoneNumber] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

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
          accountId,
          paymentMethodId: paymentMethod.id,
          amount: parseAmount(amount),
          email,
          phoneNumber,
          publicKey: KeyPair.fromRandom("ed25519").getPublicKey().toString(),
        }),
      });

      const json = await res.json();
      if (res.status !== 200) throw json;

      if (json.intent.next_action) {
        window.open(json.intent.next_action.redirect_to_url.url);
      } else {
        router.reload();
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.Checkout} onSubmit={handleSubmit}>
      {error && error.message}
      <input
        type="email"
        placeholder="email"
        onChange={({ target }) => setEmail(target.value)}
      />
      <input
        type="text"
        placeholder="phone number"
        onChange={({ target }) => setPhoneNumber(target.value)}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={({ target }) => setAmount(target.value)}
      />
      <CardElement className={styles.Input} />
      <button disabled={loading}>Purchase</button>
    </form>
  );
}
