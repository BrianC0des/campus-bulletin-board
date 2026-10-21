
import React, { useState, useEffect } from 'react';

export default function DisplayScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString()
  );

  const pairingCode = '7K4P - 92QM';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main>
      <pre>{`
────────────────────────────────────────────────────────

              🏛️ CAMPUS DIGITAL SIGNAGE

────────────────────────────────────────────────────────

                    Pairing Code:

                ┌───────────────────┐
                │   ${pairingCode}    │
                └───────────────────┘

      Go to Admin Dashboard > Displays to Pair Screen

              ${currentTime}  •  Offline

────────────────────────────────────────────────────────
      `}</pre>
    </main>
  );
}
