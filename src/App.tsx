/**
 * MetaШкола 2.0
 * Master Cross-Platform Educational System
 * Author & Initiator: Andárer
 */

import { useEffect, useState } from "react";
import { Shell } from "@/components/ms/shell";
import { Welcome } from "@/components/ms/welcome";
import { useMs } from "@/lib/ms/store";

export default function App() {
  const [hydrated, setHydrated] = useState(() => useMs.persist.hasHydrated());
  const bootstrapped = useMs((s) => s.bootstrapped);

  useEffect(() => {
    if (useMs.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useMs.persist.onFinishHydration(() => setHydrated(true));
    void useMs.persist.rehydrate();
    return unsub;
  }, []);

  if (!hydrated || !bootstrapped) {
    return <Welcome locked={!hydrated} />;
  }

  return <Shell />;
}
