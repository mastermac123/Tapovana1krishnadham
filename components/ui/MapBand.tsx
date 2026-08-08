import type { CSSProperties } from 'react';

/**
 * A Google map of the society.
 *
 * Uses the query-embed form, which needs no API key and no billing account —
 * a society should not have to keep a Google Cloud project alive to show
 * where it is.
 *
 * Loaded lazily: it is a third-party frame, so it should cost nothing until a
 * reader scrolls to it. `referrerPolicy` keeps the page path off the request,
 * and note that the frame does put the visitor in touch with Google — which is
 * unavoidable for an embedded map, and worth a line in a privacy notice if the
 * society ever publishes one.
 */

/** The place as Google knows it, from the society's own share link. */
const QUERY = 'Krishnadham CHS, Tapovan A-1, Rani Sati Marg Extension, Malad East, Mumbai 400097';

export const MAP_LINK =
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(QUERY);

export default function MapBand({
  height,
  minHeight,
  label = 'Map showing Tapovan A-1 Krishnadham',
  style,
}: {
  height?: number | string;
  minHeight?: number | string;
  label?: string;
  style?: CSSProperties;
}) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(QUERY)}&z=17&output=embed`;

  return (
    <div
      style={{
        position: 'relative',
        height,
        minHeight,
        overflow: 'hidden',
        background: '#EDE8DD',
        ...style,
      }}
    >
      <iframe
        src={src}
        title={label}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          display: 'block',
        }}
      />
    </div>
  );
}
