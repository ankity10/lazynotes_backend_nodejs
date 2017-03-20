#!/usr/bin/python3

import pytest

from .mongodb_service import MongoDb
from .http_service import AuthService as Auth
from .http_service import NotesService as Note


def setup_module(module):
    global auth, note, db, user_collection, notes_collection
    db = MongoDb()
    auth = Auth()
    note = Note()
    user_collection = "users"
    notes_collection = "ankit_notes"
    db.drop(collection=user_collection)
    notes_dict = {"note_text": "some text"}
    db.insert(notes_collection, notes_dict)


def teardown_module(module):
    db.drop(collection=user_collection)
    db.drop(collection=notes_collection)


@pytest.fixture()
def user(request):
    user_dict = {"username": "ankit",
                 "password": "ankit",
                 "client_id": "ankit"}
    return user_dict


def test_get_notes(user):
    json_res = auth.signup(user)
    assert (json_res['success'] == 1)
    auth.token = json_res['token']
    json_res = note.get_notes(auth.token)
    assert (json_res['success'] == 1)
