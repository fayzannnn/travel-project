const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      credentials: "include",
      ...options,
    });
  } catch {
    throw new Error("Cannot reach Travel Khor right now. Please try again shortly.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.");
  }
  return result;
}

export function getPackages() {
  return request("/packages");
}

export function getHomepageContent() {
  return request("/packages/homepage");
}

export function getPublicReviews() {
  return request("/reviews");
}

export function submitReview(review) {
  return request("/reviews", {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function createInquiry(inquiry) {
  return request("/inquiries", {
    method: "POST",
    body: JSON.stringify(inquiry),
  });
}

export function adminRequest(path, options = {}) {
  return request(`/admin${path}`, options);
}
