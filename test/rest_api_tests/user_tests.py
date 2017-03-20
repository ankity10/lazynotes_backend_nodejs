#!/usr/bin/python3

import pytest

from .mongodb_service import MongoDb
from .http_service import AuthService as Auth


def setup_module(module):
    global auth, db, user_collection
    db = MongoDb()
    auth = Auth()
    user_collection = "users"
    db.drop(collecyion=user_collection)


def teardown_module(module):
    db.drop(collection=user_collection)


@pytest.fixture(scope="module")
def user(request):
    user_dict = {"username": "ankit",
                 "password": "ankit",
                 "client_id": "ankit"}
    return user_dict


def test_user_signup(user):
    json_res = auth.signup(user)
    assert (json_res['success'] == 1)
    auth.token = json_res['token']


def test_user_login(user):
    json_res = auth.login(user)
    assert (json_res['success'] == 1)
