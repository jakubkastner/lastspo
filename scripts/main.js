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
    var playlistsHtml = '<h3 class="info">Spotify playlists:</h3>';
    await asyncForEach(user.playlists, async playlist => {
        var playlistHtml = '<button class="playlist" id="' + playlist.id + '">' + playlist.name + ' (' + playlist.tracks.total + ')</button>'
        playlistsHtml += playlistHtml;
    });
    await asyncForEach(el.main.playlists, async elPlaylists => {
        elPlaylists.insertAdjacentHTML('afterbegin', playlistsHtml);
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

        var tracklistHtml = '<h3>Playlist "' + playlist.name + '":</h3><div class="track title"><h4 class="artist">Artist</h4><h4 class="name">Track</h4><h4 class="album">Album</h4><h4 class="plays">Number of plays</h4></div>';


        await asyncForEach(tracks, async trackFull => {
            var track = trackFull.track;
            if (track === null) {
                console.log(track);
            }
            var plays = 0;
            await asyncForEach(user.historyTracks, async trackHistory => {
                if (trackHistory.name.toUpperCase() === track.name.toUpperCase() && trackHistory.artist.toUpperCase() === track.artists[0].name.toUpperCase()) {
                    plays = trackHistory.plays;
                    return;
                }
            });
            if (plays === 0) {
                var trackHtml = '<div class="track"><p class="artist">' + track.artists[0].name + '</p><p>' + track.name + '</p><p>' + track.album.name + '</p><p>' + plays + '</p></div>'
                tracklistHtml += trackHtml;
            }
        });


        // sort plays
        /*tracks.sort((a, b) => {
            return a.plays - b.plays;
        });*/

        await asyncForEach(el.main.tracklist, async elTracklist => {
            elTracklist.insertAdjacentHTML('afterbegin', tracklistHtml);
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

api.lastfm.getHistory = async function (userName, page = 1, lastTime = 0) {

    var ret = false;

    if (page === 1) {
        if (user.lastfm.last != null) {
            if (userName.toUpperCase() === user.lastfm.last.toUpperCase()) {
                var historyStorage = JSON.parse(localStorage.getItem(program.lastfm.const.history));
                if (historyStorage != null) {
                    // historyStorage[0].date.uts;
                    lastTime = parseInt(localStorage.getItem(program.lastfm.const.lastScrobble));
                    user.historyTracks = historyStorage;
                    //var nowTime = Math.floor(Date.now() / 1000);
                }
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
        await api.lastfm.getHistory(userName, page, lastTime);
        return;
    }
    if (tracksHistory[0]['@attr'] !== undefined) {
        if (tracksHistory[0]['@attr'].nowplaying === 'true') {
            tracksHistory.shift();
        }
    }

    if (page === 1) {
        var lastScrobble = parseInt(tracksHistory[0].date.uts);

        localStorage.removeItem(program.lastfm.const.lastScrobble);
        localStorage.setItem(program.lastfm.const.lastScrobble, lastScrobble);
    }

    for (let index2 = 0; index2 < tracksHistory.length; index2++) {
        var trackApi = tracksHistory[index2];

        if ((lastTime != 0) && (parseInt(trackApi.date.uts) <= lastTime)) {
            ret = true;
            index2 = tracksHistory.length;
        }
        else {
            var trackNew = {
                name: trackApi.name,
                artist: trackApi.artist['#text'],
                plays: 1
            };
            var found = false;
            for (let index = 0; index < user.historyTracks.length; index++) {
                // vykoná funkci a čeká, dokuď se neprovede
                var trackHistory = user.historyTracks[index];

                if (trackHistory.name.toUpperCase() === trackNew.name.toUpperCase() && trackHistory.artist.toUpperCase() === trackNew.artist.toUpperCase()) {
                    trackHistory.plays++;

                    index = user.historyTracks.length;
                    found = true;
                    //index2 = tracksHistory.length;
                    console.log('trackHistory :>> ', trackHistory);
                }
            }
            if (found === false) {
                user.historyTracks = user.historyTracks.concat(trackNew);
                console.log('trackNew :>> ', trackNew);
            }
        }
    }

    /*await asyncForEach(tracksHistory, async trackApi => {
        if ((lastTime != 0) && (lastTime <= trackApi.date.uts)) {
            console.log(lastTime);
            ret = true;
            return;
        }
        console.log('trackApi.name :>> ', trackApi.name);

        var trackNew = {
            name: trackApi.name,
            artist: trackApi.artist['#text'],
            plays: 1
        };
        var found = false;

        await asyncForEach(user.historyTracks, async trackHistory => {
            console.log('trackHistory.name :>> ', trackHistory.name);
            if (trackHistory.name.toUpperCase() === trackNew.name.toUpperCase() && trackHistory.artist.toUpperCase() === trackNew.artist.toUpperCase()) {
                trackHistory.plays++;
                console.log('ret :>> ', trackNew.name);
                found = true;
                return;
            }
        });*/
    /*console.log('potom :>> ', trackNew.name);
    if (found === true) {
        return;
    }

    user.historyTracks = user.historyTracks.concat(trackNew);
    console.log(trackNew);
});*/

    //user.history = user.history.concat(tracksHistory);
    if ((parseInt(json.recenttracks['@attr'].totalPages) > page) && (ret === false)) {
        await api.lastfm.getHistory(userName, ++page, lastTime);
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