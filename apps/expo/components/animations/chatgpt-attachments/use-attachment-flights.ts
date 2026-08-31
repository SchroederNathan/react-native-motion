import { useCallback, useEffect, useState } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Flight } from './composer/attachment-flight';
import { SPRING } from './constants';
import type { LibraryPhoto } from './photos/use-photo-library';

interface FlightOptions {
  /** The panel's half of the leave — `collapseForLeave` on the panel hook. */
  collapsePanel: () => void;
  /** The panel's half of the landing — `resetAfterLeave` on the panel hook. */
  resetPanel: () => void;
  /** Called as the flight lands, so the screen can drop its selection. */
  onSettled?: () => void;
}

/**
 * The composer's attachments and the photos flying into them. It owns the two
 * shared values both ends of the flight read — `attach`, the flight's own
 * progress, and `strip`, the slot it is aiming at — and the one move that
 * needs the panel: `attachAndLeave`, which sends the photos to the composer
 * while the panel collapses under them.
 */
export function useAttachmentFlights({ collapsePanel, resetPanel, onSettled }: FlightOptions) {
  const [attachments, setAttachments] = useState<LibraryPhoto[]>([]);
  /** The photos currently crossing from the grid to the composer. */
  const [flights, setFlights] = useState<Flight[]>([]);

  const attach = useSharedValue(0);
  /**
   * 0 no attachment strip → 1 strip open. Lives up here because two views need
   * it: the composer, which grows around it, and the photos flying into it,
   * which have to know where the slot they are aiming at currently is.
   */
  const strip = useSharedValue(0);

  // Adding the first attachment opens the strip; removing the last one shuts
  // it. Either way the composer's bottom edge is pinned, so this is the whole
  // of its height change.
  const hasAttachments = attachments.length > 0;
  useEffect(() => {
    strip.set(withSpring(hasAttachments ? 1 : 0, SPRING.strip));
  }, [hasAttachments, strip]);

  /** Runs when the flight lands, handing the thumbnails over to the composer. */
  const settle = useCallback(() => {
    // The hand-off, on one commit: the flying copies come off in the same
    // breath the composer's own thumbnails stop being held back. Everything
    // here runs synchronously so React batches it — an await or a timer in
    // the middle would split it into two commits and double-expose a photo.
    setFlights([]);
    onSettled?.();
    attach.set(0);
    resetPanel();
  }, [attach, onSettled, resetPanel]);

  /**
   * Hands a set of photos to the composer and sends the sheet home. Shared by
   * the grid's confirm and the camera's shutter: both end the same way, with
   * copies flying out of wherever the photos were and the panel collapsing back
   * into the + button underneath them.
   */
  const attachAndLeave = useCallback(
    (leaving: Flight[]) => {
      setFlights(leaving);
      setAttachments((prev) => [...prev, ...leaving.map((flight) => flight.photo)]);
      collapsePanel();

      // The photos go their own way, out of wherever they were sitting. The
      // sheet's collapse and this are the same length, so they read as one
      // move coming apart rather than two.
      attach.set(
        withSpring(1, SPRING.attach, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(settle);
        }),
      );
    },
    [attach, collapsePanel, settle],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  return {
    attachments,
    flights,
    isFlying: flights.length > 0,
    attach,
    strip,
    attachAndLeave,
    removeAttachment,
  };
}
