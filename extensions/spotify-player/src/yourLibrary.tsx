import { ComponentProps, useState } from "react";
import { Grid, List, getPreferenceValues } from "@raycast/api";
import { View } from "./components/View";
import { useYourLibrary } from "./hooks/useYourLibrary";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodesSection";
import { useCachedPromise } from "@raycast/utils";
import { getMySavedTracks } from "./api/getMySavedTracks";

const filters = {
  all: "All",
  playlists: "Playlists",
  albums: "Albums",
  artists: "Artists",
  tracks: "Songs",
  shows: "Podcasts & Shows",
  episodes: "Episodes",
};

type FilterValue = keyof typeof filters;

function YourLibraryCommand() {
  const [searchText, setSearchText] = useState("");
  // TODO: Add a new preference value that defaults to the stored value
  const [searchFilter, setSearchFilter] = useState<FilterValue>(
    getPreferenceValues()["Default-View"] ?? filters.tracks,
  );
  const { myLibraryData, myLibraryIsLoading } = useYourLibrary({ keepPreviousData: true });

  const {
    data,
    pagination,
    isLoading: isLoadingPagination,
  } = useCachedPromise(() => async ({ page }) => {
    const { items } = await getMySavedTracks({ page });
    return {
      data: items,
      hasMore: items.length > 0 && page < 10,
    };
  });

  const sharedProps: ComponentProps<typeof List> = {
    searchBarPlaceholder: "Search your library",
    isLoading: myLibraryIsLoading || isLoadingPagination,
    searchText,
    onSearchTextChange: setSearchText,
    filtering: true,
  };

  const showListView =
    searchFilter === "all" || searchFilter === "tracks" || searchFilter === "playlists" || searchFilter === "episodes";

  if (showListView) {
    const limit = searchText ? undefined : 6;

    return (
      <List
        {...sharedProps}
        pagination={searchFilter === "tracks" ? pagination : undefined}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter search"
            value={searchFilter}
            onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
          >
            {Object.entries(filters).map(([value, label]) => (
              <List.Dropdown.Item key={value} title={label} value={value} />
            ))}
          </List.Dropdown>
        }
      >
        {searchFilter === "all" && (
          <>
            <PlaylistsSection type="list" limit={limit} playlists={myLibraryData?.playlists?.items} />
            <AlbumsSection type="list" limit={limit} albums={myLibraryData?.albums?.items} />
            <ArtistsSection type="list" limit={limit} artists={myLibraryData?.artists?.items} />
            <TracksSection limit={limit} tracks={myLibraryData?.tracks?.items} title="Liked Songs" queueTracks />
            <ShowsSection type="list" limit={limit} shows={myLibraryData?.shows?.items} />
            <EpisodesSection limit={limit} episodes={myLibraryData?.episodes?.items} title="Saved Episodes" />
          </>
        )}

        {searchFilter === "tracks" ? <TracksSection tracks={data} title="Liked Songs" queueTracks /> : null}
        {searchFilter === "episodes" ? (
          <EpisodesSection episodes={myLibraryData?.episodes?.items} title="Saved Episodes" />
        ) : null}

        {searchFilter === "playlists" ? (
          <PlaylistsSection type="list" playlists={myLibraryData?.playlists?.items} />
        ) : null}
      </List>
    );
  } else {
    return (
      <Grid
        {...sharedProps}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Filter search"
            value={searchFilter}
            onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
          >
            {Object.entries(filters).map(([value, label]) => (
              <Grid.Dropdown.Item key={value} title={label} value={value} />
            ))}
          </Grid.Dropdown>
        }
      >
        {searchFilter === "artists" && (
          <ArtistsSection type="grid" columns={5} artists={myLibraryData?.artists?.items} />
        )}

        {searchFilter === "albums" && <AlbumsSection type="grid" columns={5} albums={myLibraryData?.albums?.items} />}

        {searchFilter === "shows" && <ShowsSection type="grid" columns={5} shows={myLibraryData?.shows?.items} />}
      </Grid>
    );
  }
}

export default function Command() {
  return (
    <View>
      <YourLibraryCommand />
    </View>
  );
}
