#!/bin/python3

import json
import yaml
import shlex

import typing
import itertools

from pathlib import Path, PurePosixPath

GROUP_WHITELIST: list[str] = ['group:official', 'Additional Tracks']
DATA_ROOT_PATH: Path = Path("L:/Archive/Homestuck/Nebula/Data")
MEDIA_ROOT_PATH: Path = Path("L:/Archive/Homestuck/Nebula/media")
ASSET_PACK_PATH: Path = Path("L:/Archive/Homestuck/TUHC/Asset Pack V2")


class Album():
    def __init__(self, raw_list: list[dict], yaml_path: Path) -> None:
        [album_header, *track_data] = raw_list

        self.name: str = album_header['Album']
        self.header: dict = album_header

        self.directory: str = yaml_path.stem

        section_name = "Unsorted"
        self.sections: dict[str, list[dict]] = {
            "Unsorted": []
        }

        for document in track_data:
            if document.get('Section'):
                section_name = document['Section']
                assert section_name not in self.sections
                self.sections[section_name] = []
            elif document.get('Track'):
                self.sections[section_name].append(document)
            else:
                raise NotImplementedError(document)

    def toJson(self) -> dict:
        return {
            'name': self.name,
            'header': self.header,
            'sections': self.sections,
            'directory': self.directory
        }

    @classmethod
    def fromYamlPath(cls, album_yaml_path):
        with open(album_yaml_path, 'r', encoding='utf-8') as fp:
            return cls([*yaml.safe_load_all(fp)], yaml_path=album_yaml_path)


def shareAnyCommonItems(iter1, iter2):
    return any(i in iter1 for i in iter2)


def getFilteredAlbums(group_whitelist: list[str] = ['group:official']) -> typing.Iterable[Album]:
    for album_yaml_path in (DATA_ROOT_PATH / 'album').glob('*.yaml'):

        with open(album_yaml_path, 'r', encoding='utf-8') as fp:
            album_header = next(yaml.safe_load_all(fp))  # Only read header

        if shareAnyCommonItems(album_header.get('Groups'), group_whitelist):
            yield Album.fromYamlPath(album_yaml_path)
            # with open(album_yaml_path, 'r', encoding='utf-8') as fp:
            #     yield Album([*yaml.safe_load_all(fp)], yaml_path=album_yaml_path)


def getArtistsInAlbums(album_list: list[Album]) -> typing.Iterable[str]:
    for album in album_list:
        yield from album.header.get('Artists', [])
        yield from album.header.get('Cover Artists', [])

        for section in album.sections.values():
            for track in section:
                yield from track.get('Artists', [])
                yield from track.get('Cover Artists', [])


def getMediaPaths(album_list: list[Album], flash_acts: dict[str, list]) -> typing.Iterable[PurePosixPath]:
    for album in album_list:
        # Album and track art
        for subdir in ['album-art']:  # , 'album-additional']:
            for media_file in (MEDIA_ROOT_PATH / subdir / album.directory).glob('*'):
                if not shareAnyCommonItems(['.medium', '.small'], media_file.suffixes):
                    yield PurePosixPath(media_file.relative_to(MEDIA_ROOT_PATH))

        # Credits, backgrouns
        for file_listing in album.header.get('Additional Files', []):
            for file_name in file_listing.get('Files', []):
                media_file = (MEDIA_ROOT_PATH / 'album-additional' / album.directory / file_name)
                yield PurePosixPath(media_file.relative_to(MEDIA_ROOT_PATH))
        # for filekind in ['Additional Files']:

        # for section in album.sections:
        #     for track in section:
        #         for filekind in ['Additional Files']:

    for flashlist in flash_acts.values():
        for flash in flashlist:
            for stem in filter(bool, [flash.get('Directory'), flash.get('Path')]):
                for media_file in (MEDIA_ROOT_PATH / 'flash-art').glob(f"{stem}.*"):
                    if not shareAnyCommonItems(['.medium', '.small'], media_file.suffixes):
                        yield PurePosixPath(media_file.relative_to(MEDIA_ROOT_PATH))


def main() -> None:

    print("Filtering flashes naively")
    with open((DATA_ROOT_PATH / 'flashes.yaml'), 'r', encoding='utf-8') as fp:
        flash_act = "Unsorted"
        grouped_flashes: dict[str, list[dict]] = {
            "Unsorted": []
        }
        for document in yaml.safe_load_all(fp):
            if document.get('Act'):
                # TODO: Detect "officialness" better than this
                if flash_act == "Pesterquest":
                    break
                flash_act = document['Act']
                grouped_flashes[flash_act] = []
            elif document.get('Flash'):
                # assert 'Directory' in document, document
                grouped_flashes[flash_act].append(document)
            else:
                raise NotImplementedError(document)

    print(
        "Found", sum(len(v) for v in grouped_flashes.values()),
        "flash entries in", len(grouped_flashes), "acts"
    )

    print("Filtering albums by groups", GROUP_WHITELIST)
    filtered_albums: list[Album] = [*getFilteredAlbums(GROUP_WHITELIST)]
    print("Found", len(filtered_albums), "matching albums.")

    print("Filtering artists by album")
    filtered_artist_names: set[str] = set(getArtistsInAlbums(filtered_albums))

    filtered_artists: list[dict] = []
    with open((DATA_ROOT_PATH / 'artists.yaml'), 'r', encoding='utf-8') as fp:
        for doc in yaml.safe_load_all(fp):
            # all_aliases = [doc['Artist'], *doc.get('Aliases', [])]
            # if shareAnyCommonItems(all_aliases, filtered_artist_names):
            if doc['Artist'] in filtered_artist_names:
                filtered_artists.append(doc)

    print("Found", len(filtered_artists), "artist defs.")

    print("Getting media for albums")
    rel_media_paths: list[PurePosixPath] = [*getMediaPaths(filtered_albums, grouped_flashes)]
    print("Found", len(rel_media_paths), "trees")

    rel_media_paths = [*filter(
        lambda i: not any(
            str(i).endswith(suffix)
            for suffix in [
                "Beyond Canon Anthology Art Book.pdf",
                "of 2).pdf",
                "Three in the Morning - Nocturne.pdf",
                "Center of Brilliance - infinityMechanism (all staves visible).pdf",
                "(band parts).zip",
                "(concert band).pdf",
            ]
        ),
        rel_media_paths
    )]

    print("Filtered down to", len(rel_media_paths), "trees")

    media_path_json: list[str] = [str(PurePosixPath(p)) for p in rel_media_paths]
    # print([a['Album'] for a in albums])

    hsmusic_data = {
        'albums': [a.toJson() for a in filtered_albums],
        'artists': filtered_artists,
        'flashes': grouped_flashes,
        'media': media_path_json
    }

    print("Writing hsmusic.json")
    with open('./hsmusic.json', 'w', encoding='utf-8') as fp:
        json.dump(hsmusic_data, fp, indent=2)

    print("Writing hsmusic.sh")
    writeMediaShellScript(rel_media_paths)


