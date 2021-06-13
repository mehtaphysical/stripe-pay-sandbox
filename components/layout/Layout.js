import Balance from "../balance/Balance";
import styles from "./Layout.module.css";

export default function Layout({ accountId, children }) {
  return (
    <section className={styles.Layout}>
      <Balance accountId={accountId} />
      {children}
    </section>
  );
}
