var mongodb_url = 'mongodb://localhost:27017/';

module.exports = {
    secret: "2Rxwl4KNVG0o7B7Ictvmzw9qJM1UiivC0Cpf3Eyp9fvX0s3WfcQpXYfj9HtdKn6uWQlJE3JVfHWLJ0a1W9OVMgccNtlkgEd5NnnaqhQQo3pAYrVB8j1dIZvZb8B759OcizK4VQBQBLKXQSYzCTAurw8GjOK8TMuH8tNwG0Yp2Fy97zs3tJ1a3RGhAGEBY8ik1YlJvWtho68R07gLrhEmI5PbXBp8LrBbmEz6uFOe9z77QPr3TG7liFB5DSVLz0Ib",
    db: mongodb_url + "lazynotes_backend",
    sparkpost_api_key: "ffec16a9e59be5c6e1d7aecccf5db6724d72eb6d",
    emailFrom: "contact@siteflu.com",
    app_url: "http://localhost",
    app_port: 3000,
    app_env: "localhost",
    socketcluster_listners: {
        receive: "msg_from_client",
        send: "msg_from_server",
        authentication: "auth",
        disconnect: "disconnect",
        set_client_id: "set-client-id"
    },
    socketcluster_listners_list: ['auth', 'disconnect', 'msg_from_client', 'msg_from_server', 'set-client-id']
}