def writeMediaShellScript(rel_media_paths):
    with open('./hsmusic.sh', 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('#!/bin/bash\n\n')
        fp.write('set -eu -o pipefail\n')

        local_rel_media: PurePosixPath = PurePosixPath('./hsmusic')

        fp.write('( :\n')
        rel_media_paths_sorted: list[PurePosixPath] = sorted(rel_media_paths)
        for key, paths in itertools.groupby(rel_media_paths_sorted, lambda p: p.parent):
            fp.write(f") &\n\n( mkdir -v -p {shlex.quote(str(local_rel_media / key))}\n")
            for rel_media_path in paths:
                fp.write(
                    f"cp -v --no-clobber "
                    f"{shlex.quote(str(MEDIA_ROOT_PATH / rel_media_path))} "
                    f"{shlex.quote(str(local_rel_media / rel_media_path))}\n"
                )

        fp.write(") &\nset -x\nwait\n\n")

        fp.write('set -x\n')

        fmt_asset_path = str(ASSET_PACK_PATH).replace('\\', '/')
        fmt_rel_path = str(PurePosixPath(local_rel_media))

        use_dedupc = True

        if use_dedupc:
            fp.write(f"""
py ~/Projects/python/apps/DeDuplicator/dedupc.py -s hsmusic -f \\
    '{fmt_asset_path}/archive/music/**/*' \\
    '{fmt_rel_path}/**/*' \\
    --hashsize 5 \\
    --json --noprogress > dedupec.json
    """)
            fp.write(f"""
cat dedupec.json | sed 's|\\\\\\\\|/|g' | jq '
    [
        .[]
        | values
        | select((. | length) >= 2)

        | [
            combinations(2)
            | select(.[0] != .[1]) | sort
        ] | unique
    ] | flatten(1)
    + [
        [ "{fmt_asset_path}/archive/music/homestuck-vol-8/hussie-hunt.jpg",
          "{fmt_rel_path}/album-art/homestuck-vol-8/hussie-hunt.png" ],
        [ "{fmt_asset_path}/homestuck-vol-8/bargaining-with-the-beast.jpg",
          "{fmt_rel_path}/album-art/homestuck-vol-8/bargaining-with-the-beast.png" ],
        [ "{fmt_asset_path}/archive/music/homestuck-vol-10/Booklet.pdf",
          "{fmt_rel_path}/album-additional/homestuck-vol-10/Booklet (Compressed).pdf" ]
    ]' > pairlist.json"""
                     )
        else:
            fp.write(
                f"jdupes -r -j "
                f"{shlex.quote(str(ASSET_PACK_PATH / 'archive' / 'music'))} "
                f"{shlex.quote(str(local_rel_media))} "
                " | tee dupes.json\n"
            )
            fp.write(f"""
cat dupes.json | sed 's|\\\\\\\\|/|g' | jq '
    [
        .matchSets[].fileList
        | map(.filePath)
        | sort
    ] ' > pairlist.json"""
                    )


        #
        # fp.write(
        #     "cat dupes.json | sed 's|\\\\|/|g' | jq '"
        #     '[.matchSets[].fileList | map(.filePath) | select(.[0]|startswith("'
        #     f'{fmt_rel_path}'
        #     '")) | select(.[1]|startswith("'
        #     f'{str(ASSET_PACK_PATH)}'
        #     '")) | {"key": (.[0] | sub("'
        #     f'{fmt_rel_path}'
        #     '"; "assets://")), "value": (.[1] | sub("'
        #     f'{str(ASSET_PACK_PATH)}'
        #     '"; "assets://"))}] | from_entries'
        #     "' | tee routes.json"
        # )

        fp.write(f"""
cat pairlist.json | jq '
    [
        .[]
        | select(.[1]|startswith("{fmt_rel_path}"))
        | select(.[0]|startswith("{fmt_asset_path}"))
        | {{
            "key": (.[1] | sub("{fmt_rel_path}/"; "assets://hsmusic/")),
            "value": (.[0] | sub("{fmt_asset_path}/"; "assets://"))
        }}
    ] | from_entries' > routes.json"""
                 )

        fp.write(f"""
cat pairlist.json | jq -r '
    .[]
    | select(.[1]|startswith("{fmt_rel_path}"))
    | select(.[0]|startswith("{fmt_asset_path}"))
    | ("rm -v \\"" + .[1] + "\\"")' > rm_dupe.sh && dos2unix rm_dupe.sh"""
                 )


if __name__ == '__main__':
    main()
