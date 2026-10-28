import { useEffect, useState } from "react";
import { adminRequest } from "./api.js";
import { defaultHomepage } from "../../shared/homepage.js";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFollowUpDate(value) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString();
}

const packagePlanTiers = ["Standard", "Moderate", "Premium"];

function blankPlan(plan = "Standard") {
  return {
    plan,
    title: "",
    description: "",
    duration: "",
    stayType: "",
    itinerary: [{ day: 1, title: "", description: "" }],
    price: "",
    maxGroupSize: 12,
  };
}

const packageBlank = {
  region: "",
  destination: "",
  description: "",
  imageUrl: "",
  imageAlt: "",
  imageCaption: "",
  imageCredit: "",
  imageSourceUrl: "",
  imageLicense: "CC BY-SA 4.0",
  imageLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  plans: [blankPlan()],
  seasonalLabel: "",
  sortOrder: 0,
  active: true,
};

const homepageFields = [
  ["brandName", "Brand name"],
  ["heroEyebrow", "Hero eyebrow"],
  ["heroTitle", "Hero headline"],
  ["heroDescription", "Hero description"],
  ["packagesHeading", "Packages heading"],
  ["packagesDescription", "Packages introduction"],
  ["whyHeading", "Planning section heading"],
  ["whyDescription", "Planning section description"],
  ["offerTitle", "Weekend offer title"],
  ["offerPrice", "Weekend offer price (₹)"],
  ["offerDescription", "Weekend offer details"],
  ["testimonialsHeading", "Reviews heading"],
  ["ctaHeading", "Call-to-action text"],
  ["footerAbout", "Footer description"],
  ["footerTagline", "Footer tagline"],
  ["contactEmail", "Contact email"],
  ["contactPhone", "Contact phone"],
  ["contactLocation", "Contact location"],
];

const homepageKeys = [
  "brandName", "heroEyebrow", "heroTitle", "heroDescription", "heroStats", "values",
  "packagesHeading", "packagesDescription", "whyHeading", "whyDescription", "planningSteps",
  "offerTitle", "offerPrice", "offerDescription", "testimonialsHeading", "testimonials",
  "ctaHeading", "footerAbout", "footerTagline", "contactEmail", "contactPhone", "contactLocation",
];

