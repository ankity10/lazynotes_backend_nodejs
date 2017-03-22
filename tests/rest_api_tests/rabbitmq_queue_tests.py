#!/usr/bin/python3

import pytest

from .mongodb_service import MongoDb
from .http_service import AuthService as Auth
from .http_service import RabbitmqService
from .rabbitmq_service import Rabbitmq

queue_name = "tests-queue"


def setup_module(module):
    global rabbit, db, auth, rabbit_http, user_collection
    db = MongoDb()
    auth = Auth()
    rabbit_http = RabbitmqService()
    user_collection = "users"
    db.drop(collection=user_collection)

    rabbit = Rabbitmq()
    rabbit.delete_all_queue()
    rabbit.create_queue(queue_name)
    rabbit.insert(queue_name, "some random text")


def teardown_module(module):
    rabbit.delete_all_queue()
    db.drop(collection=user_collection)


@pytest.fixture()
def user(request):
    user_dict = {"username": "ankit",
                 "password": "ankit",
                 "client_id": "ankit"}
    return user_dict


def test_get_queue_count(user):
    json_res = auth.signup(user)
    assert (json_res['success'] == 1)
    auth.token = json_res['token']
    json_res = rabbit_http.get_message_count(auth.token, queue_name)
    count = rabbit.get_message_count(queue_name)
    assert (json_res['success'] == 1)
    assert (json_res['message_count'] == count)
