import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CAMERA, COLORS, PANEL_CONTENT } from '../constants';
import { SheetPlaceholder } from '../panel/sheet-placeholder';

export interface CameraSheetHandle {
  /**
   * Captures a still and resolves to its `file://` uri, or null if the camera
   * had nothing to give — no permission, not ready yet, or the capture failed.
   */
  takePicture: () => Promise<string | null>;
}

interface CameraSheetProps {
  width: number;
  height: number;
  facing: CameraType;
  flash: FlashMode;
  /**
   * True once the picture has left for the composer. The preview is cut on that
   * frame, not faded: a copy of what it showed is flying out of this exact rect
   * and the two must never be on screen together.
   */
  lifting: boolean;
}

/**
 * Everything the panel shows once it has become the camera. Laid out at the
 * sheet's full size — the same footprint the photo grid takes — and scaled by
 * the panel through the morph, so nothing in here knows a transition is on.
 *
 * The controls floating over it live in `CameraBar`, outside the panel, for the
 * same reason the grid's do: they are glass, and glass under the panel's
 * animated opacity renders as nothing.
 */
export const CameraSheet = forwardRef<CameraSheetHandle, CameraSheetProps>(function CameraSheet(
  { width, height, facing, flash, lifting },
  handle,
) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const ready = useRef(false);

  // Ask once the sheet is up — the preview has nothing to show without it.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useImperativeHandle(
    handle,
    () => ({
      takePicture: async () => {
        const camera = cameraRef.current;
        if (!camera || !ready.current) return null;
        try {
          const picture = await camera.takePictureAsync({
            quality: CAMERA.quality,
            shutterSound: false,
          });
          return picture?.uri ?? null;
        } catch {
          return null;
        }
      },
    }),
    [],
  );

  const granted = !!permission?.granted;

  return (
    <View style={[styles.root, { width, height }]}>
      {granted ? (
        <CameraView
          ref={cameraRef}
          facing={facing}
          flash={flash}
          // A selfie preview reads as a mirror; the capture should match it.
          mirror={facing === 'front'}
          // The sheet carries the capture out itself — see the flight — so the
          // stock blink would be a second, unrelated thing happening on top.
          animateShutter={false}
          onCameraReady={() => {
            ready.current = true;
          }}
          style={[StyleSheet.absoluteFill, lifting && styles.lifted]}
        />
      ) : (
        <SheetPlaceholder>
          {permission && !permission.canAskAgain
            ? 'Camera access is off. Turn it on in Settings to try this demo.'
            : 'Waiting for camera access…'}
        </SheetPlaceholder>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...PANEL_CONTENT,
    // Black rather than the panel's material: a camera preview starts a frame
    // or two after it mounts, and the reference shows black there, not glass.
    backgroundColor: COLORS.background,
  },
  lifted: {
    opacity: 0,
  },
});
