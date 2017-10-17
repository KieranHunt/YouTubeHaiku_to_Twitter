var fs = require('fs');
var youtubedl = require('youtube-dl');
var Twitter = require('twitter');
var decode = require('unescape');
var validUrl = require('valid-url');
var path = require('path')

function download_video(temp_file_path, url, callback) {
  var video = youtubedl(url, ['--format=mp4'], { cwd: __dirname });

  video.on('info', function(info) {
    console.log(`Starting video download. Original filename: ${info._filename}, size: ${info.size}`)
  });

  video.pipe(fs.createWriteStream(temp_file_path));

  video.on('end', () => { callback(); });
}

function credentials() {
  filePath = path.join(__dirname, 'creds.json');
  return fs.readFileSync(filePath, 'utf8');
}

function twitter_api_creds() {
  return JSON.parse(credentials()).twitter;
}

function upload_video_and_tweet(temp_file_path, title, callback){
  console.log('Video download finished. Starting upload.');
  var client = new Twitter(twitter_api_creds());

  var mediaData = fs.readFileSync(temp_file_path);
  var mediaType = 'video/mp4';
  var mediaSize = fs.statSync(temp_file_path).size;

  initUpload()
    .then(appendUpload)
    .then(finalizeUpload)
    .then(mediaId => {
      var status = {
        status: decode(title),
        media_ids: mediaId
      }

      client.post('statuses/update', status, function(error, tweet, response) {
        if (!error) {
          console.log(tweet);
          callback(null, `Tweeted! https://twitter.com/rYoutubeHaiku_d/status/${tweet.id_str}`);
        }
      });
    });

  /**
  * Step 1 of 3: Initialize a media upload
  * @return Promise resolving to String mediaId
  */
  function initUpload () {
    return makePost('media/upload', {
      command    : 'INIT',
      total_bytes: mediaSize,
      media_type : mediaType,
    }).then(data => data.media_id_string);
  }

  /**
  * Step 2 of 3: Append file chunk
  * @param String mediaId    Reference to media object being uploaded
  * @return Promise resolving to String mediaId (for chaining)
  */
  function appendUpload (mediaId) {
    return makePost('media/upload', {
      command      : 'APPEND',
      media_id     : mediaId,
      media        : mediaData,
      segment_index: 0
    }).then(data => mediaId);
  }

  /**
  * Step 3 of 3: Finalize upload
  * @param String mediaId   Reference to media
  * @return Promise resolving to mediaId (for chaining)
  */
  function finalizeUpload (mediaId) {
    return makePost('media/upload', {
      command : 'FINALIZE',
      media_id: mediaId
    }).then(data => mediaId);
  }

  /**
  * (Utility function) Send a POST request to the Twitter API
  * @param String endpoint  e.g. 'statuses/upload'
  * @param Object params    Params object to send
  * @return Promise         Rejects if response is error
  */
  function makePost (endpoint, params) {
    return new Promise((resolve, reject) => {
      client.post(endpoint, params, (error, data, response) => {
        if (error) {
          console.log("Could not make post request!");
          console.log(error);
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }
}

exports.handler = (event, context, callback) => {
  body = JSON.parse(event.body);
  url = body.content

  if (!validUrl.isUri(url)) {
    callback('Invalid URL ' + url)
  }

  request_id = event.requestContext.requestId;
  temp_file_path = '/tmp/' + request_id + '.mp4';

  console.log("Event: " + JSON.stringify(event));
  console.log("Body: " + JSON.stringify(body));
  console.log("Temp file path: " + temp_file_path);

  download_video(
    temp_file_path,
    url,
    () => { upload_video_and_tweet(temp_file_path, body.title, callback) }
  );
};
