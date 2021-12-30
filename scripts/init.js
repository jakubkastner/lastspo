// html elements
const el = {
    main: {
        title: document.querySelectorAll('.title'),
        error: document.querySelectorAll('.error'),
        playlists: document.querySelectorAll('.playlists'),
        playlist: document.querySelectorAll('.playlists .playlist'),
        tracklist: document.querySelectorAll('.tracklist'),
        lastfmUsername: document.getElementById('lastfm_username')
    },
    user: {
        login: {
            spotify: document.querySelectorAll('.button.login.spotify'),
            lastfm: document.querySelectorAll('.button.show.history')
        }
    }
};

// user
var user = {
    spotify: {
        accessToken: null
    },
    lastfm: {
        last: null
    },
    playlists: [],
    history: [],
    historyTracks: []
};

// my program
const program = {
    spotify: {
        const: {
            stateKey: 'user_spotify_statekey',
            accessToken: 'user_spotify_useraccess',
            accessTokenExpires: 'user_spotify_useraccess_expires'
        }
    },
    lastfm: {
        const: {
            history: 'user_lastfm_history',
            username: 'user_lastfm_name',
            lastScrobble: 'user_lastfm_last'
        }
    }
};

// api (spotify, genius)
var api = {
    lastfm: {
        key: 'f6760aa8ae0005261fa183552094fd81',
        url: 'https://ws.audioscrobbler.com/2.0',
        options: {
            method: 'GET'
        }
    },
    spotify: {
        id: '84707e7862a540db926f37cec6fa866f',
        scope: 'user-library-read playlist-read-private playlist-read-collaborative',
        redirect: location.protocol + '//' + location.host + location.pathname,
        url: 'https://api.spotify.com/v1'
    }
};

/**
 * Generate random string by the specified length.
 * @param {*} length length of the string
 * @returns random string
 */
program.generateRandomString = async function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/**
 * Get parameters from url
 * @returns parameters object
 */
program.getHashParams = async function () {
    var hashParams = {};
    var e,
        r = /([^&;=]+)=?([^&;]*)/g, q = window.location.hash.substring(1);
    while (e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
}


/**
 * Asynchronous foreach.
 * @param {*} array array to browse
 * @param {*} callback function to execute
 */
async function asyncForEach(array, callback) {
    // projde pole forem
    for (let index = 0; index < array.length; index++) {
        // vykoná funkci a čeká, dokuď se neprovede
        await callback(array[index], index, array);
    }
}


/**
 * Load JSON from api.
 * @param {*} url api url request
 * @param {*} errorText error text
 * @returns
 *  json = successfully get data from api;
 *  null = request error
 */
api.fetchJson = async function (url, options, errorText) {
    // fetch the api request
    const response = await fetch(url, options);

    // obtained json from api result
    const json = await response.json();

    /*console.log(url);
    console.log(json);*/
    if (!json) {
        // failed to get json
        /*hideLoading(elementError.text() + '\n' + errorText + '\nCan not get JSON from Spotify API');*/
        console.log('fetch error - from url: ' + url);
        return null;
    }

    if (json.error) {
        // failed to get data from json
        if (json.error.status === 429) {
            // api - too many queries
            return await api.fetchJson(url, options, errorText);
            // TODO UPOZORNĚNÍ -> HROZÍ NEKONEČNÁ SMYČKA
        }
        if (json.error.status === 401) {
            // the access token has expired
            // TODO získat nový access token a uložit prozatím získaná data

            await user.spotify.newLogin(true);
            console.log("access token expires")
            return null;
            localStorage.removeItem(USER_ACCESS);
            userAccess = null;
            // získá stránku pro přihlášení do spotify
            var url = await loginGetUrl();

            if (url) {
                // naviguje na přihlašovací stránku Spotify
                //window.location = url;
                console.log("naviguji");
            }
            else {
                // uživatel je přihlášen
                // loginGetUserInfo(); došlo by k zacyklení
                console.log('Spotify login error');
            }
            return await api.fetchJson(url, options, errorText);
            // UPOZORNĚNÍ -> HROZÍ NEKONEČNÁ SMYČKA
        }
        // last fm error
        if (json.error == 8) {
            return await api.fetchJson(url, options, errorText);
        }
        // another error
        //hideLoading(elementError.text() + '\n' + errorText + '\n' + json.error.message);
        console.log('fetch error - from api: ' + json.error.message);
        console.log(json.error);

        return null;
    }
    return json;
}
