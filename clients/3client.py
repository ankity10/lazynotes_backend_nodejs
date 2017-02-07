from socketclusterclient import Socketcluster
import logging
import time
import json

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)

def onmessage(eventname,data, ackmessage):
    print ("got data "+json.dumps(data,sort_keys=True))
    ackmessage(None, True)

def ack(eventname, error, object):
    print("Got ack daata "+str(object)+" and error "+error+ "and eventname is "+ eventname)

def callme(socket):
    socket.emitack("username","ankit", ack)
    socket.onack("msg",onmessage)
    Message=json.loads('{}')
    Message["sender"]="ankit"
    Message["receiver"]="sachin"
    Message["data"]="Hi I'm prince"
    socket.emit("sendmsg",Message)

def onconnect(socket):
   logging.info("connected")

def ondisconnect(socket):
    logging.info("on disconnect got called")

def onConnectError(socket, error):
    logging.info("On connect error got called")

def onSetAuthentication(socket, token): #caalled after token is set from server side
    logging.info("Token received " + token)
    socket.setAuthtoken(token)

def onAuthentication(socket, isauthenticated):
    logging.info("Authenticated is " + str(isauthenticated))
    time.sleep(1)
    callme(socket)

if __name__ == "__main__":
    socket = Socketcluster.socket("ws://localhost:8000/socketcluster/")
    socket.setBasicListener(onconnect, ondisconnect, onConnectError)
    socket.setAuthenticationListener(onSetAuthentication, onAuthentication)
    socket.setreconnection(False)
    socket.connect()

