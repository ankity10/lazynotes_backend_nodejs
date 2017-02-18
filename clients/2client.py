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

def onconnect(socket):
   logging.info("connected")

def ondisconnect(socket):
    logging.info("on disconnect got called ")
    # print(data.__dict__)

def on_disconnect(event, data):
    print(event, data)

def onConnectError(socket, error):
    logging.info("On connect error got called")

def onSetAuthentication(socket, token): #called after token is set from server side
    logging.info("Token received " + token)
    # socket.setAuthtoken(token)

def callme(socket):
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfX3YiOjAsIl9pZCI6IjU4YTQ5ZWFkZGM1MjNhM2VlNTUyZmM4NCIsImNsaWVudHMiOltdLCJpYXQiOjE0ODcxODM1MzMsImV4cCI6MTQ4NzI4MzYxM30.6N7aGjgQpsjBPU5c92b6GL_wBGmvUMN3a7SMXKBgywo"
    socket.setAuthtoken(token)
    # socket.emitack("username","client1", ack)
    socket.onack("msg",onmessage)


def on_auth_success(event, data):
    socket.emit("set-client-id", "client2")

    # Message=json.loads('{}')
    # Message["from_client_id"] = "client2"
    # Message["note_hash"] = "0123456789abcdef"
    # Message["note_text"]="Hi note text from client 2"
    # Message["window_title"]="facebook"
    # Message["process_name"]="chrome"
    # Message["resolve_flag"]= 0

    # socket.emit("sendmsg",Message)

def onAuthentication(socket, isauthenticated):
    logging.info("Authenticated is " + str(isauthenticated))
    time.sleep(1)
    socket.on("#disconnect", on_disconnect)
    socket.on("auth-success", on_auth_success)

    callme(socket)

if __name__ == "__main__":
    socket = Socketcluster.socket("ws://localhost:8000/socketcluster/")
    socket.setBasicListener(onconnect, ondisconnect, onConnectError)
    socket.setAuthenticationListener(onSetAuthentication, onAuthentication)
    socket.setreconnection(False)
    socket.connect()

