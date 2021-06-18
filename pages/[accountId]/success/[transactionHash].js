import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Success() {
  const router = useRouter();
  const { accountId, payment_intent, payment_intent_client_secret } =
    router.query;

  const [success, setSuccess] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    if (!accountId) return;

    fetch(`/api/${accountId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId,
        paymentIntentId: payment_intent,
        paymentIntentSecret: payment_intent_client_secret,
      }),
    })
      .then((res) => Promise.all([res.ok, res.json()]))
      .then(([ok, json]) => {
        if (!ok) throw json;
        setSuccess(true);
      })
      .catch(({ error }) => setError(error))
      .finally(() => window.close());
  }, [accountId]);

  if (success)
    return <h1>Credits were added successfully. You can close this window</h1>;
  else if (error)
    return (
      <h1>Something happened while trying to create your credits: {error}</h1>
    );
  else return <h1>Loading</h1>;
}
