
import React, { useState, useEffect } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';

export default function DisplayScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-US')
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  const [slides] = useState(() =>
    MOCK_ANNOUNCEMENTS.filter(
      (announcement) =>
        announcement.publish_status === 'published' &&
        announcement.status === 'active'
    )
  );

  const pairingCode = '7K4P - 92QM';

  
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US'));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  
  useEffect(() => {
    if (slides.length === 0) return;

    const slideTimer = setInterval(() => {
      setCurrentIndex(
        (previousIndex) => (previousIndex + 1) % slides.length
      );
    }, 10000);

    return () => clearInterval(slideTimer);
  }, [slides.length]);

  const currentSlide = slides[currentIndex];

  return (
    <main>
      <pre>{`
────────────────────────────────────────────────────────

              🏛️ CAMPUS DIGITAL SIGNAGE

────────────────────────────────────────────────────────

                    Pairing Code:
                 ┌───────────────────┐
                 │   ${pairingCode}   │
                 └───────────────────┘

────────────────────────────────────────────────────────
      `}</pre>

      {slides.length === 0 ? (
        <p>No active announcements.</p>
      ) : (
        <>
          {currentSlide.image_url && (
            <p>
              <img
                src={currentSlide.image_url}
                alt={currentSlide.title}
                width="600"
              />
            </p>
          )}

          <h1>{currentSlide.title}</h1>

          <p>{currentSlide.body}</p>

          <p>
            Slide {currentIndex + 1} of {slides.length}
          </p>
        </>
      )}

      <pre>{`
────────────────────────────────────────────────────────

      Go to Admin Dashboard > Displays to Pair Screen

                 ${currentTime}  •  Offline

────────────────────────────────────────────────────────
      `}</pre>
    </main>
  );
}
