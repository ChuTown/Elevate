import { useNavigate } from "react-router-dom";
import { useViewMode } from "../contexts/ViewModeContext";
import styles from "./ChooseViewPage.module.css";

export default function ChooseViewPage() {
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  function handleChoose(mode: "client" | "professional") {
    setViewMode(mode);
    if (mode === "professional") {
      navigate("/professional", { replace: true });
    } else {
      navigate("/client", { replace: true });
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>How would you like to use Elevate?</h1>
      <p className={styles.subtitle}>
        You can switch between these views anytime from the navbar.
      </p>
      <p className={styles.subtitle}>
        Client view: create your client profile (photo, resume, description). Professional view:
        manage inbox, calendar requests, and booked client details.
      </p>
      <div className={styles.cards}>
        <button
          type="button"
          className={styles.card}
          onClick={() => handleChoose("client")}
        >
          <h2 className={styles.cardTitle}>Client</h2>
          <p className={styles.cardDesc}>
            Book sessions with professionals, manage your profile, and share your
            resume and description.
          </p>
          <span className={styles.cardCta}>Continue as Client →</span>
        </button>
        <button
          type="button"
          className={styles.card}
          onClick={() => handleChoose("professional")}
        >
          <h2 className={styles.cardTitle}>Professional</h2>
          <p className={styles.cardDesc}>
            View your inbox, calendar, and client details for who booked you.
          </p>
          <span className={styles.cardCta}>Continue as Professional →</span>
        </button>
      </div>
    </main>
  );
}
