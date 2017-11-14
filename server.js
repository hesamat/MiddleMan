//server
var http = require('http');
var server = http.createServer();
var fs = require('fs');
var io = require('socket.io').listen(server, {'destroy buffer size': Infinity});
io.set('log level', 1);

const PORT = 5700;

var bothConnected = false;
var isRecording = false;

var isPlayingback = false;
var isTwoSided = true;
process.argv.forEach(function (val, index, array) {
   if (val === '-o')
     isTwoSided = false;
   if (val === '-p'){ 
     isPlayingback = true;
   }
});

var clients = {
  'home': {
    socket: null,
    dest: 'away',
    participant_id: null,
    trial: 0,
    isRecording: false,
    history: []
  },
  'away': {
    socket: null,
    dest: 'home',
    participant_id: null,
    trial: 0,
    isRecording: false,
    history: []
  }
}

var playback = function (socket, fileNumber) {
  if(isPlayingback == false) return;

  pbFilePath = './' + fileNumber + '.json';
  if(!fs.existsSync(pbFilePath))
  {
    console.log('file: ' + pbFilePath + ' not found');
    return;
  }

  playbackFile = JSON.parse(fs.readFileSync(pbFilePath).toString());
  var base = playbackFile[0].time;
  
  playbackFile.forEach(function (msg) {
      setTimeout(function () {
        socket.emit('stream', msg.data);
      }, msg.time-base);	
  });
  socket.emit('fileLoaded');      
}

var log = function (socket, name, fileNumber) {
  if(fileNumber == null) {
    filePath = name + '_p_' + clients[name].participant_id + '_remote_dance_trial_' + clients[name].trial + '.json';
  }
  else {
    filePath = name + '_p_' + clients[name].participant_id + '_playbackFile_' + fileNumber + '_trial_' + clients[name].trial + '.json';
  }
  fs.writeFile(filePath, JSON.stringify(clients[name].history, null, 4), function(err){
    if(err) throw err;
    console.log(filePath + ' recording finished');
    socket.emit('recordingFinished');
    clients[name].history = [];
  });
}

io.sockets.on('connection', function (socket) {
  var handshaken = false;
  var name = '';

  socket.emit('connected');	 
  socket.on('handshake', function (data) {
    if (!clients[data.name]) {
      return;
    } 

    clients[data.name].participant_id = data.data;
    console.log("participant ID: " + data.data);
    clients[data.name].socket = socket;
    name = data.name;
    console.log(name + ' connected');
	
    if(isPlayingback)
	    data.data = 'playback';
    else
	    data.data = 'live';
    socket.emit('handshook', data);
    handshaken = true;
  });

  socket.on('record', function(data) {
    if(handshaken && isTwoSided)
    {
      clients[name].isRecording = true;
      clients[name].trial++;
    }
    else {
      console.log('Recording aborted');
    }
  });
  
  socket.on('finishRecord', function(data) {
    if(!clients[name].isRecording || !isTwoSided)  return;
    log(socket, name, null);
    clients[name].isRecording = false;
  });
   
  socket.on('startPlayback', function(data) {
    if(handshaken)
    {
      playback(socket, data.data);
      clients[name].isRecording = true;
      clients[name].trial++;
    }
  }); 
  socket.on('finishPlayback', function(data) {
    if(handshaken)
    {
      log(socket, name, data.data);
      clients[name].isRecording = false;
    }
  }); 

 
  socket.on('data', function (data) {
    if (!handshaken) return;
    
    if (clients[name].isRecording || isRecording)
    {
    	clients[name].history.push({
        time: new Date().getTime() % 10000000,
        data: data
      });
    }
    
    if(!isTwoSided)
    {
    	if(!isPlayingback) {
        socket.emit('stream', data);
      }    
    }
    else   //in case there are two clients
    {    
      if (!clients[name].dest || clients[clients[name].dest].socket == null) {
        return;
      } 
    
      if(!bothConnected)    //Print the client info once they both are connected (once)
      {
          bothConnected = true;
          console.log('bothConnected');
          console.log(name);
          console.log(clients[name].dest);
          console.log('end');
      }
      clients[clients[name].dest].socket.emit('stream', data);
    }   
  });
     
  socket.on('disconnect', function () {
    if(!clients[name]) {
      clients[name].socket = null;
    }
    console.log(name + ' disconnected');
  });
});

server.listen(PORT);


