import redis
import logging as log
log.basicConfig(format='%(levelname)s:%(message)s', level=log.INFO)


class Redis():
    def __init__(self):
        self.redis = redis.StrictRedis()
        try:
            self.redis.set('foo', 'bar')
            self.redis.set('dave', 'skavis')
        except redis.exceptions.ConnectionError as err:
            print("Error Connecting to redis", err)

    def get(self, key):
        result = self.redis.get(key)
        if result:
            return result.decode("utf-8")
        else:
            return None

    def drop(self):
        self.redis.flushdb()
        log.info("Redis Database 0 deleted successfully")

    def set(self, key, value):
        return self.redis.set(key, value)
