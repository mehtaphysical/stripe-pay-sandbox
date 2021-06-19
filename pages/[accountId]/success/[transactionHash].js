import { useEffect } from "react";
import { useRouter } from "next/router";
import Loading from "../../../components/loading/Loading";

export default function Success() {
  const router = useRouter();
  const { accountId, payment_intent, payment_intent_client_secret } =
    router.query;

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
    }).finally(() => window.close());
  }, [accountId]);

  return <Loading />;
}
