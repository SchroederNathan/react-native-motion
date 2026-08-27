import {
  AssetField,
  MediaType,
  Query,
  usePermissions,
  type PermissionResponse,
} from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { GRID } from './constants';

export interface LibraryPhoto {
  /**
   * `ph://<localIdentifier>` on iOS, a `content://` uri on Android — both of
   * which `expo-image` loads directly, so this doubles as the image source.
   */
  id: string;
  width: number;
  height: number;
}

export type LibraryStatus = 'loading' | 'denied' | 'empty' | 'ready';

export interface PhotoLibrary {
  photos: LibraryPhoto[];
  status: LibraryStatus;
  permission: PermissionResponse | null;
  requestPermission: () => void;
}

function isReadable(permission: PermissionResponse | null) {
  return !!permission && (permission.granted || permission.accessPrivileges === 'limited');
}

/**
 * The most recent photos from the device library, newest first.
 *
 * `exeForMetadata()` is deliberate: it reads straight from the media store
 * without resolving file paths, so a full page comes back in one call. The id
 * it returns is already a loadable uri, which is why there is no per-asset
 * `getUri()` round trip here.
 */
export function usePhotoLibrary(): PhotoLibrary {
  const [permission, requestPermission] = usePermissions({ granularPermissions: ['photo'] });
  const [photos, setPhotos] = useState<LibraryPhoto[]>([]);
  const [status, setStatus] = useState<LibraryStatus>('loading');

  const load = useCallback(async () => {
    try {
      const assets = await new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(GRID.pageSize)
        .exeForMetadata();

      setPhotos(
        assets.map((asset) => ({
          id: asset.id,
          width: asset.width ?? 1,
          height: asset.height ?? 1,
        })),
      );
      setStatus(assets.length ? 'ready' : 'empty');
    } catch {
      setStatus('denied');
    }
  }, []);

  // Ask once on mount — the grid has nothing to show without it.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!permission) return;
    if (isReadable(permission)) {
      load();
    } else if (!permission.canAskAgain) {
      setStatus('denied');
    }
  }, [permission, load]);

  return { photos, status, permission, requestPermission };
}
