import { Suspense } from "react";
import TwoFactorClient from "./twofactor-client";

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorClient />
    </Suspense>
  );
}
