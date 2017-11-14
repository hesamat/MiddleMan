# MiddleMan

MiddleMan is a http socket relay supporting two clients. It supports recording and data playback.

By default, it listens on port 5700. The data is relayed in the following format to the client: 

```sh
{
    time,
    data
}
```

Using -o option you can run the server in the one-sided mode in which it will relay back the data to the same client.

Also, -p option will run the server in the playback mode in which it will stream (with the same timing periods) a pre-recorded stream to the client.