# YouTubeHaiku to Twitter

[![Twitter Follow](https://img.shields.io/twitter/follow/rYoutubeHaiku.svg?style=social&label=Follow)]()

How it works:
- An IFTTT applet, triggered by a new hot post on /r/youtubehaiku, creates a web
request to an API Gateway endpoint.
- API Gateway invokes this Lambda function
- This Lambda function downloads the video using `youtube-dl`
- The Lambda function then uploads the video to Twitter and creates a tweet.

## Configuring Twitter access credentials

The Lambda function expects to find the Twitter access credentials in
`creds.json`. Here is an example:

```json
{
  "twitter": {
    "consumer_key": "foo",
    "consumer_secret": "bar",
    "access_token_key": "baz",
    "access_token_secret": "qux"
  }
}
```

## Uploading locally

If you want to upload this locally, run the following:

```bash
zip -r youtubehaiku_to_twitter.zip . && aws lambda update-function-code --function-name YouTubeHaiku_to_Twitter --zip-file fileb://youtubehaiku_to_twitter.zip --region eu-west-1
```
