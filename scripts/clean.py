import logging as log


from tests.rest_api_tests.rabbitmq_service import Rabbitmq
from tests.rest_api_tests.redis_service import Redis

from tests.rest_api_tests.mongodb_service import MongoDb

log.basicConfig(format='%(levelname)s:%(message)s', level=log.INFO)


def clean_all():
    mongo = MongoDb()
    redis = Redis()
    rabbitmq = Rabbitmq()
    mongo.drop(db='lazynotes_backend')
    redis.drop()
    rabbitmq.delete_all_queue()


clean_all()