function Login({ onLogin }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      onLogin(result.data);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <a className="admin-back-link" href="/">← Back to Travel Khor</a>
        <p className="eyebrow">Travel Khor</p>
        <h1>Admin sign in</h1>
        <p className="admin-login-description">Manage your tours, trip requests, and homepage content.</p>
        <label>Email<input name="email" type="email" autoComplete="username" maxLength="254" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-button admin-button-primary" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function InquiryPanel({ onFollowUpsChanged, refreshKey }) {
  const [inquiries, setInquiries] = useState([]);
  const [followUpDates, setFollowUpDates] = useState({});
  const [savingFollowUpId, setSavingFollowUpId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadInquiries() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query.trim()) params.set("q", query.trim());
    try {
      const result = await adminRequest(`/inquiries?${params.toString()}`);
      setInquiries(result.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries();
  }, [statusFilter, query, refreshKey]);

  async function updateStatus(id, status) {
    setError("");
    try {
      await adminRequest(`/inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadInquiries();
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function saveFollowUp(id) {
    setError("");
    setSavingFollowUpId(id);
    const date = Object.hasOwn(followUpDates, id)
      ? followUpDates[id]
      : inquiries.find((inquiry) => inquiry._id === id)?.followUpDate?.slice(0, 10) || "";
    try {
      const result = await adminRequest(`/inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ followUpDate: date || null }),
      });
      setInquiries((current) => current.map((inquiry) => (
        inquiry._id === id
          ? { ...inquiry, followUpDate: result.data.followUpDate, followUpCompleted: result.data.followUpCompleted }
          : inquiry
      )));
      setFollowUpDates((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await onFollowUpsChanged();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingFollowUpId("");
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Trip inquiries</h2><p>Contact travellers and track each request.</p></div>
        <span className="admin-count">{inquiries.length}{inquiries.length === 200 ? "+" : ""} shown</span>
      </div>
      <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setQuery(search); }}>
        <label className="admin-search">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone, destination" /></label>
        <label>Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button className="admin-button" type="submit">Search</button>
      </form>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading inquiries...</p> : inquiries.length === 0 ? (
        <p className="admin-empty">No inquiries match these filters.</p>
      ) : (
        <div className="inquiry-list">
          {inquiries.map((inquiry) => (
            <article className="inquiry-card" key={inquiry._id}>
              <div className="inquiry-card-heading">
                <div><h3>{inquiry.name}</h3><span className={`status-pill status-${inquiry.status}`}>{inquiry.status}</span></div>
                <time dateTime={inquiry.createdAt}>{new Date(inquiry.createdAt).toLocaleString()}</time>
              </div>
              <div className="inquiry-details">
                <p><b>Destination:</b> {inquiry.destination}{inquiry.selectedPlan ? ` — ${inquiry.selectedPlan} plan` : ""}</p>
                <p><b>Date:</b> {new Date(inquiry.travelDate).toLocaleDateString()}</p>
                <p><b>Travellers:</b> {inquiry.groupSize}</p>
                <p><b>Budget:</b> {inquiry.budget ? `₹${inquiry.budget.toLocaleString("en-IN")} per person` : "Not specified"}</p>
                {inquiry.additionalLocation && <p><b>Additional places requested:</b> {inquiry.additionalLocation}</p>}
                {inquiry.message && <p><b>Message:</b> {inquiry.message}</p>}
              </div>
              <div className="inquiry-follow-up">
                <label>
                  Follow-up date
                  <input
                    type="date"
                    min={getLocalDateString()}
                    value={Object.hasOwn(followUpDates, inquiry._id)
                      ? followUpDates[inquiry._id]
                      : inquiry.followUpDate?.slice(0, 10) || ""}
                    onChange={(event) => setFollowUpDates((current) => ({
                      ...current,
                      [inquiry._id]: event.target.value,
                    }))}
                  />
                </label>
                <button
                  className="admin-button"
                  type="button"
                  disabled={savingFollowUpId === inquiry._id}
                  onClick={() => saveFollowUp(inquiry._id)}
                >
                  {savingFollowUpId === inquiry._id ? "Saving..." : "Save follow-up"}
                </button>
                {inquiry.followUpDate && (
                  <span className={`follow-up-status${inquiry.followUpCompleted ? " is-complete" : ""}`}>
                    {inquiry.followUpCompleted
                      ? `Completed · ${formatFollowUpDate(inquiry.followUpDate)}`
                      : `Scheduled · ${formatFollowUpDate(inquiry.followUpDate)}`}
                  </span>
                )}
              </div>
              <div className="inquiry-card-footer">
                <div className="inquiry-contact">
                  <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                  <a href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`}>{inquiry.phone}</a>
                </div>
                <label>Update status
                  <select value={inquiry.status} onChange={(event) => updateStatus(inquiry._id, event.target.value)}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    try {
      const result = await adminRequest(`/reviews?${params.toString()}`);
      setReviews(result.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  async function updateReviewStatus(id, status) {
    setError("");
    try {
      await adminRequest(`/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadReviews();
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Traveller reviews</h2><p>Review feedback and trip memories. Only approved stories appear publicly.</p></div>
        <span className="admin-count">{reviews.length}{reviews.length === 200 ? "+" : ""} shown</span>
      </div>
      <label className="admin-review-filter">Review status
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="pending">Pending review</option>
          <option value="approved">Approved / public</option>
          <option value="rejected">Rejected</option>
          <option value="">All reviews</option>
        </select>
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading traveller reviews...</p> : reviews.length === 0 ? (
        <p className="admin-empty">No reviews match this status.</p>
      ) : (
        <div className="inquiry-list">
          {reviews.map((review) => (
            <article className="inquiry-card" key={review._id}>
              <div className="inquiry-card-heading">
                <div>
                  <h3>{review.displayName}</h3>
                  <span className={`status-pill status-${review.status}`}>{review.status}</span>
                </div>
                <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleString()}</time>
              </div>
              <p className="admin-review-trip">{review.tripName}{review.package?.title ? ` · ${review.package.title}` : ""}</p>
              <p className="review-stars admin-stars" aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
              </p>
              <div className="admin-review-copy">
                <p><b>Review</b><br />{review.review}</p>
                <p><b>Favourite memory</b><br />{review.memory}</p>
              </div>
              <div className="admin-card-actions">
                {review.status !== "approved" && (
                  <button className="admin-button admin-button-primary" type="button" onClick={() => updateReviewStatus(review._id, "approved")}>
                    Approve and publish
                  </button>
                )}
                {review.status !== "pending" && (
                  <button className="admin-button" type="button" onClick={() => updateReviewStatus(review._id, "pending")}>
                    Return to pending
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button className="admin-button admin-button-danger" type="button" onClick={() => updateReviewStatus(review._id, "rejected")}>
                    Reject
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PackageEditor({ item, onCancel, onSaved }) {
  const [form, setForm] = useState(item
    ? {
      ...item,
      destination: item.destination || item.title,
      plans: item.plans?.length ? item.plans : [{
        ...blankPlan(item.plan || "Standard"),
        title: item.title,
        description: item.description,
        duration: item.duration,
        stayType: item.stayType,
        itinerary: item.itinerary || [],
        price: item.price,
        maxGroupSize: item.maxGroupSize,
      }],
      seasonalLabel: item.seasonalLabel || "",
    }
    : packageBlank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePlan(index, field, value) {
    update("plans", form.plans.map((plan, planIndex) =>
      planIndex === index ? { ...plan, [field]: value } : plan,
    ));
  }

  function updatePlanItinerary(index, updateDays) {
    updatePlan(index, "itinerary", updateDays(form.plans[index].itinerary));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const data = {
      ...form,
      sortOrder: Number(form.sortOrder),
      plans: form.plans.map((plan) => ({
        ...plan,
        price: Number(plan.price),
        maxGroupSize: Number(plan.maxGroupSize),
        itinerary: plan.itinerary.map((day, index) => ({ ...day, day: index + 1 })),
      })),
    };
    try {
      const result = await adminRequest(item ? `/packages/${item._id}` : "/packages", {
        method: item ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      onSaved(result.data);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card" onSubmit={handleSubmit}>
      <div className="admin-panel-heading">
        <div><h3>{item ? "Edit destination package" : "Add a destination package"}</h3><p>Create the destination once, then add its pricing plans and itineraries below.</p></div>
      </div>
      <div className="admin-form-grid">
        <label>Region<input value={form.region} onChange={(event) => update("region", event.target.value)} minLength="2" maxLength="80" required /></label>
        <label>Destination name<input value={form.destination} onChange={(event) => update("destination", event.target.value)} minLength="2" maxLength="120" placeholder="e.g. Manali & Kasol" required /></label>
        <label className="admin-span-2">Destination summary<textarea value={form.description} onChange={(event) => update("description", event.target.value)} minLength="10" maxLength="1200" rows="3" required /></label>
        <label className="admin-span-2">Photo URL (HTTPS)<input type="url" value={form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} maxLength="2048" placeholder="https://..." required /></label>
        <label>Image description for accessibility<input value={form.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} maxLength="240" required /></label>
        <label>Landmark caption<input value={form.imageCaption} onChange={(event) => update("imageCaption", event.target.value)} maxLength="120" placeholder="Hadimba Devi Temple, Manali" required /></label>
        <label>Photographer / creator<input value={form.imageCredit} onChange={(event) => update("imageCredit", event.target.value)} maxLength="120" required /></label>
        <label>Photo source page (HTTPS)<input type="url" value={form.imageSourceUrl} onChange={(event) => update("imageSourceUrl", event.target.value)} maxLength="2048" placeholder="https://..." required /></label>
        <label>Image license<input value={form.imageLicense} onChange={(event) => update("imageLicense", event.target.value)} maxLength="80" required /></label>
        <label>License URL (HTTPS)<input type="url" value={form.imageLicenseUrl} onChange={(event) => update("imageLicenseUrl", event.target.value)} maxLength="2048" required /></label>
        <p className="admin-form-note admin-span-2">Use a direct image URL for a photo you own or have permission to use. Pinterest pins usually link to a page rather than a reusable image. Photo credit and license are displayed as text; no photo-source website links appear on the public package.</p>
        <div className="admin-plans-editor admin-span-2">
          <div className="admin-panel-heading">
            <div><h4>Pricing plans</h4><p>Add one or more tiers. Each plan can have its own price, stay, duration, and itinerary.</p></div>
          </div>
          {form.plans.map((plan, planIndex) => (
            <section className="admin-plan-editor" key={`plan-${plan.plan}`}>
              <div className="admin-itinerary-day-heading">
                <h5>{plan.plan} plan</h5>
                <button
                  className="admin-button admin-button-danger"
                  type="button"
                  disabled={form.plans.length <= 1}
                  onClick={() => update("plans", form.plans.filter((_, index) => index !== planIndex))}
                >
                  Remove plan
                </button>
              </div>
              <div className="admin-form-grid">
                <label>Plan tier
                  <select value={plan.plan} onChange={(event) => updatePlan(planIndex, "plan", event.target.value)}>
                    {packagePlanTiers.map((tier) => (
                      <option
                        key={tier}
                        value={tier}
                        disabled={form.plans.some((otherPlan, index) => index !== planIndex && otherPlan.plan === tier)}
                      >
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Plan title<input value={plan.title} onChange={(event) => updatePlan(planIndex, "title", event.target.value)} minLength="3" maxLength="160" placeholder={`${form.destination || "Destination"} — ${plan.plan}`} required /></label>
                <label className="admin-span-2">Plan details<textarea value={plan.description} onChange={(event) => updatePlan(planIndex, "description", event.target.value)} minLength="10" maxLength="1200" rows="3" required /></label>
                <label>Duration<input value={plan.duration} onChange={(event) => updatePlan(planIndex, "duration", event.target.value)} maxLength="80" required /></label>
                <label>Stay type<input value={plan.stayType} onChange={(event) => updatePlan(planIndex, "stayType", event.target.value)} maxLength="100" required /></label>
                <label>Price per person (₹)<input type="number" min="1" max="1000000" step="1" value={plan.price} onChange={(event) => updatePlan(planIndex, "price", event.target.value)} required /></label>
                <label>Maximum group size<input type="number" min="1" max="12" step="1" value={plan.maxGroupSize} onChange={(event) => updatePlan(planIndex, "maxGroupSize", event.target.value)} required /></label>
              </div>
              <div className="admin-itinerary-editor">
                <div className="admin-panel-heading">
                  <div><h4>{plan.plan} itinerary</h4><p>These are the itinerary details shown when travellers compare plans.</p></div>
                </div>
                {plan.itinerary.map((day, dayIndex) => (
                  <div className="admin-itinerary-day" key={`${plan.plan}-day-${dayIndex}`}>
                    <div className="admin-itinerary-day-heading">
                      <h5>Day {dayIndex + 1}</h5>
                      <button
                        className="admin-button admin-button-danger"
                        type="button"
                        disabled={plan.itinerary.length <= 1}
                        onClick={() => updatePlanItinerary(planIndex, (days) => days.filter((_, index) => index !== dayIndex))}
                      >
                        Remove day
                      </button>
                    </div>
                    <label>Day title<input value={day.title} onChange={(event) => updatePlanItinerary(planIndex, (days) => days.map((entry, index) => index === dayIndex ? { ...entry, title: event.target.value } : entry))} maxLength="120" placeholder={`Day ${dayIndex + 1}`} required /></label>
                    <label>Day details<textarea value={day.description} onChange={(event) => updatePlanItinerary(planIndex, (days) => days.map((entry, index) => index === dayIndex ? { ...entry, description: event.target.value } : entry))} maxLength="1000" rows="3" required /></label>
                  </div>
                ))}
                <button
                  className="admin-button"
                  type="button"
                  disabled={plan.itinerary.length >= 14}
                  onClick={() => updatePlanItinerary(planIndex, (days) => [...days, { day: days.length + 1, title: "", description: "" }])}
                >
                  Add itinerary day
                </button>
              </div>
            </section>
          ))}
          <button
            className="admin-button"
            type="button"
            disabled={form.plans.length >= packagePlanTiers.length}
            onClick={() => {
              const nextTier = packagePlanTiers.find((tier) => !form.plans.some((plan) => plan.plan === tier));
              if (nextTier) update("plans", [...form.plans, blankPlan(nextTier)]);
            }}
          >
            Add another plan
          </button>
        </div>
        <label>Display order<input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} /></label>
        <label>Seasonal photo label (optional)<input value={form.seasonalLabel} onChange={(event) => update("seasonalLabel", event.target.value)} maxLength="32" placeholder="Trending this season" /></label>
        <p className="admin-form-note admin-span-2">Leave blank to hide the label. When set, it appears over the package photo on the homepage.</p>
        <label className="admin-checkbox"><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /> Published on homepage</label>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save package"}</button>
        <button className="admin-button" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PackagesPanel() {
  const [packages, setPackages] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");

  async function loadPackages() {
    try {
      const result = await adminRequest("/packages");
      setPackages(result.data);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => { loadPackages(); }, []);

  async function unpublish(item) {
    if (!window.confirm(`Unpublish "${item.destination}" from the public homepage?`)) return;
    try {
      await adminRequest(`/packages/${item._id}`, { method: "DELETE" });
      await loadPackages();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function saved() {
    setEditing(undefined);
    await loadPackages();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Tour packages</h2><p>Manage each destination once, with its pricing plans and itineraries nested inside.</p></div>
        <button className="admin-button admin-button-primary" type="button" onClick={() => setEditing(null)}>Add destination package</button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {editing !== undefined && <PackageEditor item={editing} onCancel={() => setEditing(undefined)} onSaved={saved} />}
      {packages.length === 0 ? <p className="admin-empty">No packages found.</p> : (
        <div className="admin-package-list">
          {packages.map((item) => (
            <article className="admin-package-card" key={item._id}>
              <div><span className={`status-pill ${item.active ? "status-published" : "status-closed"}`}>{item.active ? "Published" : "Unpublished"}</span><h3>{item.destination}</h3><p>{item.region} · {item.plans.map((plan) => `${plan.plan}: ₹${plan.price.toLocaleString("en-IN")}`).join(" · ")}</p></div>
              <div className="admin-card-actions">
                <button className="admin-button" type="button" onClick={() => setEditing(item)}>Edit</button>
                {item.active && <button className="admin-button admin-button-danger" type="button" onClick={() => unpublish(item)}>Unpublish</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HomePagePanel() {
  const [content, setContent] = useState(defaultHomepage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    adminRequest("/homepage")
      .then((result) => setContent(result.data || defaultHomepage))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setContent((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  function updateArrayItem(field, index, key, value) {
    const items = content[field].map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    );
    update(field, items);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const data = Object.fromEntries(homepageKeys.map((key) => [key, content[key]]));
    data.offerPrice = Number(data.offerPrice);
    try {
      const result = await adminRequest("/homepage", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setContent(result.data);
      setNotice("Homepage changes saved and published.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-muted">Loading homepage content...</p>;

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Homepage content</h2><p>Edit site text, stats, reviews, planning steps, and contact information.</p></div>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <form className="admin-home-form" onSubmit={handleSubmit}>
        <section className="admin-form-card">
          <h3>Brand, hero, and packages</h3>
          <div className="admin-form-grid">
            {homepageFields.slice(0, 7).map(([field, label]) => (
              <label key={field} className={["heroTitle", "heroDescription", "packagesDescription"].includes(field) ? "admin-span-2" : ""}>
                {label}
                {["heroTitle", "heroDescription", "packagesDescription"].includes(field)
                  ? <textarea rows={field === "heroDescription" ? 3 : 2} maxLength={field === "heroDescription" ? 1000 : 500} value={content[field]} onChange={(event) => update(field, event.target.value)} required />
                  : <input maxLength={field === "brandName" ? 80 : 120} value={content[field]} onChange={(event) => update(field, event.target.value)} required />}
              </label>
            ))}
          </div>
          <div className="admin-array-block">
            <h4>Hero statistics</h4>
            {content.heroStats.map((stat, index) => (
              <div className="admin-form-grid admin-array-row" key={`stat-${index}`}>
                <label>Statistic<input value={stat.value} maxLength="30" onChange={(event) => updateArrayItem("heroStats", index, "value", event.target.value)} required /></label>
                <label>Label<input value={stat.label} maxLength="80" onChange={(event) => updateArrayItem("heroStats", index, "label", event.target.value)} required /></label>
                <button className="admin-button admin-button-danger" type="button" onClick={() => update("heroStats", content.heroStats.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
            <button className="admin-button" type="button" disabled={content.heroStats.length >= 5} onClick={() => update("heroStats", [...content.heroStats, { value: "", label: "" }])}>Add statistic</button>
          </div>
        </section>

        <section className="admin-form-card">
          <h3>Why Travel Khor</h3>
          <div className="admin-form-grid">
            {homepageFields.slice(7, 11).map(([field, label]) => (
              <label key={field} className={field === "whyDescription" || field === "offerDescription" ? "admin-span-2" : ""}>
                {label}
                {field === "whyDescription" || field === "offerDescription"
                  ? <textarea rows="3" maxLength={field === "whyDescription" ? 1000 : 300} value={content[field]} onChange={(event) => update(field, event.target.value)} required />
                  : <input type={field === "offerPrice" ? "number" : "text"} min={field === "offerPrice" ? "1" : undefined} max={field === "offerPrice" ? "1000000" : undefined} value={content[field]} onChange={(event) => update(field, event.target.value)} required />}
              </label>
            ))}
          </div>
          <div className="admin-array-block">
            <h4>Planning steps</h4>
            {content.planningSteps.map((step, index) => (
              <div className="admin-inline-row" key={`step-${index}`}>
                <label>Step {index + 1}<input value={step} maxLength="200" onChange={(event) => update("planningSteps", content.planningSteps.map((item, i) => i === index ? event.target.value : item))} required /></label>
                <button className="admin-button admin-button-danger" type="button" onClick={() => update("planningSteps", content.planningSteps.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
            <button className="admin-button" type="button" disabled={content.planningSteps.length >= 5} onClick={() => update("planningSteps", [...content.planningSteps, ""])}>Add step</button>
          </div>
          <div className="admin-array-block">
            <h4>Value points</h4>
            {content.values.map((value, index) => (
              <div className="admin-form-card admin-nested-card" key={`value-${index}`}>
                <div className="admin-form-grid">
                  <label>Title<input value={value.title} maxLength="100" onChange={(event) => updateArrayItem("values", index, "title", event.target.value)} required /></label>
                  <label>Copy<textarea rows="2" maxLength="500" value={value.copy} onChange={(event) => updateArrayItem("values", index, "copy", event.target.value)} required /></label>
                </div>
                <button className="admin-button admin-button-danger" type="button" onClick={() => update("values", content.values.filter((_, i) => i !== index))}>Remove value point</button>
              </div>
            ))}
            <button className="admin-button" type="button" disabled={content.values.length >= 8} onClick={() => update("values", [...content.values, { title: "", copy: "" }])}>Add value point</button>
          </div>
        </section>

        <section className="admin-form-card">
          <div className="admin-form-grid">
            <label>Reviews heading<input value={content.testimonialsHeading} maxLength="120" onChange={(event) => update("testimonialsHeading", event.target.value)} required /></label>
            <label>Call-to-action text<input value={content.ctaHeading} maxLength="180" onChange={(event) => update("ctaHeading", event.target.value)} required /></label>
          </div>
          <div className="admin-array-block">
            <h4>Testimonials</h4>
            {content.testimonials.map((testimonial, index) => (
              <div className="admin-form-card admin-nested-card" key={`testimonial-${index}`}>
                <div className="admin-form-grid">
                  <label>Name<input value={testimonial.name} maxLength="80" onChange={(event) => updateArrayItem("testimonials", index, "name", event.target.value)} required /></label>
                  <label>Trip<input value={testimonial.trip} maxLength="120" onChange={(event) => updateArrayItem("testimonials", index, "trip", event.target.value)} required /></label>
                  <label className="admin-span-2">Quote<textarea rows="3" maxLength="1000" value={testimonial.quote} onChange={(event) => updateArrayItem("testimonials", index, "quote", event.target.value)} required /></label>
                </div>
                <button className="admin-button admin-button-danger" type="button" onClick={() => update("testimonials", content.testimonials.filter((_, i) => i !== index))}>Remove testimonial</button>
              </div>
            ))}
            <button className="admin-button" type="button" disabled={content.testimonials.length >= 12} onClick={() => update("testimonials", [...content.testimonials, { quote: "", name: "", trip: "" }])}>Add testimonial</button>
          </div>
        </section>

        <section className="admin-form-card">
          <h3>Footer and contact</h3>
          <div className="admin-form-grid">
            {homepageFields.slice(13).map(([field, label]) => (
              <label key={field} className={field === "footerAbout" ? "admin-span-2" : ""}>{label}
                {field === "footerAbout"
                  ? <textarea rows="2" maxLength="500" value={content[field]} onChange={(event) => update(field, event.target.value)} required />
                  : <input type={field === "contactEmail" ? "email" : "text"} maxLength="254" value={content[field]} onChange={(event) => update(field, event.target.value)} required />}
              </label>
            ))}
          </div>
        </section>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {notice && <p className="admin-success" role="status">{notice}</p>}
        <button className="admin-button admin-button-primary admin-save-home" type="submit" disabled={saving}>
          {saving ? "Publishing..." : "Save and publish homepage"}
        </button>
      </form>
    </section>
  );
}

function FollowUpReminderDialog({ inquiries, error, savingId, onClose, onMarkComplete }) {
  return (
    <div className="dialog-backdrop admin-reminder-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="follow-up-reminder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-reminder-title"
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close follow-up reminders">×</button>
        <p className="eyebrow">Admin reminders</p>
        <h2 id="follow-up-reminder-title">Follow-ups due</h2>
        <p className="follow-up-reminder-intro">These travellers are waiting to hear from you.</p>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="follow-up-reminder-list">
          {inquiries.map((inquiry) => (
            <article className="follow-up-reminder-item" key={inquiry._id}>
              <div>
                <h3>{inquiry.name}</h3>
                <p>{inquiry.destination}{inquiry.selectedPlan ? ` — ${inquiry.selectedPlan} plan` : ""}</p>
                <p><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> · {inquiry.phone}</p>
                <p><b>Follow-up:</b> {formatFollowUpDate(inquiry.followUpDate)}</p>
              </div>
              <button
                className="admin-button admin-button-primary"
                type="button"
                disabled={Boolean(savingId)}
                onClick={() => onMarkComplete(inquiry)}
              >
                {savingId === inquiry._id ? "Saving..." : "Mark complete"}
              </button>
            </article>
          ))}
        </div>
        <button className="admin-button follow-up-reminder-close" type="button" onClick={onClose}>
          Remind me later
        </button>
      </section>
    </div>
  );
}

function AdminDashboard({ admin, onLogout }) {
  const [tab, setTab] = useState("inquiries");
  const [error, setError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [showFollowUpReminder, setShowFollowUpReminder] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [savingFollowUpId, setSavingFollowUpId] = useState("");
  const [inquiryRefreshKey, setInquiryRefreshKey] = useState(0);

  async function loadFollowUps(openWhenAvailable = true) {
    setFollowUpError("");
    try {
      const result = await adminRequest(`/inquiries/follow-ups?through=${getLocalDateString()}`);
      setFollowUps(result.data);
      setShowFollowUpReminder(openWhenAvailable && result.data.length > 0);
    } catch (loadError) {
      setFollowUpError(loadError.message);
    }
  }

  useEffect(() => {
    let lastDate = getLocalDateString();
    const timer = window.setInterval(() => {
      const currentDate = getLocalDateString();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        loadFollowUps();
      }
    }, 60_000);
    loadFollowUps();
    return () => window.clearInterval(timer);
  }, []);

  async function markFollowUpComplete(inquiry) {
    setFollowUpError("");
    setSavingFollowUpId(inquiry._id);
    try {
      await adminRequest(`/inquiries/${inquiry._id}`, {
        method: "PATCH",
        body: JSON.stringify({ followUpCompleted: true }),
      });
      const remainingFollowUps = followUps.filter((item) => item._id !== inquiry._id);
      setFollowUps(remainingFollowUps);
      setShowFollowUpReminder(remainingFollowUps.length > 0);
      setInquiryRefreshKey((current) => current + 1);
    } catch (saveError) {
      setFollowUpError(saveError.message);
    } finally {
      setSavingFollowUpId("");
    }
  }

  async function logout() {
    try {
      await adminRequest("/auth/logout", { method: "POST" });
      onLogout();
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href="/">Travel Khor<span>.</span><small>Admin</small></a>
        <div className="admin-account"><span>{admin.email}</span><button className="admin-button" type="button" onClick={logout}>Sign out</button></div>
      </header>
      <main className="admin-main">
        <div className="admin-welcome"><p className="eyebrow">Management dashboard</p><h1>Good to see you.</h1><p>Manage trip requests, package listings, and the public homepage.</p></div>
        <nav className="admin-tabs" aria-label="Admin sections">
          {[["inquiries", "Inquiries"], ["reviews", "Reviews"], ["packages", "Packages"], ["homepage", "Homepage"]].map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? "is-active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {followUpError && !showFollowUpReminder && <p className="admin-error" role="alert">{followUpError}</p>}
        {tab === "inquiries" && (
          <InquiryPanel
            onFollowUpsChanged={() => loadFollowUps()}
            refreshKey={inquiryRefreshKey}
          />
        )}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "packages" && <PackagesPanel />}
        {tab === "homepage" && <HomePagePanel />}
      </main>
      {showFollowUpReminder && (
        <FollowUpReminderDialog
          inquiries={followUps}
          error={followUpError}
          savingId={savingFollowUpId}
          onClose={() => setShowFollowUpReminder(false)}
          onMarkComplete={markFollowUpComplete}
        />
      )}
    </div>
  );
}

export default function AdminApp() {
  const [auth, setAuth] = useState({ loading: true, admin: null });
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    adminRequest("/auth/me")
      .then((result) => setAuth({ loading: false, admin: result.data }))
      .catch((error) => {
        setAuth({ loading: false, admin: null });
        if (!error.message.includes("Sign in") && !error.message.includes("expired")) {
          setAuthError(error.message);
        }
      });
  }, []);

  if (auth.loading) {
    return <main className="admin-login-page"><p className="admin-muted">Checking admin session...</p></main>;
  }

  if (!auth.admin) {
    return (
      <>
        {authError && <div className="admin-auth-alert" role="alert">{authError}</div>}
        <Login onLogin={(admin) => { setAuthError(""); setAuth({ loading: false, admin }); }} />
      </>
    );
  }

  return <AdminDashboard admin={auth.admin} onLogout={() => setAuth({ loading: false, admin: null })} />;
}
