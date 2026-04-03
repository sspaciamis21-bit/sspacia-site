import { Metadata } from "next";
import { Suspense } from "react";
import CheckoutClient from "./checkout-client";

export const metadata: Metadata = {
  title: "Checkout | SSPACIA",
  description: "Complete your booking at SSPACIA Coworking.",
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
