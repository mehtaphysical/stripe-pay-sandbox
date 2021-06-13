import { useEffect, useState } from "react";
import { Near, keyStores } from "near-api-js";

const near = new Near({
  nodeUrl: process.env.NEXT_PUBLIC_NEAR_NODE_URL,
  keyStore: new keyStores.InMemoryKeyStore(),
});

const parseBalance = (balance) =>
  `${balance.slice(0, -2)}.${balance.slice(-2)}`;

export default function Balance({ accountId }) {
  const [balance, setBalance] = useState();
  useEffect(() => {
    console.log(accountId);
    near
      .account(accountId)
      .then((account) => {
        return account.viewFunction(
          process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID,
          "ft_balance_of",
          { account_id: accountId }
        );
      })
      .then(parseBalance)
      .then(setBalance);
  }, []);

  if (!balance) return null;

  return <p>Current Balance: {balance}</p>;
}
