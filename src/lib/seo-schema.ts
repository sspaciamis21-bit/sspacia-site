import { seoConfig } from "@/config/seo";
import { BUSINESS, CENTRES, Centre, Room, fullAddress } from "@/config/centres";

const base = seoConfig.baseUrl;

export const ORG_ID = `${base}/#organization`;

export function centreId(c: Centre): string {
  return `${base}/locations/${c.slug}#place`;
}

export function absolute(path: string): string {
  if (path.startsWith("http")) return path;
  return `${base}${encodeURI(path)}`;
}

/** schema.org CoworkingSpace for one centre, with verified NAP + geo. */
export function centreSchema(c: Centre) {
  return {
    "@context": "https://schema.org",
    "@type": "CoworkingSpace",
    "@id": centreId(c),
    name: `${BUSINESS.brand} – ${c.name}, ${c.area}`,
    alternateName: `SSPACIA ${c.name}`,
    url: `${base}/locations/${c.slug}`,
    image: absolute(c.image),
    telephone: BUSINESS.phoneE164,
    email: BUSINESS.email,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Net Banking, Credit Card, Debit Card, Cash",
    openingHours: BUSINESS.openingHours,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: c.streetAddress,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      postalCode: c.postalCode,
      addressCountry: BUSINESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: c.geo.latitude,
      longitude: c.geo.longitude,
    },
    hasMap: c.googleMapsUrl,
    areaServed: { "@type": "City", name: "Ahmedabad" },
    parentOrganization: { "@id": ORG_ID },
    amenityFeature: [
      "High-speed Wi-Fi",
      "24/7 access",
      "Air-conditioned",
      "Unlimited tea and coffee",
      "Printing",
      "Reception and mail handling",
      "Meeting rooms",
    ].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    makesOffer: c.rooms.map((r) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: `${r.name} (${r.capacity} seats) at ${c.name}` },
      price: r.pricePerHour,
      priceCurrency: "INR",
      url: `${base}/products/${r.id}`,
    })),
    sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram, BUSINESS.social.linkedin, BUSINESS.social.youtube],
  };
}

export function allCentreSchemas() {
  return CENTRES.map(centreSchema);
}

/** schema.org Product + Offer for one bookable room (hourly, INR). */
export function roomProductSchema(c: Centre, r: Room) {
  const url = `${base}/products/${r.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${r.name} for ${r.capacity} at SSPACIA ${c.name}, ${c.area}, Ahmedabad`,
    description: `${r.capacity}-seater ${r.name.toLowerCase()} on hourly rent at SSPACIA ${c.name} (${c.locality}, ${c.area}, Ahmedabad). ${r.highlights.join(", ")}. Online slot booking ${BUSINESS.roomSlotWindow}.`,
    image: r.image,
    brand: { "@type": "Brand", name: "SSPACIA" },
    category: r.kind === "event-room" ? "Event space rental" : "Meeting room rental",
    offers: {
      "@type": "Offer",
      url,
      price: r.pricePerHour,
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: r.pricePerHour,
        priceCurrency: "INR",
        unitText: "per hour",
        valueAddedTaxIncluded: false,
      },
      availability: "https://schema.org/InStock",
      areaServed: { "@type": "City", name: "Ahmedabad" },
      seller: { "@id": ORG_ID },
      availableAtOrFrom: { "@id": centreId(c) },
    },
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}

export function serviceSchema(opts: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
  offers?: { name: string; price?: number; unit?: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${base}${opts.path}#service`,
    name: opts.name,
    serviceType: opts.serviceType,
    description: opts.description,
    url: `${base}${opts.path}`,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "City", name: "Ahmedabad" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${base}${opts.path}`,
      servicePhone: { "@type": "ContactPoint", telephone: BUSINESS.phoneE164, contactType: "sales" },
    },
    ...(opts.offers
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: opts.name,
            itemListElement: opts.offers.map((o) => ({
              "@type": "Offer",
              name: o.name,
              url: o.url,
              ...(o.price
                ? {
                    price: o.price,
                    priceCurrency: "INR",
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price: o.price,
                      priceCurrency: "INR",
                      unitText: o.unit ?? "per hour",
                    },
                  }
                : {}),
            })),
          },
        }
      : {}),
  };
}

export const centreAddressLine = fullAddress;
