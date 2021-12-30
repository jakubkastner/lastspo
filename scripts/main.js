api.spotify.getPlaylists = async function (url = api.spotify.url + '/me/playlists?limit=50') {
    var json = await api.fetchJson(url, api.spotify.options, 'Failed to get playlists.');

    if (json == null) {
        // api error
        /*localStorage.removeItem(USER_ACCESS);
        userAccess = null;*/
        console.log("json api null");
        return;
    }

    // získá umělce
    var playlists = json.items;
    if (!playlists) {
        //showError('No playlists can be obtained', 'You are not following any artist.'); // !!
        console.log("json items null");
        return;
    }
    if (playlists.length < 1) {
        console.log("0 playlists");
        //showError('No playlists can be obtained', 'You are not following any artist.'); // !!
        return;
    }

    await program.savePlaylists(playlists);

    // získá seznam tracků pro playlisty uživatele
    /*await asyncForEach(playlists, async playlist => {
        if (playlist.tracks.total < 1) {
            return;
        }
        if (!playlist.tracks.href) {
            return; //??
        }
        if (playlist.collaborative || playlist.owner.id == user.spotify.api.id) {
            playlist.tracks.list = await api.spotify.getPlaylistTracks(playlist.tracks.href);
        }
    });

    // uložení do seznamu playlistů
    user.playlists = user.playlists.concat(playlists);*/

    if (json.next) {
        // existuje další stránka seznamu playlistů
        // -> odešle se další dotaz
        await api.spotify.getPlaylists(json.next);
    }
    else {
        // display playlists
        await el.displayPlaylists();
    }
}



el.user.login.lastfm.forEach(elem => elem.addEventListener('click', async function () {
    var userName = el.main.lastfmUsername.value;
    await api.lastfm.getHistory(userName);

    localStorage.removeItem(program.lastfm.const.username);
    localStorage.setItem(program.lastfm.const.username, userName);
}));

el.displayPlaylists = async function () {
    var playlistsHtml = '';
    await asyncForEach(user.playlists, async playlist => {
        var playlistHtml = '<div class="playlist" id="' + playlist.id + '">' + playlist.name + ' (' + playlist.tracks.total + ')</div>'
        playlistsHtml += playlistHtml;
    });
    await asyncForEach(el.main.playlists, async elPlaylists => {
        elPlaylists.innerHTML += playlistsHtml;
    });

    el.main.playlist = document.querySelectorAll('.playlists .playlist');

    /**
     * Click to playlist item
     */
    el.main.playlist.forEach(playlistEl => playlistEl.addEventListener('click', async function () {
        //await api.spotify.getTracks(el);

        await asyncForEach(el.main.tracklist, async elTracklist => {
            elTracklist.innerHTML = '';
        });

        var playlist = user.playlists.find(x => x.id === playlistEl.id);


        var tracks = await api.spotify.getPlaylistTracks(playlist.tracks.href);
        playlist.tracks.items = tracks;

        var tracklistHtml = '<div class="tracklist"><h4>' + playlist.name + '</h4><div class="track"><div class="artist">Artist</div><div class="name">Track</div><div class="album">Album</div><div class="plays">Number of plays</div></div>';


        await asyncForEach(tracks, async trackFull => {
            var track = trackFull.track;
            var plays = 0;
            await asyncForEach(user.historyTracks, async trackHistory => {
                if (trackHistory.name.toUpperCase() === track.name.toUpperCase() && trackHistory.artist.toUpperCase() === track.artists[0].name.toUpperCase()) {
                    plays = trackHistory.plays;
                    return;
                }
            });
            if (plays === 0) {
                var trackHtml = '<div class="track"><div>' + track.artists[0].name + '</div><div>' + track.name + '</div><div>' + track.album.name + '</div><div>' + plays + '</div></div>'
                tracklistHtml += trackHtml;
            }
        });


        // sort plays
        /*tracks.sort((a, b) => {
            return a.plays - b.plays;
        });*/

        tracklistHtml += '</div>';
        await asyncForEach(el.main.tracklist, async elTracklist => {
            elTracklist.innerHTML += tracklistHtml;
        });
    }));
}

