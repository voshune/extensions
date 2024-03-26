import { existsSync, readdirSync, readFile } from "fs";
import { join } from "path";
import { promisify } from "util";

import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState, useStreamJSON } from "@raycast/utils";
import { useCallback, useMemo } from "react";

const read = promisify(readFile);

type BookmarkURL = {
  guid: string;
  name: string;
  url: string;
  type: "url";
};

type BookmarkFolder = {
  guid: string;
  name: string;
  type: "folder";
  children: BookmarkItem[];
};

type BookmarkItem = BookmarkURL | BookmarkFolder;

function getBookmarks(bookmark: BookmarkFolder | BookmarkItem, hierarchy = "") {
  const bookmarks = [];

  if (bookmark.type === "folder") {
    bookmark.children?.map((child) => {
      bookmarks.push(...getBookmarks(child, hierarchy === "" ? bookmark.name : `${hierarchy}/${bookmark.name}`));
    });
  }

  if (bookmark.type === "url") {
    bookmarks.push({
      id: bookmark.guid,
      title: bookmark.name,
      url: bookmark.url,
      folder: hierarchy,
    });
  }

  return bookmarks;
}

type Folder = {
  id: string;
  title: string;
};

function getFolders(bookmark: BookmarkFolder | BookmarkItem, hierarchy = ""): Folder[] {
  const folders: Folder[] = [];

  if (bookmark.type === "folder") {
    const title = hierarchy === "" ? bookmark.name : `${hierarchy}/${bookmark.name}`;

    return [
      { title, id: bookmark.guid },
      ...(bookmark.children?.map((child) => getFolders(child, title)) || []).flat(),
    ];
  }

  return folders;
}

async function getChromiumProfiles(path: string) {
  if (!existsSync(`${path}/Local State`)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(`${path}/Local State`, "utf-8");
  const localState = JSON.parse(file);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileInfoCache: Record<string, any> = localState.profile.info_cache;

  const profiles = Object.entries(profileInfoCache)
    // Only keep profiles that have bookmarks
    .filter(([profilePath]) => {
      const profileDirectory = readdirSync(`${path}/${profilePath}`);
      return profileDirectory.includes("Bookmarks");
    })
    .map(([path, profile]) => {
      return {
        path,
        name: profile.name,
      };
    });

  const defaultProfile = localState.profile?.last_used?.length > 0 ? localState.profile.last_used : profiles[0].path;

  profiles.sort((a, b) => a.name?.localeCompare(b.name));
  return { profiles, defaultProfile };
}

type UseChromiumBookmarksParams = {
  path: string;
  browserIcon: string;
  browserName: string;
  browserBundleId: string;
  query?: string;
};

export default function useChromiumBookmarks(
  enabled: boolean,
  { path, browserIcon, browserName, browserBundleId, query }: UseChromiumBookmarksParams,
) {
  const [currentProfile, setCurrentProfile] = useCachedState(`${browserName}-profile`, "");

  const { data: profiles } = useCachedPromise(
    async (enabled, path) => {
      if (!enabled) {
        return;
      }

      const { profiles, defaultProfile } = await getChromiumProfiles(path);

      // Initially set the current profile when nothing is set in the cache yet
      if (currentProfile === "") {
        setCurrentProfile(defaultProfile);
      }

      return profiles;
    },
    [enabled, path],
  );

  const transformFn = useCallback(getBookmarks, []);
  const filterFn = useCallback(
    (item: { title: string }) => {
      if (!query) return true;
      return item.title.toLocaleLowerCase().includes(query);
    },
    [query],
  );

  const execute = useMemo(() => {
    return !!currentProfile && enabled && existsSync(`${path}/${currentProfile}/Bookmarks`);
  }, [currentProfile, enabled, path]);

  const fullPath = `file://${path}/${currentProfile}/Bookmarks`;

  const { data, isLoading, mutate, pagination } = useStreamJSON(fullPath, {
    dataPath: /^roots.(bookmark_bar|other|synced).children$/,
    folder: join(environment.supportPath, `cache-${currentProfile}.json`),
    transform: transformFn,
    filter: filterFn,
    execute,
  });

  // console.log(data.length);

  // data.forEach((d) => {
  //   console.log(d.length);
  // });

  const transformFoldersFn = useCallback(getFolders, []);

  const { data: dataFolders } = useStreamJSON(fullPath, {
    dataPath: /^roots.(bookmark_bar|other|synced).children$/,
    folder: join(environment.supportPath, `cache-${currentProfile}.json`),
    transform: transformFoldersFn,
    filter: filterFn,
    execute,
  });

  const bookmarks =
    data?.flat().map((bookmark) => {
      return {
        ...bookmark,
        id: `${bookmark.id}-${browserBundleId}`,
        browser: browserBundleId,
      };
    }) ?? [];

  const folders =
    dataFolders?.flat().map((folder) => {
      return {
        ...folder,
        id: `${folder.id}-${browserBundleId}`,
        icon: browserIcon,
        browser: browserBundleId,
      };
    }) ?? [];

  return {
    bookmarks,
    folders,
    isLoading,
    mutate,
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
    pagination,
  };
}
