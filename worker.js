var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var rabbit = require('./rabbit');
var verify_jwt = require('./utils/verify_jwt');
// User model to manipulate data in mongodb
var User = require('./models/user');
// Mongoose ODM to manipulate mongodb.

module.exports.run = function (worker) {

  console.log('   >> Worker PID:', process.pid);
  var scServer = worker.scServer;

  scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
    

    if (2==21) {
      next();
    } else {
      console.log("in in else")
      next('You are not authorized to publish to ');
    }
  });

  scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_OUT, function (req, next) {
    

    if (2==21) {
      next();
    } else {
      console.log("in out else");
      next('You are not authorized to publish to ');
    }
  });

   scServer.addMiddleware(scServer.MIDDLEWARE_EMIT, function (req, next) {
    

    if (req.event=='sendmsg') {
      console.log(req.socket.signedAuthToken)
      next();
      //verify token;

    } 
    else{
      next();
    }
  });

  // this code handels http requests
  var app = require('express')();
  var httpServer = worker.httpServer;

  // BodyParser instance to include body attribute in "POST" requests and parse the variables in that body object.
  var bodyParser = require('body-parser');
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  // Morgan instance to log each request on terminal
  var morgan = require('morgan');

  app.use(serveStatic(path.resolve(__dirname, 'public')));

  httpServer.on('request', app);


  var apiRouter = require('./api');
  app.use('/api', apiRouter);

  var rootRouter = express.Router();

  rootRouter.get('/' ,function(req, res) {
    res.json({"messages" : "Welcome to Index route. Try '/api' route to use api"});
  });

  app.use(rootRouter);

  // http handler finished


/*
    In here we handle our incoming realtime connections and listen for events.
  */
  scServer.on('connection', function (socket) {
    console.log("User Connected ");

    // create rabbitmq channel (virtual connection)
    rabbit.connection.createChannel(function(err,channel){
      // create username queue in rabbitmq and consume realtime messages
      socket.on("username",function(data, res){
       
        console.log("username got callled")
        var exchange = "from_" +data;
        channel.assertExchange(exchange, 'fanout', {durable:true});

        
        channel.assertQueue(data,{durable:true});
        // mock clients object, to be replaced by db query to return clients
        var clients = ['client1', 'client2'];
        for (var i = clients.length - 1; i >= 0; i--) {
          if(data!=clients[i]) {
            channel.bindQueue(clients[i], exchange, '');
          }
        }
        res(null, true)

        channel.consume(data,function(msg){
          var Message={};
          Message.content=JSON.parse(msg.content.toString());
          Message.redelievery=msg.fields.redelivered;
          console.log('data is'+JSON.stringify(Message));
          socket.emit('msg',Message, function(err, data) {
            if(data) {
              console.log("data is recieved by client");
              channel.ack(msg);
            }
          });
        },{noAck: false});
      });

      //Sending messages to receiver
      socket.on('sendmsg',function(data){
        console.log("Message got called");
        var sender=data.sender;
        var rec=data.receiver;
        channel.publish("from_"+sender,'',new Buffer(JSON.stringify(data)),{persistent :true});
      });


      //login
     socket.on('login', function (data) {
       // body...
      console.log(socket.authToken);
       verify_jwt(data, "thisismysecretkey", null, function (err, data) {
         // body...
          socket.signedAuthToken= data;

         if(err){
          console.log(err);
         }
         else {

          console.log(data);
            User.findOne({_id:data._id},function(err,user){
              if(err) {
                console.log(err);
              }
              else if(user) {
                console.log(user);
              }
            })
         }
       })


     })
    });

    socket.on('disconnect',function(){
      console.log("client disconnected")
      channel.close();
    })
  });
};