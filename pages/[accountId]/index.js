import {
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/router";
import Layout from "../../components/layout/Layout";
import Checkout from "../../components/checkout/Checkout";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY, {
  stripeAccount: process.env.NEXT_PUBLIC_STRIPE_ACCOUNT_ID,
});

export default function Home() {
  const router = useRouter();
  const { accountId } = router.query;

  if (!accountId) return <h1>No Account Id provided</h1>;

  return (
    <Layout accountId={accountId}>
      <Elements stripe={stripePromise}>
        <Checkout accountId={accountId} />
      </Elements>
    </Layout>
  );
}
