import { useEffect, useRef, useState } from "react";
import { createInquiry, getHomepageContent, getPackages, getPublicReviews } from "./api.js";
import { defaultHomepage } from "../../shared/homepage.js";

const whatsappAdminNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918070020918";

const valueIcons = [
  <path key="price" d="M15 3 26 9v12l-11 6L4 21V9z" />,
  <g key="time"><circle cx="15" cy="15" r="11" /><path d="M15 8v7l5 3" /></g>,
  <path key="stay" d="M6 24V12l9-7 9 7v12z" />,
  <path key="group" d="M5 15h20m-7-7 7 7-7 7" />,
];

const heroPhotos = [
  {
    place: "The Himalayas",
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=78",
    position: "center 54%",
  },
  {
    place: "Kedarnath Temple",
    src: "https://i.pinimg.com/736x/9a/c6/84/9ac684a41cd2dbb26d92ff3f89c20246.jpg",
    position: "center 52%",
    credit: "Raviarts",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    place: "The Taj Mahal",
    src: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1800&q=78",
    position: "center 52%",
  },
  {
    place: "Kerala backwaters",
    src: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1800&q=78",
    position: "center 56%",
  },
  {
    place: "Goa coast",
    src: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1800&q=78",
    position: "center 55%",
  },
  {
    place: "Kollam-Paravur Coastal Road, Kerala",
    src: "https://i.pinimg.com/736x/0e/c4/8d/0ec48d7c02278d0c79339fe550d6d6c5.jpg",
    position: "center 58%",
    credit: "Arunvrparavur",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    place: "Pangong Lake, Ladakh",
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Pangong_Lake_September.jpg/1920px-Pangong_Lake_September.jpg",
    position: "center 52%",
    credit: "HiranmoyPAC",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

function HeroSlideshow() {
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return undefined;

    const timer = window.setInterval(() => {
      setActivePhoto((current) => (current + 1) % heroPhotos.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="hero-slideshow" aria-hidden="true">
        {heroPhotos.map((photo, index) => (
          <img
            className={`hero-photo${index === activePhoto ? " is-active" : ""}`}
            key={photo.place}
            src={photo.src}
            alt=""
            style={{ objectPosition: photo.position }}
          />
        ))}
      </div>
      {heroPhotos[activePhoto].credit && (
        <p className="hero-photo-credit">
          {heroPhotos[activePhoto].place} · Photo: {heroPhotos[activePhoto].credit} ·{" "}
          <a href={heroPhotos[activePhoto].licenseUrl} target="_blank" rel="noreferrer">
            {heroPhotos[activePhoto].license}
          </a>
        </p>
      )}
    </>
  );
}

function PackagePhoto({ item }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.imageUrl]);

  return (
    <figure className={`package-photo${imageFailed ? " image-failed" : ""}`}>
      <div className="package-photo-image">
        {imageFailed ? (
          <div className="package-photo-fallback" role="img" aria-label={item.imageAlt}>
            <span>{item.region}</span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        )}
        {item.seasonalLabel && <span className="package-seasonal-label">{item.seasonalLabel}</span>}
        <div className="package-photo-caption">
          <span>{item.imageCaption}</span>
          <small>Photo: {item.imageCredit} · {item.imageLicense}</small>
        </div>
      </div>
    </figure>
  );
}

function TripPlansDialog({ items, onClose, onInquiry }) {
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function downloadItinerary(item) {
    setDownloadError("");
    setIsDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      const destination = item.destination || items[0].destination || items[0].title;
      const plan = item.plan || "Standard";
      const filename = `${destination}-${plan}-itinerary`
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const cleanText = (value) => String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const colors = {
        ink: [28, 43, 57],
        moss: [75, 107, 79],
        gold: [217, 164, 65],
        clay: [143, 74, 42],
        muted: [91, 103, 111],
        line: [218, 222, 214],
        paper: [248, 249, 246],
        white: [255, 255, 255],
      };
      let y = 0;

      function drawPageHeader() {
        pdf.setFillColor(...colors.ink);
        pdf.rect(0, 0, pageWidth, 29, "F");
        pdf.setFillColor(...colors.gold);
        pdf.rect(0, 29, pageWidth, 1.5, "F");
        pdf.setTextColor(...colors.gold);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("TRAVEL KHOR", margin, 13);
        pdf.setTextColor(...colors.white);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("YOUR JOURNEY, THOUGHTFULLY PLANNED", margin, 21);
        y = 40;
      }

      function ensureSpace(height) {
        if (y + height > pageHeight - 20) {
          pdf.addPage();
          drawPageHeader();
        }
      }

      drawPageHeader();
      pdf.setTextColor(...colors.ink);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(23);
      pdf.text(cleanText(destination), margin, y);
      y += 9;
      pdf.setTextColor(...colors.moss);
      pdf.setFontSize(10);
      pdf.text(`${cleanText(plan).toUpperCase()} PLAN`, margin, y);
      y += 6;
      pdf.setTextColor(...colors.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(cleanText(item.title), margin, y);
      y += 12;

      const details = [
        ["PRICE / PERSON", `INR ${Number(item.price || 0).toLocaleString("en-IN")}`],
        ["DURATION", item.duration],
        ["STAY", item.stayType],
        ["GROUP SIZE", `Up to ${item.maxGroupSize} travellers`],
      ];
      const gap = 3;
      const cardWidth = (contentWidth - gap * 3) / 4;
      details.forEach(([label, value], index) => {
        const x = margin + index * (cardWidth + gap);
        pdf.setFillColor(...colors.paper);
        pdf.setDrawColor(...colors.line);
        pdf.roundedRect(x, y, cardWidth, 21, 2, 2, "FD");
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.text(cleanText(label), x + 3, y + 6);
        pdf.setTextColor(...colors.ink);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        const valueLines = pdf.splitTextToSize(cleanText(value), cardWidth - 6);
        pdf.text(valueLines.slice(0, 2), x + 3, y + 12);
      });
      y += 31;

      pdf.setTextColor(...colors.ink);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Your itinerary", margin, y);
      y += 8;

      const itinerary = item.itinerary || [];
      if (itinerary.length === 0) {
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text("The detailed itinerary is being finalized. Contact us for the latest plan.", margin, y);
        y += 8;
      } else {
        itinerary.forEach((day, index) => {
          const dayLabel = `DAY ${cleanText(day.day || index + 1)}`;
          const titleLines = pdf.splitTextToSize(cleanText(day.title), contentWidth - 27);
          const descriptionLines = pdf.splitTextToSize(cleanText(day.description), contentWidth - 10);
          const blockHeight = 12 + titleLines.length * 5 + descriptionLines.length * 4.5;
          ensureSpace(blockHeight + 4);

          pdf.setFillColor(...colors.paper);
          pdf.setDrawColor(...colors.line);
          pdf.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, "FD");
          pdf.setFillColor(...colors.moss);
          pdf.roundedRect(margin + 4, y + 4, 20, 7, 1.5, 1.5, "F");
          pdf.setTextColor(...colors.white);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.text(dayLabel, margin + 6, y + 8.7);
          pdf.setTextColor(...colors.ink);
          pdf.setFontSize(10);
          pdf.text(titleLines, margin + 28, y + 9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.text(descriptionLines, margin + 5, y + 15 + titleLines.length * 5);
          y += blockHeight + 4;
        });
      }

      const noteLines = pdf.splitTextToSize(
        "Schedules and outdoor activities may change due to weather, safety, or local operating conditions.",
        contentWidth,
      );
      ensureSpace(noteLines.length * 4 + 8);
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.7);
      pdf.line(margin, y, margin + 12, y);
      y += 6;
      pdf.setTextColor(...colors.muted);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.text(noteLines, margin, y);

      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(...colors.line);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text("TRAVEL KHOR  |  YOUR JOURNEY, YOUR WAY", margin, pageHeight - 8);
        pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }
      pdf.save(`${filename || "trip-itinerary"}.pdf`);
    } catch (error) {
      console.error("Unable to generate itinerary PDF:", error);
      setDownloadError("We couldn't create the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="trip-dialog trip-plans-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close trip details">×</button>
        <div className="trip-dialog-image">
          <img src={items[0].imageUrl} alt={items[0].imageAlt} />
          <span>{items[0].imageCaption}</span>
        </div>
        <div className="trip-dialog-content">
          <p className="eyebrow">{items[0].region} · {items.length} {items.length === 1 ? "plan" : "plans"}</p>
          <h2 id="trip-title">{items[0].destination || items[0].title}</h2>
          {selectedItinerary ? (
            <section className="itinerary-view">
              <button className="itinerary-back" type="button" onClick={() => setSelectedItinerary(null)}>
                ← Back to plans
              </button>
              <div className="itinerary-view-heading">
                <div>
                  <p className="trip-plan-tier">{selectedItinerary.plan || "Standard"} plan itinerary</p>
                  <h3>{selectedItinerary.title}</h3>
                  <p className="trip-dialog-description">{selectedItinerary.duration} · {selectedItinerary.stayType}</p>
                </div>
                <button className="btn-primary itinerary-download" type="button" onClick={() => downloadItinerary(selectedItinerary)} disabled={isDownloading}>
                  {isDownloading ? "Preparing PDF..." : "Download PDF"}
                </button>
              </div>
              {downloadError && <p className="itinerary-download-error" role="alert">{downloadError}</p>}
              {selectedItinerary.itinerary?.length ? (
                <ol className="itinerary-full-list">
                  {selectedItinerary.itinerary.map((day, index) => (
                    <li key={`${selectedItinerary.planId || selectedItinerary.plan}-${day.day}-${day.title}`}>
                      <span>Day {day.day || index + 1}</span>
                      <div><h4>{day.title}</h4><p>{day.description}</p></div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="itinerary-pending">The detailed itinerary is being finalized. Contact us for the latest plan.</p>
              )}
              <p className="itinerary-note">Schedules and outdoor activities may change due to weather, safety, or local operating conditions.</p>
            </section>
          ) : (
            <>
              <p className="trip-dialog-description">Compare the essentials, open any itinerary separately, and choose the plan that suits you.</p>
              <div className="trip-plan-grid">
                {items.map((item) => (
                  <article className={`trip-plan-card trip-plan-${(item.plan || "Standard").toLowerCase()}`} key={item._id}>
                    <div className="trip-plan-card-heading">
                      <div>
                        <p className="trip-plan-tier">{item.plan || "Standard"} plan</p>
                        <h3>{item.title}</h3>
                      </div>
                    </div>
                    <div className="trip-plan-price">₹{item.price.toLocaleString("en-IN")} <span>/ person</span></div>
                    <div className="trip-plan-facts">
                      <span>{item.duration}</span>
                      <span>{item.stayType}</span>
                      <span>Up to {item.maxGroupSize} travellers</span>
                    </div>
                    <p className="trip-plan-description">{item.description}</p>
                    <button className="itinerary-link" type="button" onClick={() => setSelectedItinerary(item)}>
                      View {item.plan || "Standard"} itinerary <span aria-hidden="true">→</span>
                    </button>
                    <button className="btn-primary trip-inquiry-button" type="button" onClick={() => onInquiry(item)}>
                      Choose plan
                    </button>
                    <a
                      className="trip-whatsapp-button"
                      href={`https://wa.me/${whatsappAdminNumber}?text=${encodeURIComponent(
                        `Hi, I'm interested in the ${item.plan || "Standard"} plan for ${items[0].destination || items[0].title} (₹${item.price.toLocaleString("en-IN")} per person). Could you please share more details?`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Contact on WhatsApp
                    </a>
                  </article>
                ))}
              </div>
              <p className="trip-photo-credit">Photo: {items[0].imageCredit} · {items[0].imageLicense}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function CustomTripPlanner({ onContinue }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onContinue(Object.fromEntries(formData.entries()));
  }

  return (
    <div className="custom-trip-card">
      <p className="eyebrow">Your trip, your way</p>
      <h3>Build a trip around what matters to you.</h3>
      <p className="custom-trip-intro">Choose where you want to go, what you want to spend, and the places you don’t want to miss.</p>
      <form className="custom-trip-form" onSubmit={handleSubmit}>
        <label>
          Where would you like to go?
          <input name="destination" minLength="2" maxLength="120" placeholder="e.g. Manali" required />
        </label>
        <div className="form-row">
          <label>
            Budget per person (₹)
            <input name="budget" type="number" min="1" max="1000000" inputMode="numeric" placeholder="e.g. 10000" required />
          </label>
          <label>
            Travellers
            <input name="groupSize" type="number" min="1" max="12" defaultValue="2" required />
          </label>
        </div>
        <label>
          Places you’d like to visit
          <input name="additionalLocation" maxLength="120" placeholder="e.g. Solang Valley, Old Manali" />
        </label>
        <button className="btn-primary" type="submit">Continue planning</button>
      </form>
      <p className="custom-trip-note">Next, tell us your travel date and how to reach you.</p>
    </div>
  );
}

function InquiryDialog({ packageItem, initialDetails, onClose }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const formData = new FormData(event.currentTarget);
    const inquiry = Object.fromEntries(formData.entries());
    inquiry.groupSize = Number(inquiry.groupSize);
    if (packageItem) {
      inquiry.package = packageItem.packageId || packageItem._id;
      inquiry.destination = packageItem.destination || packageItem.title;
      inquiry.selectedPlan = packageItem.plan || "";
    }
    if (initialDetails.isCustomApproach) inquiry.isCustomApproach = true;

    try {
      const result = await createInquiry(inquiry);
      setConfirmation(result.message);
      setStatus("success");
    } catch (submitError) {
      setError(submitError.message);
      setStatus("idle");
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="inquiry-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close inquiry form">
          ×
        </button>
        {status === "success" ? (
          <div className="success-state" role="status">
            <p className="eyebrow">Request received</p>
            <h2 id="inquiry-title">Thanks for reaching out.</h2>
            <p>{confirmation}</p>
            <button className="btn-primary" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p className="eyebrow">{packageItem ? "Package enquiry" : "Start planning"}</p>
            <h2 id="inquiry-title">{packageItem ? `Check dates for ${packageItem.title}` : "Tell us about your trip"}</h2>
            <p className="dialog-intro">
              {packageItem
                ? "Tell us who is travelling and when. We’ll get back to you about this package."
                : "Share a few details and our team will get back to you with the next steps."}
            </p>
            <form className="inquiry-form" onSubmit={handleSubmit}>
              <label>
                Your name
                <input name="name" autoComplete="name" minLength="2" maxLength="80" required />
              </label>
              <div className="form-row">
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" maxLength="254" required />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" autoComplete="tel" minLength="7" maxLength="20" required />
                </label>
              </div>
              {packageItem ? (
                <>
                  <div className="form-row">
                    <label>
                      Preferred travel date
                      <input name="travelDate" type="date" min={new Date().toISOString().slice(0, 10)} required />
                    </label>
                    <label>
                      Number of travellers
                      <input name="groupSize" type="number" min="1" max="12" defaultValue="2" required />
                    </label>
                  </div>
                  <label>
                    Any other places you’d like to visit?
                    <input name="additionalLocation" maxLength="120" />
                  </label>
                  <label>
                    Anything else we should know?
                    <textarea name="message" rows="3" maxLength="1000" />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Destination or package
                    <input
                      name="destination"
                      minLength="2"
                      maxLength="120"
                      defaultValue={initialDetails.destination || ""}
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Preferred travel date
                      <input name="travelDate" type="date" min={new Date().toISOString().slice(0, 10)} required />
                    </label>
                    <label>
                      Travellers
                      <input name="groupSize" type="number" min="1" max="12" defaultValue={initialDetails.groupSize || "2"} required />
                    </label>
                  </div>
                  <label>
                    Places you’d like to visit
                    <input name="additionalLocation" maxLength="120" defaultValue={initialDetails.additionalLocation || ""} />
                  </label>
                  <label>
                    Budget per person (₹)
                    <input name="budget" type="number" min="1" max="1000000" inputMode="numeric" defaultValue={initialDetails.budget || ""} />
                  </label>
                  <label>
                    Anything else we should know?
                    <textarea name="message" rows="3" maxLength="1000" />
                  </label>
                </>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn-primary submit-button" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending..." : packageItem ? "Send package enquiry" : "Send trip inquiry"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function App() {
  const [packages, setPackages] = useState([]);
  const [travellerReviews, setTravellerReviews] = useState([]);
  const [content, setContent] = useState(defaultHomepage);
  const [packageError, setPackageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [inquiryDetails, setInquiryDetails] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packagePriceFilter, setPackagePriceFilter] = useState("all");
  const [packageRegionFilter, setPackageRegionFilter] = useState("all");
  const [packageSearch, setPackageSearch] = useState("");
  const packageCarouselRef = useRef(null);
  const [packageScrollPosition, setPackageScrollPosition] = useState({ canScrollBack: false, canScrollForward: false });

  useEffect(() => {
    let active = true;
    getPackages()
      .then((result) => {
        if (active) setPackages(result.data);
      })
      .catch((error) => {
        if (active) setPackageError(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    getHomepageContent()
      .then((result) => {
        if (active) setContent(result.data);
      })
      .catch((error) => {
        if (active) console.error("Could not load homepage content:", error);
      });
    getPublicReviews()
      .then((result) => {
        if (active) setTravellerReviews(result.data);
      })
      .catch((error) => {
        if (active) console.error("Could not load traveller reviews:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.title = `${content.brandName} — Budget-friendly tours`;
  }, [content.brandName]);

  function openInquiry(packageItem = null, initialDetails = {}) {
    setSelectedPackage(packageItem || {});
    setInquiryDetails(initialDetails);
    document.body.classList.add("dialog-open");
  }

  function closeInquiry() {
    setSelectedPackage(null);
    setInquiryDetails({});
    document.body.classList.remove("dialog-open");
  }

  function continueCustomTrip(details) {
    openInquiry(null, { ...details, isCustomApproach: true });
  }

  function openTrip(item) {
    setSelectedTrip(item);
    document.body.classList.add("dialog-open");
  }

  function closeTrip() {
    setSelectedTrip(null);
    document.body.classList.remove("dialog-open");
  }

  function inquireAboutTrip(item) {
    setSelectedTrip(null);
    setSelectedPackage(item);
    setInquiryDetails({});
    document.body.classList.add("dialog-open");
  }

  const inquiryPackage = selectedPackage?._id ? selectedPackage : null;
  const inquiryIsOpen = selectedPackage !== null;
  const packageRegions = [...new Set(packages.map((item) => item.region))];
  const groupedPackages = [...packages.reduce((groups, item) => {
    const destination = item.destination || item.title;
    const group = groups.get(destination) || [];
    group.push(item);
    groups.set(destination, group);
    return groups;
  }, new Map()).values()].map((items) =>
    items.sort((first, second) =>
      ["Standard", "Moderate", "Premium"].indexOf(first.plan || "Standard") -
      ["Standard", "Moderate", "Premium"].indexOf(second.plan || "Standard"),
    ),
  );
  const filteredTripGroups = groupedPackages.filter((items) => {
    const searchTerm = packageSearch.trim().toLocaleLowerCase();
    const matchesSearch = !searchTerm || items.some((item) =>
      [item.destination, item.title].some((place) =>
        place?.toLocaleLowerCase().includes(searchTerm),
      ),
    );
    const matchesRegion = packageRegionFilter === "all" || items.some((item) => item.region === packageRegionFilter);
    const matchesPrice = packagePriceFilter === "all" || items.some((item) =>
      packagePriceFilter === "under" ? item.price < 10000 : item.price >= 10000,
    );
    return matchesSearch && matchesRegion && matchesPrice;
  });

  useEffect(() => {
    const carousel = packageCarouselRef.current;
    if (!carousel) return undefined;

    function updateScrollPosition() {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      setPackageScrollPosition({
        canScrollBack: carousel.scrollLeft > 1,
        canScrollForward: maxScroll - carousel.scrollLeft > 1,
      });
    }

    carousel.scrollLeft = 0;
    updateScrollPosition();
    carousel.addEventListener("scroll", updateScrollPosition, { passive: true });
    window.addEventListener("resize", updateScrollPosition);
    return () => {
      carousel.removeEventListener("scroll", updateScrollPosition);
      window.removeEventListener("resize", updateScrollPosition);
    };
  }, [filteredTripGroups.length, packagePriceFilter, packageRegionFilter, packageSearch]);

  function scrollPackages(direction) {
    const carousel = packageCarouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * Math.max(carousel.clientWidth * 0.85, 300),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <>
      <header className="site-nav">
        <div className="nav-row wrap">
          <a href="#" className="logo" aria-label={`${content.brandName} home`}>{content.brandName}<span className="dot">.</span></a>
          <button
            className="nav-toggle"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="main-navigation"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>
          <nav className={`links${isMenuOpen ? " is-open" : ""}`} id="main-navigation">
            <a href="#packages" onClick={() => setIsMenuOpen(false)}>Packages</a>
            <a href="#why" onClick={() => setIsMenuOpen(false)}>Why us</a>
            <a href="#voices" onClick={() => setIsMenuOpen(false)}>Reviews</a>
            <a href="/feedback" onClick={() => setIsMenuOpen(false)}>Share your story</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </nav>
          <button className="nav-cta" type="button" onClick={() => openInquiry()}>Plan a trip</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <HeroSlideshow />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="hero-eyebrow">{content.heroEyebrow}</p>
              <h1>{content.heroTitle}</h1>
              <p className="lede">{content.heroDescription}</p>
              <div className="hero-actions">
                <a href="#packages" className="btn-primary">Browse packages</a>
                <a href="#why" className="btn-ghost">How it works</a>
              </div>
              <div className="hero-stats">
                {content.heroStats.map((stat) => (
                  <div className="stat" key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="values" aria-label="How we travel">
          <div className="wrap value-grid">
            {content.values.map((value, index) => (
              <article className="value-item" key={value.title}>
                <svg className="value-mark" viewBox="0 0 30 30" fill="none" aria-hidden="true">{valueIcons[index % valueIcons.length]}</svg>
                <h2>{value.title}</h2>
                <p>{value.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="packages" id="packages">
          <div className="wrap">
            <div className="section-head">
              <h2>{content.packagesHeading}</h2>
              <p>{content.packagesDescription}</p>
            </div>
            {isLoading && <p className="api-message" role="status">Loading current packages...</p>}
            {packageError && (
              <div className="api-error" role="alert">
                <p>{packageError}</p>
                <p>Start the API and MongoDB, then refresh to see available trips.</p>
              </div>
            )}
            {!isLoading && !packageError && packages.length === 0 && (
              <p className="api-message">There are no trips available right now. Send us an inquiry and we can plan a custom route.</p>
            )}
            {packages.length > 0 && (
              <div className="package-filters" aria-label="Filter packages">
                <label className="package-search">
                  <span>Search by place</span>
                  <input
                    type="search"
                    value={packageSearch}
                    onChange={(event) => setPackageSearch(event.target.value)}
                    placeholder="e.g. Kerala or Goa"
                  />
                </label>
                <div className="package-filter-group" role="group" aria-label="Filter by price">
                  {[
                    ["all", "All prices"],
                    ["under", "Under ₹10k"],
                    ["above", "₹10k and above"],
                  ].map(([value, label]) => (
                    <button
                      className="package-filter-chip"
                      key={value}
                      type="button"
                      aria-pressed={packagePriceFilter === value}
                      onClick={() => setPackagePriceFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="package-filter-group" role="group" aria-label="Filter by region">
                  <button
                    className="package-filter-chip"
                    type="button"
                    aria-pressed={packageRegionFilter === "all"}
                    onClick={() => setPackageRegionFilter("all")}
                  >
                    All regions
                  </button>
                  {packageRegions.map((region) => (
                    <button
                      className="package-filter-chip"
                      key={region}
                      type="button"
                      aria-pressed={packageRegionFilter === region}
                      onClick={() => setPackageRegionFilter(region)}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filteredTripGroups.length > 0 ? (
              <>
                <div className="package-carousel-controls" role="group" aria-label="Scroll packages">
                  <button
                    className="package-carousel-arrow"
                    type="button"
                    aria-label="Show previous packages"
                    disabled={!packageScrollPosition.canScrollBack}
                    onClick={() => scrollPackages(-1)}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    className="package-carousel-arrow"
                    type="button"
                    aria-label="Show next packages"
                    disabled={!packageScrollPosition.canScrollForward}
                    onClick={() => scrollPackages(1)}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div
                  className="package-grid"
                  id="package-carousel"
                  ref={packageCarouselRef}
                  role="region"
                  aria-label="Travel packages"
                  tabIndex={0}
                >
                  {filteredTripGroups.map((items) => {
                    const item = items[0];
                    const lowestPrice = Math.min(...items.map((plan) => plan.price));
                    return (
                      <article className="package-card" key={item._id}>
                        <PackagePhoto item={item} />
                        <div className="package-card-body">
                          <h3>{item.destination || item.title}</h3>
                          <p className="package-card-description">{item.description}</p>
                          <p className="package-card-meta">
                            <span>{items.length} {items.length === 1 ? "plan" : "plans"}</span>
                            <span>{item.duration}</span>
                            <span>Max {item.maxGroupSize} travellers</span>
                          </p>
                          <ul className="package-card-inclusions" aria-label="Included in this package">
                            {items.map((plan) => <li key={plan._id}>{plan.plan || "Standard"}</li>)}
                          </ul>
                          <button className="package-details-link" type="button" onClick={() => openTrip(items)}>
                            Compare plans and itineraries <span aria-hidden="true">→</span>
                          </button>
                          <div className="package-card-footer">
                            <div>
                              <strong>From ₹{lowestPrice.toLocaleString("en-IN")}</strong>
                              <span>per person</span>
                            </div>
                            <button className="btn-primary" type="button" onClick={() => openTrip(items)}>
                              View plans
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : packages.length > 0 ? (
              <p className="package-empty">No trips match your search and filters. Try another place or reset a filter.</p>
            ) : null}
          </div>
        </section>

        <section className="split" id="why">
          <div className="wrap split-grid">
            <div className="split-copy">
              <h2>{content.whyHeading}</h2>
              <p>{content.whyDescription}</p>
              <ol>
                {content.planningSteps.map((step, index) => (
                  <li key={step}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>
                ))}
              </ol>
            </div>
            <CustomTripPlanner onContinue={continueCustomTrip} />
          </div>
        </section>

        <section className="voices" id="voices">
          <div className="wrap">
            <div className="section-head"><h2>{content.testimonialsHeading}</h2></div>
            <div className="voice-grid">
              {content.testimonials.map((testimonial) => (
                <article className="voice" key={testimonial.name}>
                  <p className="quote">“{testimonial.quote}”</p>
                  <p className="who"><b>{testimonial.name}</b> — {testimonial.trip}</p>
                </article>
              ))}
              {travellerReviews.map((review) => (
                <article className="voice" key={review._id}>
                  <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="quote">“{review.review}”</p>
                  <p className="review-memory"><b>A favourite memory:</b> {review.memory}</p>
                  <p className="who"><b>{review.displayName}</b> — {review.tripName}</p>
                </article>
              ))}
            </div>
            <p className="share-review-link"><a href="/feedback">Been on a trip with us? Share your review and favourite memory →</a></p>
          </div>
        </section>

        <section className="cta-band">
          <div className="wrap">
            <h2>{content.ctaHeading}</h2>
            <button className="btn-primary" type="button" onClick={() => openInquiry()}>Start planning</button>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <p className="foot-logo">{content.brandName}</p>
              <p className="foot-about">{content.footerAbout}</p>
            </div>
            <div>
              <h2>Packages</h2>
              <ul>
                {[...new Set(packages.map((item) => item.region))].map((region) => (
                  <li key={region}><a href="#packages">{region}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Company</h2>
              <ul>
                <li><a href="#why">Why Travel Khor</a></li>
                <li><a href="#voices">Reviews</a></li>
                <li><a href="/feedback">Share your trip story</a></li>
                <li><button className="footer-link" type="button" onClick={() => openInquiry()}>Contact us</button></li>
                <li><a href="/admin">Admin sign in</a></li>
              </ul>
            </div>
            <div>
              <h2>Reach us</h2>
              <ul>
                <li><a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a></li>
                <li><a href={`tel:${content.contactPhone.replace(/[^\d+]/g, "")}`}>{content.contactPhone}</a></li>
                <li>{content.contactLocation}</li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} {content.brandName}</span>
            <span>{content.footerTagline}</span>
          </div>
        </div>
      </footer>
      {selectedTrip && (
        <TripPlansDialog
          items={selectedTrip}
          onClose={closeTrip}
          onInquiry={inquireAboutTrip}
        />
      )}
      {inquiryIsOpen && <InquiryDialog packageItem={inquiryPackage} initialDetails={inquiryDetails} onClose={closeInquiry} />}
    </>
  );
}

export default App;
