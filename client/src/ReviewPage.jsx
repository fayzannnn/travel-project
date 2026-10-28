import { useEffect, useState } from "react";
import { getPackages, submitReview } from "./api.js";

export default function ReviewPage() {
  const [packages, setPackages] = useState([]);
  const [packageError, setPackageError] = useState("");
  const [tripChoice, setTripChoice] = useState("");
  const [rating, setRating] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    document.title = "Share your trip story — Travel Khor";
    getPackages()
      .then((result) => setPackages(result.data))
      .catch((loadError) => setPackageError(loadError.message));
  }, []);

  const reviewTrips = [...new Map(packages.map((item) => [
    item.packageId || item._id,
    item,
  ])).values()];

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const fields = new FormData(event.currentTarget);
    const payload = {
      displayName: fields.get("displayName"),
      rating: Number(rating),
      review: fields.get("review"),
      memory: fields.get("memory"),
      consentToPublish: fields.get("consentToPublish") === "on",
      website: fields.get("website"),
    };
    if (tripChoice === "custom") {
      payload.tripName = fields.get("customTripName");
    } else {
      payload.packageId = tripChoice;
    }

    try {
      const result = await submitReview(payload);
      setSuccess(result.message);
      formElement.reset();
      setTripChoice("");
      setRating("5");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-page">
      <header className="site-nav">
        <div className="nav-row wrap">
          <a href="/" className="logo">Travel Khor<span className="dot">.</span></a>
          <nav className="links review-nav">
            <a href="/#packages">Packages</a>
            <a href="/#voices">Reviews</a>
            <a href="/">Home</a>
          </nav>
          <a className="nav-cta" href="/">Back to site</a>
        </div>
      </header>
      <main className="review-main">
        <section className="review-intro">
          <p className="eyebrow">Your story matters</p>
          <h1>Tell us about the trip you&apos;ll remember.</h1>
          <p>Share what went well, what we can improve, and a favourite moment from your journey. Our team reviews every submission before it can appear publicly.</p>
        </section>
        <form className="review-form" onSubmit={handleSubmit}>
          <label>
            Your name
            <input name="displayName" minLength="2" maxLength="80" autoComplete="name" required />
          </label>
          <label>
            Which trip did you take?
            <select value={tripChoice} onChange={(event) => setTripChoice(event.target.value)} required>
              <option value="" disabled>Select a trip</option>
              {reviewTrips.map((item) => (
                <option key={item.packageId || item._id} value={item.packageId || item._id}>
                  {item.destination || item.title}
                </option>
              ))}
              <option value="custom">Other / custom trip</option>
            </select>
          </label>
          {tripChoice === "custom" && (
            <label>
              Trip or destination
              <input name="customTripName" minLength="2" maxLength="120" required />
            </label>
          )}
          {packageError && <p className="review-inline-error" role="alert">{packageError} You can still select “Other / custom trip”.</p>}
          <label>
            Your rating
            <select value={rating} onChange={(event) => setRating(event.target.value)} aria-label="Rating from 1 to 5 stars">
              <option value="5">★★★★★ — Loved it</option>
              <option value="4">★★★★☆ — Great</option>
              <option value="3">★★★☆☆ — Good</option>
              <option value="2">★★☆☆☆ — Could be better</option>
              <option value="1">★☆☆☆☆ — Needs improvement</option>
            </select>
          </label>
          <label>
            Your review
            <textarea name="review" rows="5" minLength="20" maxLength="1500" placeholder="Tell us about the planning, guides, stays, and what we could do better." required />
          </label>
          <label>
            Share a favourite memory
            <textarea name="memory" rows="5" minLength="20" maxLength="2000" placeholder="What moment, place, or experience from the trip stays with you?" required />
          </label>
          <label className="review-consent">
            <input type="checkbox" name="consentToPublish" required />
            <span>I agree Travel Khor may publish my name, rating, review, and trip memory if an admin approves it.</span>
          </label>
          <label className="review-honeypot" aria-hidden="true">
            Leave this field empty
            <input name="website" tabIndex="-1" autoComplete="off" />
          </label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          {success && <p className="admin-success" role="status">{success}</p>}
          <button className="btn-primary review-submit" type="submit" disabled={submitting}>
            {submitting ? "Sending your story..." : "Submit review"}
          </button>
          <p className="review-privacy">Your review is private until approved. We don&apos;t request your email or phone on this form.</p>
        </form>
      </main>
      <footer className="review-footer">
        <div className="wrap"><a href="/">Travel Khor</a><span>Made for travellers, not tourists.</span></div>
      </footer>
    </div>
  );
}