program.savePlaylists = async function (playlists) {
    await asyncForEach(playlists, async playlist => {
        if (playlist.tracks.total < 1) {
            return;
        }
        if (!playlist.tracks.href) {
            return; //??
        }
        if (playlist.collaborative || playlist.owner.id == user.spotify.api.id) {
            user.playlists = user.playlists.concat(playlist);
        }
    });
}

api.spotify.getPlaylistTracks = async function (url) {
    // získá json z api
    // https://api.spotify.com/v1/playlists/{id}/tracks?market={market}&limit=100
    var json = await api.fetchJson(url, api.spotify.options, 'Failed to get list of your playlists:'); // !!

    if (json == null) {
        // chyba získávání
        return null;
    }

    // získá umělce
    var tracks = json.items;
    if (!tracks) {
        //showError('No playlists can be obtained', 'no album songs'); // !!
        return null;
    }
    if (tracks.length < 1) {
        //showError('No playlists can be obtained', 'no album songs'); // !!
        return null;
    }

    if (json.next) {
        // existuje další stránka seznamu umělců
        // -> odešle se další dotaz
        var newTracksList = await api.spotify.getPlaylistTracks(json.next);
        tracks = tracks.concat(newTracksList);
    }
    return tracks;
}

api.lastfm.getHistory = async function (userName, page = 1) {

    var lastTime = 0;
    var ret = false;

    if (user.lastfm.last != null) {
        if (userName.toUpperCase() === user.lastfm.last.toUpperCase()) {
            var historyStorage = JSON.parse(localStorage.getItem(program.lastfm.const.history));
            if (historyStorage != null) {
                lastTime = localStorage.getItem(program.lastfm.const.lastScrobble);
                // historyStorage[0].date.uts;
                user.historyTracks = historyStorage;
                //var nowTime = Math.floor(Date.now() / 1000);
            }
        }
    }


    /*await asyncForEach(el.main.playlists, async elPlaylists => {
        elPlaylists.style.display = 'none';
    });*/
    await asyncForEach(el.main.error, async elError => {
        elError.innerHTML = 'Getting your history: ' + page;
    });
    var url = api.lastfm.url + '/?method=user.getrecenttracks&user=' + userName + '&api_key=' + api.lastfm.key + '&format=json&page=' + page;
    var json = await api.fetchJson(url, api.lastfm.options, 'Failed to get last fm history.'); // !!


    if (json == null) {
        // chyba získávání

        console.log('json api null last fm');
        return null;
    }

    var tracksHistory = json.recenttracks.track;

    if (tracksHistory.length <= 1) {
        await api.lastfm.getHistory(userName, page);
        return;
    }
    if (tracksHistory[0]['@attr'] !== undefined) {
        if (tracksHistory[0]['@attr'].nowplaying === 'true') {
            tracksHistory.shift();
        }
    }

    if (page === 1) {
        var lastScrobble = tracksHistory[0].date.uts;

        localStorage.removeItem(program.lastfm.const.lastScrobble);
        localStorage.setItem(program.lastfm.const.lastScrobble, lastScrobble);
    }


    await asyncForEach(tracksHistory, async trackApi => {
        if ((lastTime != 0) && (lastTime <= trackApi.date.uts)) {
            console.log(lastTime);
            ret = true;
            return;
        }

        var trackNew = {
            name: trackApi.name,
            artist: trackApi.artist['#text'],
            plays: 1
        };
        var found = false;
        await asyncForEach(user.historyTracks, async trackHistory => {
            if (trackHistory.name.toUpperCase() === trackNew.name.toUpperCase() && trackHistory.artist.toUpperCase() === trackNew.artist.toUpperCase()) {
                trackHistory.plays++;
                found = true;
                return;
            }
        });
        if (found === true) {
            return;
        }

        user.historyTracks = user.historyTracks.concat(trackNew);
        console.log(trackNew);
    });

    user.history = user.history.concat(tracksHistory);
    if ((json.recenttracks['@attr'].totalPages > page) && (ret === false)) {
        await api.lastfm.getHistory(userName, ++page);
    }
    else {
        // last page
        await asyncForEach(el.main.error, async elError => {
            elError.innerHTML = 'Click on the spotify playlist';
        });
        await asyncForEach(el.main.playlists, async elPlaylists => {
            elPlaylists.style.display = 'block';
        });

        localStorage.removeItem(program.lastfm.const.history);
        localStorage.setItem(program.lastfm.const.history, JSON.stringify(user.historyTracks));
    }
}