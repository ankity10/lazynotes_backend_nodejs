#!/usr/bin/python3

import requests as req


class Service():
    server_url = "http://localhost:8000"
    api_path = "/api"
    service_path = ""

    def __init__(self):
        pass

    def get_endpoint(self, method_path=""):
        return self.server_url + self.api_path + self.service_path + str(method_path)

    def post(self, **kwargs):

        if kwargs.get("headers", None):
            res = req.post(kwargs.get('url'), data=dict(kwargs['data']), headers=dict(kwargs['headers']))
        else:
            res = req.post(kwargs.get('url'), data=dict(kwargs['data']))
        return res

    def get(self, **kwargs):
        if kwargs.get("params", None) and kwargs.get("headers", None):
            res = req.get(kwargs.get('url'),params=kwargs.get("params") ,headers=dict(kwargs['headers']))
        elif kwargs.get("headers", None):
            res = req.get(kwargs.get('url'), headers=dict(kwargs['headers']))
        else:
            res = req.get(kwargs.get('url'))
        return res


class AuthService(Service):
    service_path = "/auth"

    def __init__(self):
        super().__init__()
        self.token = None

    def signup(self, data):
        method_path = "/signup"
        url = self.get_endpoint(method_path)
        res = self.post(url=url, data=dict(data))
        return res.json()

    def login(self, data):
        method_path = "/login"
        url = self.get_endpoint(method_path)
        auth_headers_value = "JWT " + str(self.token)
        headers = {"Authorization": auth_headers_value}
        res = self.post(url=url, data=data, headers=headers)
        return res.json()


class NotesService(Service):
    service_path = "/notes"

    def __init__(self):
        super(NotesService, self).__init__()

    def get_notes(self, token):
        url = self.get_endpoint()
        auth_headers_value = "JWT " + str(token)
        headers = {"Authorization": auth_headers_value}
        res = self.get(url=url, headers=headers)
        return res.json()

class RabbitmqService(Service):
    service_path = "/rabbitmq"

    def __init__(self):
        super(RabbitmqService, self).__init__()

    def get_message_count(self, token, queue_name):
        method_path = "/queue/message/count"
        url = self.get_endpoint(method_path)
        auth_headers_value = "JWT " + str(token)
        headers = {"Authorization": auth_headers_value}
        params = {"queue": queue_name}
        res = self.get(url=url,params=params, headers=headers)
        print(res.content)
        return res.json()

