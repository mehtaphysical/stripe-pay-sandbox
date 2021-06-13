import { useRouter } from "next/router";
import Layout from "../../../components/layout/Layout";

export default function Success() {
  const router = useRouter();
  const { accountId, transactionHash } = router.query;

  return (
    <Layout accountId={accountId}>
      <a
        href={`${process.env.NEXT_PUBLIC_NEAR_EXPLORER_URL}/transactions/${transactionHash}`}
      >
        Transaction Status
      </a>
    </Layout>
  );
}
